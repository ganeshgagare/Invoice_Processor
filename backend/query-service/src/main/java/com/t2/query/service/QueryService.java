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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Query orchestration:
 * 1. Load schema for the report (column names + types + sample rows) from PostgreSQL
 * 2. Call Gemini to generate a real SQL SELECT statement
 * 3. Execute the SQL against the real report_<id> table
 * 4. Return columns + rows as QueryResult
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QueryService {

    private static final Pattern PHRASE_NUMERIC_FILTER = Pattern.compile(
        "(?i)\\b([a-z0-9_ ]+?)\\s*(?:is\\s+)?(greater than|greater then|more than|over|above|less than|under|below|at least|no less than|at most|no more than|equal to|equals|equal|not equal to|not equal)\\s*(-?\\d+(?:\\.\\d+)?)\\b"
    );
    private static final Pattern SYMBOL_NUMERIC_FILTER = Pattern.compile(
        "(?i)\\b([a-z0-9_ ]+?)\\s*(<=|>=|!=|=|<|>)\\s*(-?\\d+(?:\\.\\d+)?)\\b"
    );
    private static final Pattern TOP_BY_PATTERN = Pattern.compile(
        "(?i)\\btop\\s+(\\d{1,5})\\s+by\\s+([a-z0-9_ ]+?)(?:\\s+(asc|ascending|desc|descending))?\\b"
    );
    private static final Pattern FIRST_ROWS_PATTERN = Pattern.compile(
        "(?i)\\b(?:first|top)\\s+(\\d{1,5})\\s+rows?\\b"
    );

    private final JdbcTemplate    jdbc;
    private final GeminiSqlClient gemini;
    private final ObjectMapper    objectMapper;

    public QueryResult query(QueryRequest req) {
        long startMs = System.currentTimeMillis();
        log.info("Query reportId={} prompt='{}'", req.reportId(), req.prompt());

        // 1. Load schema from report_meta
        Map<String, Object> meta = loadMeta(req.reportId());
        List<String> columns  = parseList(meta.get("columns_json"));
        Map<String, String> colTypes = parseMap(meta.get("col_types_json"));
        log.info("Schema: cols={} types={}", columns, colTypes);

        // 2. Load up to 5 sample rows for Gemini context
        List<Map<String, Object>> sampleRows = loadSample(req.reportId(), columns, 5);

        // 3. Prefer a deterministic SQL rewrite for simple numeric filters.
        String sql = buildDirectSql(req.reportId(), req.prompt(), columns, colTypes);
        boolean usedRuleBased = sql != null;
        if (!usedRuleBased) {
            sql = gemini.generateSql(req.reportId(), columns, colTypes, sampleRows, req.prompt());
        }
        log.info("Executing SQL: {}", sql);

        // 4. Execute SQL — read column names from ResultSetMetaData (truth from DB)
        List<String> outCols  = new ArrayList<>();
        List<Map<String, Object>> rows = new ArrayList<>();

        jdbc.query(sql, rs -> {
            if (outCols.isEmpty()) {
                var meta2 = rs.getMetaData();
                int n = meta2.getColumnCount();
                for (int i = 1; i <= n; i++) outCols.add(meta2.getColumnLabel(i));
            }
            Map<String, Object> row = new LinkedHashMap<>();
            for (String col : outCols) row.put(col, rs.getObject(col));
            rows.add(row);
        });

        long ms = System.currentTimeMillis() - startMs;
        log.info("Query complete: {} rows in {}ms", rows.size(), ms);

        // Determine which model was used (from SQL comment or default)
        String model = usedRuleBased ? "rule-based" : "gemini-2.0-flash";

        return new QueryResult(req.reportId(), req.prompt(), sql, outCols, rows, model, ms);
    }

    // ── Helpers ────────────────────────────────────────────────────────────

    private Map<String, Object> loadMeta(Long reportId) {
        try {
            return jdbc.queryForMap(
                "SELECT file_name,row_count,col_count,columns_json,col_types_json FROM report_meta WHERE id=?",
                reportId);
        } catch (Exception e) {
            throw new IllegalArgumentException("Report not found: " + reportId);
        }
    }

    private List<Map<String, Object>> loadSample(Long reportId, List<String> cols, int limit) {
        try {
            return jdbc.queryForList("SELECT * FROM report_" + reportId + " LIMIT " + limit);
        } catch (Exception e) {
            log.warn("Could not load sample rows: {}", e.getMessage());
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    private List<String> parseList(Object json) {
        if (json == null) return List.of();
        try { return objectMapper.readValue(json.toString(), new TypeReference<>(){}); }
        catch (Exception e) { return List.of(); }
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> parseMap(Object json) {
        if (json == null) return Map.of();
        try { return objectMapper.readValue(json.toString(), new TypeReference<>(){}); }
        catch (Exception e) { return Map.of(); }
    }

    private String buildDirectSql(Long reportId, String prompt, List<String> columns, Map<String, String> colTypes) {
        if (prompt == null || prompt.isBlank()) {
            return null;
        }

        String normalizedPrompt = prompt.trim();

        Matcher topByMatcher = TOP_BY_PATTERN.matcher(normalizedPrompt);
        if (topByMatcher.find()) {
            int limit = normalizeLimit(topByMatcher.group(1));
            String matchedColumn = resolveColumn(topByMatcher.group(2), columns);
            if (matchedColumn == null) {
                return null;
            }
            String directionToken = topByMatcher.group(3);
            String direction = (directionToken == null)
                ? "DESC"
                : (directionToken.equalsIgnoreCase("asc") || directionToken.equalsIgnoreCase("ascending") ? "ASC" : "DESC");
            return "SELECT * FROM report_" + reportId + " ORDER BY \"" + matchedColumn + "\" " + direction + " LIMIT " + limit;
        }

        Matcher firstRowsMatcher = FIRST_ROWS_PATTERN.matcher(normalizedPrompt);
        if (firstRowsMatcher.find()) {
            int limit = normalizeLimit(firstRowsMatcher.group(1));
            return "SELECT * FROM report_" + reportId + " LIMIT " + limit;
        }

        String promptLower = normalizedPrompt.toLowerCase(Locale.ROOT);
        if (promptLower.contains("show all") || promptLower.contains("all records")) {
            return "SELECT * FROM report_" + reportId + " LIMIT 1000";
        }

        Matcher symbolMatcher = SYMBOL_NUMERIC_FILTER.matcher(normalizedPrompt);
        if (symbolMatcher.find()) {
            String matchedColumn = resolveColumn(symbolMatcher.group(1), columns);
            String operator = symbolMatcher.group(2);
            String numericValue = symbolMatcher.group(3);
            return buildNumericWhere(reportId, matchedColumn, operator, numericValue, colTypes);
        }

        Matcher phraseMatcher = PHRASE_NUMERIC_FILTER.matcher(normalizedPrompt);
        if (!phraseMatcher.find()) {
            return null;
        }

        String matchedColumn = resolveColumn(phraseMatcher.group(1), columns);
        String operatorPhrase = phraseMatcher.group(2).toLowerCase(Locale.ROOT);
        String numericValue = phraseMatcher.group(3);

        if (matchedColumn == null) {
            return null;
        }

        String operator = switch (operatorPhrase) {
            case "greater than", "greater then", "more than", "over", "above" -> ">";
            case "less than", "under", "below" -> "<";
            case "at least", "no less than" -> ">=";
            case "at most", "no more than" -> "<=";
            case "equal to", "equals", "equal" -> "=";
            case "not equal to", "not equal" -> "!=";
            default -> null;
        };

        return buildNumericWhere(reportId, matchedColumn, operator, numericValue, colTypes);
    }

    private String buildNumericWhere(Long reportId, String matchedColumn, String operator, String numericValue,
                                     Map<String, String> colTypes) {
        if (matchedColumn == null || operator == null) {
            return null;
        }

        if (!"NUMERIC".equalsIgnoreCase(colTypes.getOrDefault(matchedColumn, "TEXT"))) {
            return null;
        }

        return "SELECT * FROM report_" + reportId + " WHERE \"" + matchedColumn + "\" " + operator + " " + numericValue + " LIMIT 1000";
    }

    private String resolveColumn(String requestedColumnChunk, List<String> columns) {
        String requested = normalizeToken(requestedColumnChunk);
        if (requested.isBlank()) {
            return null;
        }

        String exact = columns.stream()
            .filter(column -> normalizeToken(column).equals(requested))
            .findFirst()
            .orElse(null);
        if (exact != null) {
            return exact;
        }

        return columns.stream()
            .filter(column -> requested.endsWith(normalizeToken(column)) || requested.contains(normalizeToken(column)))
            .max(Comparator.comparingInt(c -> normalizeToken(c).length()))
            .orElse(null);
    }

    private int normalizeLimit(String raw) {
        try {
            int parsed = Integer.parseInt(raw);
            if (parsed < 1) return 1;
            return Math.min(parsed, 5000);
        } catch (Exception e) {
            return 1000;
        }
    }

    private String normalizeToken(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "");
    }
}
