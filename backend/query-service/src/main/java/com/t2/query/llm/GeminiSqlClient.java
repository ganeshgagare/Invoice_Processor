package com.t2.query.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.*;

/**
 * Calls Gemini to generate a SQL SELECT against the exact table schema.
 *
 * BUG FIX #2: The old prompt used hardcoded example columns (amount, date)
 * that don't exist in the real table → Gemini got confused and returned SELECT *.
 *
 * Fix: Examples are now generated DYNAMICALLY from the actual column names
 * and types. Gemini sees e.g. "unit_price (NUMERIC)" and examples using
 * "unit_price" → generates correct ORDER BY / WHERE for that column.
 *
 * Also: responseMimeType removed (it caused Gemini to wrap in JSON which
 * broke plain-text SQL extraction). Now we ask for raw text and parse it cleanly.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GeminiSqlClient {

    private static final List<String> MODELS = List.of("gemini-2.0-flash", "gemini-1.5-flash");
    private static final String BASE =
        "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";

    @Value("${gemini.api-key}")
    private String apiKey;

    private final WebClient.Builder webClient;
    private final ObjectMapper      objectMapper;

    public String generateSql(Long reportId, List<String> columns,
                               Map<String, String> colTypes,
                               List<Map<String, Object>> sampleRows,
                               String prompt) {

        String table   = "report_" + reportId;
        String llmPmt  = buildPrompt(table, columns, colTypes, sampleRows, prompt);
        String body    = buildBody(llmPmt);

        log.info("Generating SQL for prompt: '{}'  table={}", prompt, table);
        Exception lastErr = null;

        for (int mi = 0; mi < MODELS.size(); mi++) {
            String url = String.format(BASE, MODELS.get(mi)) + "?key=" + apiKey;
            for (int attempt = 1; attempt <= 3; attempt++) {
                try {
                    log.debug("Gemini: model={} attempt={}", MODELS.get(mi), attempt);
                    String raw = webClient.build()
                        .post().uri(url)
                        .contentType(MediaType.APPLICATION_JSON)
                        .bodyValue(body)
                        .retrieve()
                        .bodyToMono(String.class)
                        .block(Duration.ofSeconds(25));  // shorter timeout = fail faster

                    if (raw == null || raw.isBlank())
                        throw new RuntimeException("Empty Gemini response");

                    String sql = parseSql(raw, table);
                    log.info("Generated SQL [{}]: {}", MODELS.get(mi), sql);
                    return sql;

                } catch (WebClientResponseException e) {
                    int status = e.getStatusCode().value();
                    log.warn("Gemini HTTP {} on {} attempt {}", status, MODELS.get(mi), attempt);
                    if (status == 429) {
                        long wait = (long) Math.pow(2, attempt + mi) * 3000L;
                        log.info("Rate limit — waiting {}ms before retry", wait);
                        sleep(wait);
                        lastErr = e;
                        if (attempt == 3) break;     // move to next model
                    } else { lastErr = e; break; }   // non-retriable
                } catch (Exception e) {
                    log.error("Gemini call failed: {}", e.getMessage());
                    lastErr = e;
                    break;
                }
            }
        }

        // All models failed — use rule-based fallback (never crash the query)
        log.error("All Gemini models failed. Falling back to rule-based SQL. Last error: {}",
            lastErr != null ? lastErr.getMessage() : "unknown");
        return buildRuleBasedSql(table, columns, colTypes, prompt);
    }

    // ── Prompt — dynamic examples from real schema ─────────────────────────

    private String buildPrompt(String table, List<String> columns,
                                Map<String, String> colTypes,
                                List<Map<String, Object>> sample,
                                String question) {

        // Pick columns for dynamic examples
        String numericCol = columns.stream()
            .filter(c -> "NUMERIC".equals(colTypes.get(c))).findFirst().orElse(null);
        String textCol = columns.stream()
            .filter(c -> !"NUMERIC".equals(colTypes.get(c)) && !c.startsWith("_")).findFirst().orElse(null);
        String firstCol = columns.isEmpty() ? "*" : "\"" + columns.get(0) + "\"";
        String secondCol = columns.size() > 1 ? "\"" + columns.get(1) + "\"" : firstCol;

        StringBuilder sb = new StringBuilder();
        sb.append("You are a PostgreSQL expert. Your ONLY job is to output a single SQL SELECT statement.\n");
        sb.append("Do NOT explain. Do NOT add markdown. Output ONLY the raw SQL.\n\n");

        // Schema
        sb.append("TABLE: ").append(table).append("\n");
        sb.append("COLUMNS:\n");
        for (String col : columns) {
            if (col.equals("_row_num")) continue;
            sb.append("  ").append(col).append(" ").append(colTypes.getOrDefault(col, "TEXT")).append("\n");
        }
        sb.append("\n");

        // Sample data (real values for Gemini to understand)
        if (!sample.isEmpty()) {
            sb.append("SAMPLE ROWS (").append(Math.min(sample.size(), 3)).append("):\n");
            sample.stream().limit(3).forEach(row -> {
                sb.append("  {");
                row.forEach((k,v) -> { if (!k.equals("_row_num")) sb.append(k).append("=").append(v).append(", "); });
                if (sb.charAt(sb.length()-2) == ',') { sb.deleteCharAt(sb.length()-1); sb.deleteCharAt(sb.length()-1); }
                sb.append("}\n");
            });
            sb.append("\n");
        }

        // Dynamic worked examples using the ACTUAL column names
        sb.append("EXAMPLES (use these patterns exactly):\n");
        sb.append("Q: show all records\n");
        sb.append("A: SELECT * FROM ").append(table).append(" LIMIT 1000\n\n");

        if (numericCol != null) {
            sb.append("Q: top 5 by ").append(numericCol).append(" descending\n");
            sb.append("A: SELECT * FROM ").append(table)
              .append(" ORDER BY \"").append(numericCol).append("\" DESC LIMIT 5\n\n");

            // Pick a sample numeric value from the data
            String sampleVal = "100";
            if (!sample.isEmpty()) {
                Object v = sample.get(0).get(numericCol);
                if (v != null) sampleVal = v.toString().replaceAll("[^0-9.]","");
            }
            sb.append("Q: ").append(numericCol).append(" greater than ").append(sampleVal).append("\n");
            sb.append("A: SELECT * FROM ").append(table)
              .append(" WHERE \"").append(numericCol).append("\" > ").append(sampleVal).append(" LIMIT 1000\n\n");

            sb.append("Q: ").append(numericCol).append(" between 100 and 500\n");
            sb.append("A: SELECT * FROM ").append(table)
              .append(" WHERE \"").append(numericCol).append("\" BETWEEN 100 AND 500 LIMIT 1000\n\n");
        }

        if (textCol != null) {
            String sampleTextVal = "value";
            if (!sample.isEmpty()) {
                Object v = sample.get(0).get(textCol);
                if (v != null && !v.toString().isBlank()) sampleTextVal = v.toString().trim();
            }
            sb.append("Q: ").append(textCol).append(" is ").append(sampleTextVal).append("\n");
            sb.append("A: SELECT * FROM ").append(table)
              .append(" WHERE \"").append(textCol).append("\" ILIKE '").append(sampleTextVal).append("' LIMIT 1000\n\n");

            sb.append("Q: ").append(textCol).append(" contains ABC\n");
            sb.append("A: SELECT * FROM ").append(table)
              .append(" WHERE \"").append(textCol).append("\" ILIKE '%ABC%' LIMIT 1000\n\n");
        }

        sb.append("Q: show only ").append(columns.size() > 1
            ? columns.get(0) + " and " + columns.get(1) : columns.get(0)).append("\n");
        sb.append("A: SELECT ").append(firstCol);
        if (columns.size() > 1) sb.append(", ").append(secondCol);
        sb.append(" FROM ").append(table).append(" LIMIT 1000\n\n");

        if (numericCol != null) {
            sb.append("Q: sort by ").append(numericCol).append(" ascending\n");
            sb.append("A: SELECT * FROM ").append(table)
              .append(" ORDER BY \"").append(numericCol).append("\" ASC LIMIT 1000\n\n");
        }

        sb.append("RULES:\n");
        sb.append("- ALWAYS quote column names with double-quotes: \"column_name\"\n");
        sb.append("- ALWAYS include LIMIT (use the number from the question, default 1000)\n");
        sb.append("- Use ILIKE for text comparisons (case-insensitive)\n");
        sb.append("- Use > < = >= <= BETWEEN for NUMERIC columns\n");
        sb.append("- Only use columns that exist in the schema above\n");
        sb.append("- Output ONLY the SQL. No explanation.\n\n");

        sb.append("Q: ").append(question).append("\nA: ");
        return sb.toString();
    }

    private String buildBody(String prompt) {
        try {
            // No responseMimeType — plain text output is cleaner for SQL
            Map<String, Object> genConf = new LinkedHashMap<>();
            genConf.put("temperature", 0.0);
            genConf.put("maxOutputTokens", 300);
            genConf.put("stopSequences", List.of("\n\n", "Q:", "--"));

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));
            body.put("generationConfig", genConf);
            return objectMapper.writeValueAsString(body);
        } catch (Exception e) { throw new RuntimeException(e); }
    }

    // ── Parse SQL from Gemini response ─────────────────────────────────────

    private String parseSql(String raw, String table) {
        try {
            JsonNode root = objectMapper.readTree(raw);
            if (root.has("error"))
                throw new RuntimeException(root.path("error").path("message").asText("Gemini API error"));

            String text = root.path("candidates").get(0)
                .path("content").path("parts").get(0).path("text").asText().trim();

            // Clean markdown fences
            text = text.replaceAll("(?s)```sql\\s*", "").replaceAll("```", "").trim();
            // Remove trailing semicolon
            while (text.endsWith(";")) text = text.substring(0, text.length()-1).trim();
            // Take only the first statement if multiple
            if (text.contains(";")) text = text.split(";")[0].trim();

            // Validate
            String lower = text.toLowerCase();
            if (!lower.startsWith("select")) {
                log.warn("Gemini returned non-SELECT: '{}' — using fallback", text);
                return "SELECT * FROM " + table + " LIMIT 1000";
            }
            if (!lower.contains(table.toLowerCase())) {
                // Gemini used wrong table name — inject correct one
                log.warn("Gemini used wrong table in: '{}' — fixing", text);
                text = text.replaceAll("(?i)\\bfrom\\s+\\S+", "FROM " + table);
            }
            return text;
        } catch (Exception e) {
            log.error("parseSql failed on: {}", raw.substring(0, Math.min(200, raw.length())), e);
            return "SELECT * FROM " + table + " LIMIT 1000";
        }
    }

    // ── Rule-based SQL fallback — used when ALL Gemini calls fail ──────────
    // This guarantees a response even with no API access.

    private String buildRuleBasedSql(String table, List<String> columns,
                                      Map<String, String> colTypes, String prompt) {
        String p = prompt.toLowerCase().trim();
        StringBuilder sql = new StringBuilder("SELECT * FROM ").append(table);

        // WHERE clauses
        List<String> wheres = new ArrayList<>();

        for (String col : columns) {
            if (col.equals("_row_num")) continue;
            String type  = colTypes.getOrDefault(col, "TEXT");
            String colPat = col.replace("_", "[ _]?");

            if ("NUMERIC".equals(type)) {
                // "col > N"
                java.util.regex.Matcher m = java.util.regex.Pattern
                    .compile("(?:" + colPat + ")\\s*(?:greater than|>|above|more than|over)\\s*([\\d,.]+)", java.util.regex.Pattern.CASE_INSENSITIVE)
                    .matcher(p);
                if (m.find()) wheres.add("\"" + col + "\" > " + m.group(1).replace(",",""));

                m = java.util.regex.Pattern
                    .compile("(?:" + colPat + ")\\s*(?:less than|<|below|under)\\s*([\\d,.]+)", java.util.regex.Pattern.CASE_INSENSITIVE)
                    .matcher(p);
                if (m.find()) wheres.add("\"" + col + "\" < " + m.group(1).replace(",",""));

                m = java.util.regex.Pattern
                    .compile("(?:" + colPat + ")\\s+between\\s+([\\d,.]+)\\s+and\\s+([\\d,.]+)", java.util.regex.Pattern.CASE_INSENSITIVE)
                    .matcher(p);
                if (m.find()) wheres.add("\"" + col + "\" BETWEEN " + m.group(1).replace(",","") + " AND " + m.group(2).replace(",",""));
            } else {
                // "col is/equals VALUE" or "col contains VALUE"
                java.util.regex.Matcher m = java.util.regex.Pattern
                    .compile("(?:" + colPat + ")\\s+(?:is|=|equals?)\\s+['\"]?([\\w\\s-]+?)['\"]?(?=\\s+(?:and|or|sorted|order|limit|$)|$)", java.util.regex.Pattern.CASE_INSENSITIVE)
                    .matcher(p);
                if (m.find()) {
                    String val = m.group(1).trim().replace("'","''");
                    wheres.add("\"" + col + "\" ILIKE '" + val + "'");
                }
                m = java.util.regex.Pattern
                    .compile("(?:" + colPat + ")\\s+(?:contains?|like|has)\\s+['\"]?([\\w\\s-]+?)['\"]?(?=\\s|$)", java.util.regex.Pattern.CASE_INSENSITIVE)
                    .matcher(p);
                if (m.find()) {
                    String val = m.group(1).trim().replace("'","''");
                    wheres.add("\"" + col + "\" ILIKE '%" + val + "%'");
                }
            }
        }

        if (!wheres.isEmpty()) sql.append(" WHERE ").append(String.join(" AND ", wheres));

        // ORDER BY
        for (String col : columns) {
            if (col.equals("_row_num")) continue;
            String colPat = col.replace("_","[ _]?");
            boolean desc = p.matches(".*(?:sorted?|order)\\s+by\\s+" + colPat + "\\s+desc.*")
                        || p.matches(".*top\\s+\\d+\\s+by\\s+" + colPat + "\\s+desc.*")
                        || p.matches(".*" + colPat + "\\s+desc.*");
            boolean asc  = p.matches(".*(?:sorted?|order)\\s+by\\s+" + colPat + "\\s+asc.*")
                        || p.matches(".*" + colPat + "\\s+asc.*");
            boolean anySort = p.matches(".*(?:by|sorted?\\s+by|order\\s+by)\\s+" + colPat + ".*");
            if (desc || (anySort && !asc)) {
                sql.append(" ORDER BY \"").append(col).append("\" DESC");
                break;
            } else if (asc) {
                sql.append(" ORDER BY \"").append(col).append("\" ASC");
                break;
            }
        }

        // LIMIT
        java.util.regex.Matcher limM = java.util.regex.Pattern
            .compile("\\b(?:top|first|limit)\\s+(\\d+)\\b", java.util.regex.Pattern.CASE_INSENSITIVE)
            .matcher(p);
        int limit = limM.find() ? Integer.parseInt(limM.group(1)) : 1000;
        sql.append(" LIMIT ").append(limit);

        String result = sql.toString();
        log.info("Rule-based SQL: {}", result);
        return result;
    }

    private void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }
}
