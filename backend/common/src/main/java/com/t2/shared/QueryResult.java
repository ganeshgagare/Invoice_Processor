package com.t2.shared;
import java.util.List;
import java.util.Map;
public record QueryResult(
    Long reportId,
    String prompt,
    String generatedSql,
    List<String> columns,
    List<Map<String, Object>> rows,
    String llmModel,
    long executionMs
) {}
