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
 * Calls Gemini to generate a single real SQL SELECT statement.
 *
 * Gemini is given:
 *  - The exact table name (report_<id>)
 *  - All column names with their PostgreSQL types
 *  - Up to 5 sample rows so it understands data values
 *  - The user's natural-language prompt
 *
 * Gemini returns ONLY the SQL string. We then execute it directly.
 * This is the most accurate approach — real SQL, real schema, no JSON mapping.
 *
 * Model cascade: gemini-2.0-flash → gemini-1.5-flash on rate limit.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GeminiSqlClient {

    private static final List<String> MODELS = List.of("gemini-2.0-flash");
    private static final String BASE = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";

    @Value("${gemini.api-key}")
    private String apiKey;

    private final WebClient.Builder webClient;
    private final ObjectMapper      objectMapper;

    /**
     * @param reportId   the report ID (table = report_<id>)
     * @param columns    list of column names (sanitised, as they exist in the DB)
     * @param colTypes   map of colName → PostgreSQL type (TEXT/NUMERIC/BOOLEAN)
     * @param sampleRows up to 5 rows to show Gemini real data values
     * @param prompt     user's natural-language question
     * @return a safe SQL SELECT string ready to execute
     */
    public String generateSql(Long reportId, List<String> columns, Map<String, String> colTypes,
                               List<Map<String, Object>> sampleRows, String prompt) {
        String tableName = "report_" + reportId;
        String llmPrompt = buildPrompt(tableName, columns, colTypes, sampleRows, prompt);
        String body      = buildBody(llmPrompt);

        log.info("Calling Gemini to generate SQL for prompt: '{}'", prompt);
        Exception lastErr = null;

        for (int mi = 0; mi < MODELS.size(); mi++) {
            String url = String.format(BASE, MODELS.get(mi)) + "?key=" + apiKey;
            for (int attempt = 1; attempt <= 3; attempt++) {
                try {
                    log.debug("Gemini SQL gen: model={} attempt={}", MODELS.get(mi), attempt);
                    String raw = webClient.build()
                        .post().uri(url)
                        .contentType(MediaType.APPLICATION_JSON)
                        .bodyValue(body)
                        .retrieve()
                        .bodyToMono(String.class)
                        .block(Duration.ofSeconds(30));

                    if (raw == null || raw.isBlank()) throw new RuntimeException("Empty response from Gemini");

                    String sql = extractSql(raw, tableName, columns);
                    log.info("Generated SQL: {}", sql);
                    return sql;

                } catch (WebClientResponseException e) {
                    if (e.getStatusCode().value() == 429) {
                        long wait = (long) Math.pow(2, attempt + mi) * 2000;
                        log.warn("Rate limit on {}. Waiting {}ms…", MODELS.get(mi), wait);
                        try { Thread.sleep(wait); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                        lastErr = e;
                        if (attempt == 3) break; // try next model
                    } else { lastErr = e; break; }
                } catch (Exception e) { lastErr = e; break; }
            }
        }

        // All retries failed. Fail loudly instead of returning unfiltered data.
        String error = lastErr != null ? lastErr.getMessage() : "unknown";
        log.error("Gemini SQL generation failed after retries: {}", error);
        throw new RuntimeException("Gemini SQL generation failed: " + error);
    }

    // ── Prompt ─────────────────────────────────────────────────────────────

    private String buildPrompt(String tableName, List<String> columns, Map<String, String> colTypes,
                                List<Map<String, Object>> sampleRows, String userQuestion) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are a PostgreSQL SQL expert. Generate a single SQL SELECT query.\n\n");

        sb.append("## TABLE SCHEMA\n");
        sb.append("Table name: ").append(tableName).append("\n");
        sb.append("Columns:\n");
        for (String col : columns) {
            sb.append("  - ").append(col).append(" (").append(colTypes.getOrDefault(col, "TEXT")).append(")\n");
        }
        sb.append("\n");

        if (!sampleRows.isEmpty()) {
            sb.append("## SAMPLE DATA (").append(Math.min(sampleRows.size(), 5)).append(" rows)\n");
            sampleRows.stream().limit(5).forEach(row -> sb.append("  ").append(row).append("\n"));
            sb.append("\n");
        }

        sb.append("## RULES\n");
        sb.append("1. Generate a single valid PostgreSQL SELECT statement.\n");
        sb.append("2. Use ONLY the column names listed above (exact case).\n");
        sb.append("3. Use NUMERIC comparisons (>, <, =, BETWEEN) for NUMERIC columns.\n");
        sb.append("4. Use ILIKE for case-insensitive text search on TEXT columns.\n");
        sb.append("5. Always include a LIMIT clause (default 1000 if not specified).\n");
        sb.append("6. Do NOT use subqueries or JOINs — this is a single table.\n");
        sb.append("7. Quote column names with double-quotes if they contain special chars.\n");
        sb.append("8. Return ONLY the SQL query — no explanation, no markdown, no semicolon.\n\n");

        sb.append("## EXAMPLES\n");
        sb.append("Question: show all records\n");
        sb.append("SQL: SELECT * FROM ").append(tableName).append(" LIMIT 1000\n\n");
        sb.append("Question: top 10 by amount descending\n");
        sb.append("SQL: SELECT * FROM ").append(tableName).append(" ORDER BY amount DESC LIMIT 10\n\n");
        sb.append("Question: show invoice_number and total where status is PAID\n");
        sb.append("SQL: SELECT invoice_number, total FROM ").append(tableName).append(" WHERE status ILIKE 'PAID' LIMIT 1000\n\n");
        sb.append("Question: amount greater than 50000 sorted by date descending\n");
        sb.append("SQL: SELECT * FROM ").append(tableName).append(" WHERE amount > 50000 ORDER BY date DESC LIMIT 1000\n\n");
        sb.append("Question: show only product_code and unit_price\n");
        sb.append("SQL: SELECT product_code, unit_price FROM ").append(tableName).append(" LIMIT 1000\n\n");

        sb.append("## USER QUESTION\n").append(userQuestion).append("\n\nSQL:");
        return sb.toString();
    }

    private String buildBody(String prompt) {
        try {
            Map<String, Object> genConf = new LinkedHashMap<>();
            genConf.put("temperature", 0.0);
            genConf.put("maxOutputTokens", 512);
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))));
            body.put("generationConfig", genConf);
            return objectMapper.writeValueAsString(body);
        } catch (Exception e) { throw new RuntimeException(e); }
    }

    // ── Response parsing ───────────────────────────────────────────────────

    private String extractSql(String raw, String tableName, List<String> columns) {
        try {
            JsonNode root = objectMapper.readTree(raw);
            if (root.has("error"))
                throw new RuntimeException(root.path("error").path("message").asText("Gemini error"));

            String text = root.path("candidates").get(0)
                .path("content").path("parts").get(0).path("text").asText();

            // Strip markdown fences if any
            text = text.replaceAll("(?s)```sql\\s*", "").replaceAll("```", "").trim();

            // Remove trailing semicolon
            if (text.endsWith(";")) text = text.substring(0, text.length() - 1).trim();

            // Basic safety: must be a SELECT
            if (!text.toLowerCase().startsWith("select")) {
                throw new RuntimeException("Gemini returned non-SELECT SQL");
            }

            if (!text.toLowerCase().contains(("from " + tableName).toLowerCase())) {
                throw new RuntimeException("Gemini returned SQL for unexpected table");
            }

            return text;
        } catch (Exception e) {
            log.error("Failed to parse Gemini SQL response: {}", raw, e);
            throw new RuntimeException("Failed to parse Gemini SQL response", e);
        }
    }
}
