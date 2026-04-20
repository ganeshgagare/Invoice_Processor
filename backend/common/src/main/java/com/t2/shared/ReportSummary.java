package com.t2.shared;
import java.time.Instant;
public record ReportSummary(Long reportId, String fileName, int rowCount, int colCount, Instant uploadedAt) {}
