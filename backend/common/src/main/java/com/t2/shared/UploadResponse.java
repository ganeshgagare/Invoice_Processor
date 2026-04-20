package com.t2.shared;
import java.time.Instant;
public record UploadResponse(Long reportId, String fileName, int rowCount, int colCount, java.util.List<String> columns, Instant uploadedAt) {}
