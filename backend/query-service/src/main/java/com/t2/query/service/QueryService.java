package com.t2.query.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.t2.query.llm.GeminiSqlClient;
import com.t2.shared.QueryRequest;
import com.t2.shared.QueryResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class QueryService {

    private final JdbcTemplate    jdbc;
    private final GeminiSqlClient gemini;
    private final ObjectMapper    objectMapper;

    public QueryResult query(QueryRequest req) {
        long start = System.currentTimeMillis();
        log.info("Query reportId={} prompt='{}'", req.reportId(), req.prompt());

        // 1. Load schema
        Map<String, Object> meta = loadMeta(req.reportId());
        List<String> columns     = parseList(meta.get("columns_json"));
        Map<String, String> colTypes = parseMap(meta.get("col_types_json"));

        // Remove _row_num from schema exposed to Gemini
        List<String> visibleCols = columns.stream()
            .filter(c -> !c.equals("_row_num")).collect(java.util.stream.Collectors.toList());

        log.info("Schema: {} columns  types: {}", visibleCols.size(), colTypes);

        // 2. Load sample rows (excludes _row_num via SELECT *)
        List<Map<String, Object>> sample = loadSample(req.reportId(), 5);

        // 3. Generate SQL
        String sql = gemini.generateSql(req.reportId(), visibleCols, colTypes, sample, req.prompt());
        log.info("Executing: {}", sql);

        // 4. Execute
        List<String> outCols = new ArrayList<>();
        List<Map<String, Object>> rows = new ArrayList<>();

        try {
            jdbc.query(sql, rs -> {
                if (outCols.isEmpty()) {
                    try {
                        var md = rs.getMetaData();
                        for (int i = 1; i <= md.getColumnCount(); i++) {
                            String lbl = md.getColumnLabel(i);
                            if (!lbl.equals("_row_num")) outCols.add(lbl);
                        }
                    } catch (Exception e) { log.error("getMetaData failed", e); }
                }
                Map<String, Object> row = new LinkedHashMap<>();
                for (String col : outCols) {
                    try { row.put(col, rs.getObject(col)); }
                    catch (Exception e) { row.put(col, null); }
                }
                rows.add(row);
            });
        } catch (Exception e) {
            log.error("SQL execution failed: {} | SQL: {}", e.getMessage(), sql);
            throw new RuntimeException("SQL execution failed: " + e.getMessage() +
                "\n\nGenerated SQL:\n" + sql, e);
        }

        long ms = System.currentTimeMillis() - start;
        log.info("Query done: {} rows in {}ms", rows.size(), ms);

        // Determine model used
        boolean usedGemini = !sql.equals("SELECT * FROM report_" + req.reportId() + " LIMIT 1000");
        String model = usedGemini ? "gemini-2.0-flash" : "rule-based";

        return new QueryResult(req.reportId(), req.prompt(), sql, outCols, rows, model, ms);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private Map<String, Object> loadMeta(Long id) {
        try {
            return jdbc.queryForMap(
                "SELECT file_name,row_count,col_count,columns_json,col_types_json FROM report_meta WHERE id=?", id);
        } catch (Exception e) {
            throw new IllegalArgumentException("Report not found: " + id);
        }
    }

    private List<Map<String, Object>> loadSample(Long id, int limit) {
        try {
            // Exclude _row_num from sample shown to Gemini
            return jdbc.queryForList(
                "SELECT * FROM report_" + id + " ORDER BY _row_num LIMIT " + limit);
        } catch (Exception e) {
            log.warn("Sample load failed: {}", e.getMessage());
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    private List<String> parseList(Object json) {
        if (json == null) return List.of();
        try { return objectMapper.readValue(json.toString(), new TypeReference<List<String>>(){}); }
        catch (Exception e) { return List.of(); }
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> parseMap(Object json) {
        if (json == null) return Map.of();
        try { return objectMapper.readValue(json.toString(), new TypeReference<Map<String,String>>(){}); }
        catch (Exception e) { return Map.of(); }
    }
}
