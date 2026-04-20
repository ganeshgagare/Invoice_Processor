-- ReportPrompt Platform — Database Init
-- Only the metadata table is created here.
-- Each uploaded report gets its own table: report_<id>
-- created dynamically by IngestionService.

CREATE TABLE IF NOT EXISTS report_meta (
    id             BIGSERIAL    PRIMARY KEY,
    file_name      TEXT         NOT NULL,
    row_count      INTEGER      NOT NULL DEFAULT 0,
    col_count      INTEGER      NOT NULL DEFAULT 0,
    columns_json   JSONB        NOT NULL DEFAULT '[]',
    col_types_json JSONB        NOT NULL DEFAULT '{}',
    uploaded_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_meta_uploaded ON report_meta(uploaded_at DESC);
