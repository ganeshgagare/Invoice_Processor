package com.t2.ingestion.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.t2.shared.ReportSummary;
import com.t2.shared.UploadResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStreamReader;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Parses JSON/CSV/XLSX and stores each upload as a real typed PostgreSQL table
 * named  report_<id>  with proper TEXT/NUMERIC/BOOLEAN columns.
 *
 * This is the key architectural fix: Gemini can now generate real SQL like
 *   SELECT product_code, unit_price FROM report_3 WHERE unit_price > 500
 * against a real relational schema — not JSONB key-value hacks.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IngestionService {

    private final JdbcTemplate jdbc;
    private final ObjectMapper  objectMapper;

    // ── Public API ─────────────────────────────────────────────────────────

    public UploadResponse ingest(MultipartFile file) throws Exception {
        String name = Objects.requireNonNullElse(file.getOriginalFilename(), "upload");
        log.info("Ingesting: {} ({} bytes)", name, file.getSize());

        List<Map<String, Object>> rows = parseFile(file, name);
        if (rows.isEmpty()) throw new IllegalArgumentException("File contains no data rows");

        List<String> columns = new ArrayList<>(rows.get(0).keySet());
        // Sanitise column names for PostgreSQL
        List<String> safeColumns = columns.stream().map(this::safeName).collect(Collectors.toList());

        Map<String, String> colTypes = inferTypes(safeColumns, rows, columns);
        log.info("Columns: {} | Types: {}", safeColumns, colTypes);

        // Insert metadata
        Long reportId = jdbc.queryForObject(
            "INSERT INTO report_meta(file_name,row_count,col_count,columns_json,col_types_json,uploaded_at)" +
            " VALUES(?,?,?,?::jsonb,?::jsonb,?) RETURNING id",
            Long.class, name, rows.size(), safeColumns.size(),
            objectMapper.writeValueAsString(safeColumns),
            objectMapper.writeValueAsString(colTypes),
            Timestamp.from(Instant.now()));
        log.info("Created report_meta id={}", reportId);

        createTable(reportId, safeColumns, colTypes);
        insertRows(reportId, safeColumns, columns, colTypes, rows);
        log.info("Loaded {} rows into report_{}", rows.size(), reportId);

        return new UploadResponse(reportId, name, rows.size(), safeColumns.size(), safeColumns, Instant.now());
    }

    public List<ReportSummary> listAll() {
        return jdbc.query(
            "SELECT id,file_name,row_count,col_count,uploaded_at FROM report_meta ORDER BY uploaded_at DESC",
            (rs, i) -> new ReportSummary(
                rs.getLong("id"), rs.getString("file_name"),
                rs.getInt("row_count"), rs.getInt("col_count"),
                rs.getTimestamp("uploaded_at").toInstant()));
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getMeta(Long reportId) {
        Map<String, Object> row = jdbc.queryForMap(
            "SELECT file_name,row_count,col_count,columns_json,col_types_json FROM report_meta WHERE id=?",
            reportId);
        // Parse JSON strings back to lists/maps
        try {
            row.put("columns", objectMapper.readValue(row.get("columns_json").toString(), new TypeReference<List<String>>(){}));
            row.put("colTypes", objectMapper.readValue(row.get("col_types_json").toString(), new TypeReference<Map<String,String>>(){}));
        } catch (Exception e) { log.error("getMeta parse error", e); }
        return row;
    }

    // ── DDL ────────────────────────────────────────────────────────────────

    private void createTable(Long id, List<String> cols, Map<String, String> types) {
        jdbc.execute("DROP TABLE IF EXISTS report_" + id);
        StringBuilder ddl = new StringBuilder("CREATE TABLE report_").append(id).append(" (");
        ddl.append("_row_num SERIAL PRIMARY KEY");
        for (String col : cols) {
            String pg = switch (types.getOrDefault(col, "TEXT")) {
                case "NUMERIC" -> "NUMERIC";
                case "BOOLEAN" -> "BOOLEAN";
                case "TIMESTAMP" -> "TIMESTAMP";
                default        -> "TEXT";
            };
            ddl.append(", ").append(qi(col)).append(" ").append(pg);
        }
        ddl.append(")");
        log.debug("DDL: {}", ddl);
        jdbc.execute(ddl.toString());
    }

    private void insertRows(Long id, List<String> safeCols, List<String> origCols,
                             Map<String, String> types, List<Map<String, Object>> rows) {
        String colList    = safeCols.stream().map(this::qi).collect(Collectors.joining(","));
        String holders    = safeCols.stream().map(c -> "?").collect(Collectors.joining(","));
        String sql        = "INSERT INTO report_" + id + "(" + colList + ") VALUES(" + holders + ")";
        List<Object[]> batch = rows.stream().map(row -> {
            Object[] args = new Object[safeCols.size()];
            for (int i = 0; i < safeCols.size(); i++) {
                Object v = row.get(origCols.get(i));  // use original key to get value
                args[i] = coerce(v, types.get(safeCols.get(i)));
            }
            return args;
        }).collect(Collectors.toList());
        jdbc.batchUpdate(sql, batch);
    }

    // ── Type inference ─────────────────────────────────────────────────────

    private Map<String, String> inferTypes(List<String> safeCols, List<Map<String, Object>> rows,
                                            List<String> origCols) {
        Map<String, String> types = new LinkedHashMap<>();
        for (int idx = 0; idx < safeCols.size(); idx++) {
            String safe = safeCols.get(idx);
            String orig = origCols.get(idx);
            boolean allNum = true, allBool = true, allTimestamp = true, hasVal = false;
            for (Map<String, Object> row : rows) {
                Object v = row.get(orig);
                if (v == null || v.toString().isBlank()) continue;
                hasVal = true;

                if (!isBooleanValue(v)) {
                    allBool = false;
                }

                if (v instanceof Number) {
                    // keep numeric true
                } else {
                    try { Double.parseDouble(v.toString().replace(",", "")); }
                    catch (NumberFormatException e) { allNum = false; }
                }

                if (!isTimestampValue(v)) {
                    allTimestamp = false;
                }
            }

            String inferred = "TEXT";
            if (hasVal) {
                if (allBool) inferred = "BOOLEAN";
                else if (allNum) inferred = "NUMERIC";
                else if (allTimestamp) inferred = "TIMESTAMP";
            }
            types.put(safe, inferred);
        }
        return types;
    }

    private Object coerce(Object val, String type) {
        if (val == null) return null;
        String s = val.toString().trim();
        if (s.isBlank()) return null;
        return switch (type) {
            case "NUMERIC" -> {
                if (val instanceof Number n) yield n.doubleValue();
                try { yield Double.parseDouble(s.replace(",", "")); } catch (Exception e) { yield null; }
            }
            case "BOOLEAN" -> coerceBoolean(val);
            case "TIMESTAMP" -> coerceTimestamp(val);
            default -> s;
        };
    }

    // ── File parsers ───────────────────────────────────────────────────────

    private List<Map<String, Object>> parseFile(MultipartFile f, String name) throws Exception {
        String lower = name.toLowerCase();
        if (lower.endsWith(".json"))  return parseJson(f);
        if (lower.endsWith(".csv"))   return parseCsv(f);
        if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return parseExcel(f);
        throw new IllegalArgumentException("Unsupported type. Use JSON, CSV, or XLSX.");
    }

    private List<Map<String, Object>> parseJson(MultipartFile f) throws Exception {
        byte[] b = f.getBytes(); int i = 0;
        while (i < b.length && Character.isWhitespace(b[i])) i++;
        if (i < b.length && b[i] == '[') return objectMapper.readValue(b, new TypeReference<>(){});
        return List.of(objectMapper.readValue(b, new TypeReference<>(){}));
    }

    private List<Map<String, Object>> parseCsv(MultipartFile f) throws Exception {
        List<Map<String, Object>> rows = new ArrayList<>();
        try (InputStreamReader r = new InputStreamReader(f.getInputStream());
             CSVParser p = CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).setTrim(true).build().parse(r)) {
            for (CSVRecord rec : p) rows.add(new LinkedHashMap<>(rec.toMap()));
        }
        return rows;
    }

    private List<Map<String, Object>> parseExcel(MultipartFile f) throws Exception {
        List<Map<String, Object>> rows = new ArrayList<>();
        try (Workbook wb = new XSSFWorkbook(f.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            Row hrow = sheet.getRow(0); if (hrow == null) return rows;
            List<String> headers = new ArrayList<>();
            hrow.forEach(c -> headers.add(c.getStringCellValue().trim()));
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i); if (row == null) continue;
                Map<String, Object> rec = new LinkedHashMap<>();
                for (int j = 0; j < headers.size(); j++) {
                    Cell cell = row.getCell(j, Row.MissingCellPolicy.CREATE_NULL_AS_BLANK);
                    rec.put(headers.get(j), cellVal(cell));
                }
                rows.add(rec);
            }
        }
        return rows;
    }

    private Object cellVal(Cell c) {
        return switch (c.getCellType()) {
            case NUMERIC -> DateUtil.isCellDateFormatted(c) ? c.getLocalDateTimeCellValue().toString() : c.getNumericCellValue();
            case BOOLEAN -> c.getBooleanCellValue();
            case FORMULA -> { try { yield c.getNumericCellValue(); } catch (Exception e) { yield c.getStringCellValue(); } }
            default -> c.getStringCellValue();
        };
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    /** PostgreSQL-safe lowercase column name */
    String safeName(String raw) {
        if (raw == null || raw.isBlank()) return "col";
        return raw.trim().toLowerCase()
                  .replaceAll("[^a-z0-9_]", "_")
                  .replaceAll("_+", "_")
                  .replaceAll("^_|_$", "");
    }

    /** Quoted identifier */
    private String qi(String name) { return "\"" + name.replace("\"", "") + "\""; }

    private boolean isBooleanValue(Object v) {
        if (v instanceof Boolean) return true;
        String s = v.toString().trim().toLowerCase(Locale.ROOT);
        return s.equals("true") || s.equals("false") || s.equals("yes") || s.equals("no") || s.equals("1") || s.equals("0");
    }

    private Object coerceBoolean(Object v) {
        if (v instanceof Boolean b) return b;
        String s = v.toString().trim().toLowerCase(Locale.ROOT);
        if (s.equals("true") || s.equals("yes") || s.equals("1")) return true;
        if (s.equals("false") || s.equals("no") || s.equals("0")) return false;
        return null;
    }

    private boolean isTimestampValue(Object v) {
        return coerceTimestamp(v) != null;
    }

    private Timestamp coerceTimestamp(Object v) {
        if (v instanceof Timestamp ts) return ts;
        if (v instanceof Instant instant) return Timestamp.from(instant);
        if (v instanceof LocalDateTime ldt) return Timestamp.valueOf(ldt);
        if (v instanceof LocalDate ld) return Timestamp.valueOf(ld.atStartOfDay());

        String s = v.toString().trim();
        if (s.isBlank()) return null;

        try { return Timestamp.from(Instant.parse(s)); } catch (Exception ignored) {}
        try { return Timestamp.from(OffsetDateTime.parse(s).toInstant()); } catch (Exception ignored) {}
        try { return Timestamp.valueOf(LocalDateTime.parse(s)); } catch (Exception ignored) {}
        try { return Timestamp.valueOf(LocalDate.parse(s).atStartOfDay()); } catch (Exception ignored) {}
        return null;
    }
}
