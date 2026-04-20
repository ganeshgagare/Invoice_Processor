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
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class IngestionService {

    private final JdbcTemplate jdbc;
    private final ObjectMapper  objectMapper;

    // ── Upload ─────────────────────────────────────────────────────────────

    public UploadResponse ingest(MultipartFile file) throws Exception {
        String name = Objects.requireNonNullElse(file.getOriginalFilename(), "upload");
        log.info("Ingesting: {} ({} bytes)", name, file.getSize());

        List<Map<String, Object>> rows = parseFile(file, name);
        if (rows.isEmpty()) throw new IllegalArgumentException("File contains no data rows.");

        // BUG FIX #1: Collect the UNION of all keys across ALL rows, not just row[0].
        // This handles JSON where different rows have different fields (sparse data).
        LinkedHashSet<String> allOrigKeys = new LinkedHashSet<>();
        rows.forEach(r -> allOrigKeys.addAll(r.keySet()));
        List<String> origCols = new ArrayList<>(allOrigKeys);
        List<String> safeCols = origCols.stream().map(this::safeName).collect(Collectors.toList());

        // Deduplicate safe names (e.g. "First Name" and "first_name" → same safe name)
        Map<String, String> safeToOrig = new LinkedHashMap<>();
        List<String> finalSafeCols = new ArrayList<>();
        List<String> finalOrigCols = new ArrayList<>();
        for (int i = 0; i < safeCols.size(); i++) {
            String safe = safeCols.get(i);
            if (!safeToOrig.containsKey(safe)) {
                safeToOrig.put(safe, origCols.get(i));
                finalSafeCols.add(safe);
                finalOrigCols.add(origCols.get(i));
            }
        }

        // Infer types using ALL rows and the UNION of columns
        Map<String, String> colTypes = inferTypes(finalSafeCols, finalOrigCols, rows);
        log.info("Columns ({}): {} | Types: {}", finalSafeCols.size(), finalSafeCols, colTypes);

        // Insert metadata row
        Long reportId = jdbc.queryForObject(
            "INSERT INTO report_meta(file_name,row_count,col_count,columns_json,col_types_json,uploaded_at)" +
            " VALUES(?,?,?,?::jsonb,?::jsonb,?) RETURNING id",
            Long.class, name, rows.size(), finalSafeCols.size(),
            objectMapper.writeValueAsString(finalSafeCols),
            objectMapper.writeValueAsString(colTypes),
            Instant.now());
        log.info("Created report_meta id={}", reportId);

        createTable(reportId, finalSafeCols, colTypes);
        insertRows(reportId, finalSafeCols, finalOrigCols, colTypes, rows);
        log.info("Loaded {} rows into report_{}", rows.size(), reportId);

        return new UploadResponse(reportId, name, rows.size(), finalSafeCols.size(), finalSafeCols, Instant.now());
    }

    public List<ReportSummary> listAll() {
        return jdbc.query(
            "SELECT id,file_name,row_count,col_count,uploaded_at FROM report_meta ORDER BY uploaded_at DESC",
            (rs, i) -> new ReportSummary(
                rs.getLong("id"), rs.getString("file_name"),
                rs.getInt("row_count"), rs.getInt("col_count"),
                rs.getTimestamp("uploaded_at").toInstant()));
    }

    public Map<String, Object> getMeta(Long id) {
        Map<String, Object> row = jdbc.queryForMap(
            "SELECT file_name,row_count,col_count,columns_json,col_types_json FROM report_meta WHERE id=?", id);
        try {
            row.put("columns",  objectMapper.readValue(row.get("columns_json").toString(),  new TypeReference<List<String>>(){}));
            row.put("colTypes", objectMapper.readValue(row.get("col_types_json").toString(), new TypeReference<Map<String,String>>(){}));
        } catch (Exception e) { log.error("getMeta parse", e); }
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
                default        -> "TEXT";
            };
            ddl.append(", ").append(qi(col)).append(" ").append(pg);
        }
        ddl.append(")");
        log.info("DDL: {}", ddl);
        jdbc.execute(ddl.toString());
    }

    private void insertRows(Long id, List<String> safeCols, List<String> origCols,
                             Map<String, String> types, List<Map<String, Object>> rows) {
        String colList  = safeCols.stream().map(this::qi).collect(Collectors.joining(","));
        String holders  = safeCols.stream().map(c -> "?").collect(Collectors.joining(","));
        String sql      = "INSERT INTO report_" + id + "(" + colList + ") VALUES(" + holders + ")";

        List<Object[]> batch = rows.stream().map(row -> {
            Object[] args = new Object[safeCols.size()];
            for (int i = 0; i < safeCols.size(); i++) {
                // BUG FIX #1b: row.get returns null if key missing → stored as NULL in DB (correct)
                Object v = row.get(origCols.get(i));
                args[i] = coerce(v, types.get(safeCols.get(i)));
            }
            return args;
        }).collect(Collectors.toList());

        jdbc.batchUpdate(sql, batch);
    }

    // ── Type inference — checks ALL rows ──────────────────────────────────

    private Map<String, String> inferTypes(List<String> safeCols, List<String> origCols,
                                            List<Map<String, Object>> rows) {
        Map<String, String> types = new LinkedHashMap<>();
        for (int idx = 0; idx < safeCols.size(); idx++) {
            String safe = safeCols.get(idx);
            String orig = origCols.get(idx);
            boolean allNum = true, hasVal = false;
            for (Map<String, Object> row : rows) {
                Object v = row.get(orig);
                if (v == null || v.toString().isBlank()) continue;
                hasVal = true;
                if (v instanceof Number) continue;           // already a number (from JSON/Excel)
                // Check if string parses as number
                String s = v.toString().trim().replace(",", "");
                try { Double.parseDouble(s); }
                catch (NumberFormatException e) { allNum = false; break; }
            }
            types.put(safe, (hasVal && allNum) ? "NUMERIC" : "TEXT");
        }
        return types;
    }

    private Object coerce(Object val, String type) {
        if (val == null) return null;
        if (val instanceof List || val instanceof Map) {
            // Nested structures: store as JSON string
            try { return objectMapper.writeValueAsString(val); } catch (Exception e) { return val.toString(); }
        }
        String s = val.toString().trim();
        if (s.isBlank()) return null;
        if ("NUMERIC".equals(type)) {
            if (val instanceof Number n) return n.doubleValue();
            try { return Double.parseDouble(s.replace(",", "")); } catch (Exception e) { return null; }
        }
        return s;
    }

    // ── File parsers ───────────────────────────────────────────────────────

    private List<Map<String, Object>> parseFile(MultipartFile f, String name) throws Exception {
        String lower = name.toLowerCase();
        if (lower.endsWith(".json"))  return parseJson(f);
        if (lower.endsWith(".csv"))   return parseCsv(f);
        if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return parseExcel(f);
        throw new IllegalArgumentException("Unsupported type. Please use JSON, CSV, or XLSX.");
    }

    private List<Map<String, Object>> parseJson(MultipartFile f) throws Exception {
        byte[] b = f.getBytes(); int i = 0;
        while (i < b.length && Character.isWhitespace(b[i])) i++;
        if (i < b.length && b[i] == '[')
            return objectMapper.readValue(b, new TypeReference<List<Map<String,Object>>>(){});
        Map<String, Object> single = objectMapper.readValue(b, new TypeReference<Map<String,Object>>(){});
        // If top-level object has a key whose value is an array of objects, use that
        for (Map.Entry<String, Object> entry : single.entrySet()) {
            if (entry.getValue() instanceof List<?> list && !list.isEmpty()
                    && list.get(0) instanceof Map) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> nested = (List<Map<String, Object>>) list;
                return nested;
            }
        }
        return List.of(single);
    }

    private List<Map<String, Object>> parseCsv(MultipartFile f) throws Exception {
        List<Map<String, Object>> rows = new ArrayList<>();
        try (InputStreamReader r = new InputStreamReader(f.getInputStream());
             CSVParser p = CSVFormat.DEFAULT.builder()
                 .setHeader().setSkipHeaderRecord(true).setTrim(true)
                 .setIgnoreEmptyLines(true).build().parse(r)) {
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
            case NUMERIC -> DateUtil.isCellDateFormatted(c)
                ? c.getLocalDateTimeCellValue().toString() : c.getNumericCellValue();
            case BOOLEAN -> String.valueOf(c.getBooleanCellValue());
            case FORMULA -> { try { yield c.getNumericCellValue(); } catch (Exception e) { yield c.getStringCellValue(); } }
            default -> c.getStringCellValue();
        };
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    String safeName(String raw) {
        if (raw == null || raw.isBlank()) return "col";
        String s = raw.trim().toLowerCase()
                      .replaceAll("[^a-z0-9_]", "_")
                      .replaceAll("_+", "_")
                      .replaceAll("^_+|_+$", "");
        // Avoid reserved words
        if (s.isBlank()) s = "col";
        if (s.matches("\\d.*")) s = "c_" + s;
        return s;
    }

    private String qi(String name) { return "\"" + name.replace("\"", "") + "\""; }
}
