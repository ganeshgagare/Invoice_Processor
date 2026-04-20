package com.t2.shared;
import java.util.List;
import java.util.Map;
public record ExportRequest(String fileName, String prompt, List<String> columns, List<Map<String, Object>> rows) {}
