import React, { useState, useEffect, useRef } from 'react';
import { uploadReport, listReports, runQuery, downloadExcel } from './services/api';
import './App.css';

// ─── STEP 1: Upload ───────────────────────────────────────────────────────────
function UploadStep({ onDone }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [phase, setPhase] = useState('');
  const [error, setError] = useState('');
  const [reports, setReports] = useState([]);
  const fileRef = useRef();
  const ticker  = useRef();

  useEffect(() => {
    listReports().then(setReports).catch(() => {});
  }, []);

  const PHASES = ['Reading file…','Parsing rows…','Creating table in PostgreSQL…','Indexing columns…'];

  const doUpload = async (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['json','csv','xlsx','xls'].includes(ext)) {
      setError('Only JSON, CSV, XLSX supported.'); return;
    }
    setError(''); setUploading(true); setPhase(PHASES[0]);
    let pi = 0;
    ticker.current = setInterval(() => {
      pi = Math.min(pi + 1, PHASES.length - 1);
      setPhase(PHASES[pi]);
    }, 1500);
    try {
      const r = await uploadReport(file);
      clearInterval(ticker.current);
      onDone(r);
    } catch (e) {
      clearInterval(ticker.current);
      setError(e?.response?.data?.message || e.message || 'Upload failed');
    } finally { setUploading(false); setPhase(''); }
  };

  return (
    <div className="step-wrap">
      <div className="card upload-card">
        <div className="card-hd">
          <div className="step-badge">01</div>
          <div>
            <h2 className="card-title">Upload Your Data File</h2>
            <p className="card-sub">JSON · CSV · XLSX — data is stored in PostgreSQL with proper typed columns</p>
          </div>
        </div>
        <div
          className={`dropzone ${dragging?'dz-over':''} ${uploading?'dz-busy':''}`}
          onClick={() => !uploading && fileRef.current.click()}
          onDragOver={e=>{e.preventDefault();setDragging(true);}}
          onDragLeave={()=>setDragging(false)}
          onDrop={e=>{e.preventDefault();setDragging(false);doUpload(e.dataTransfer.files[0]);}}
        >
          <input ref={fileRef} type="file" accept=".json,.csv,.xlsx,.xls" style={{display:'none'}}
            onChange={e=>doUpload(e.target.files[0])}/>
          {uploading ? (
            <div className="dz-loading">
              <div className="spin-ring"/>
              <span>{phase}</span>
            </div>
          ) : (
            <>
              <div className="dz-icon">📂</div>
              <div className="dz-label">{dragging?'Drop it!':'Click to browse or drag & drop'}</div>
              <div className="dz-hint">Max 100 MB</div>
              <div className="dz-chips">
                {['JSON','CSV','XLSX'].map(t=><span key={t} className="chip-type">{t}</span>)}
              </div>
            </>
          )}
        </div>
        {error && <div className="err-box">⚠ {error}</div>}
      </div>

      {reports.length > 0 && (
        <div className="card prev-card">
          <div className="card-hd">
            <div className="step-badge alt">↩</div>
            <div>
              <h2 className="card-title">Previous Uploads</h2>
              <p className="card-sub">Select to query again</p>
            </div>
          </div>
          <div className="prev-list">
            {reports.map(r => (
              <div key={r.reportId} className="prev-item" onClick={()=>onDone(r)}>
                <div className="prev-icon">{r.fileName.split('.').pop().toUpperCase()}</div>
                <div className="prev-info">
                  <div className="prev-name">{r.fileName}</div>
                  <div className="prev-meta">{r.rowCount?.toLocaleString()} rows · {r.colCount} cols · {new Date(r.uploadedAt).toLocaleDateString()}</div>
                </div>
                <span className="prev-arrow">→</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STEP 2: Query ────────────────────────────────────────────────────────────
const QUERY_EXAMPLES = [
  'Show all records',
  'Top 10 by amount descending',
  'Show only invoice_number and total',
  'Amount greater than 50000',
  'Amount between 10000 and 100000',
  'Status is PAID',
  'Vendor contains ABC sorted by total descending',
  'Show product_code and unit_price where quantity > 5',
  'Top 5 by unit_price descending',
  'Description contains Widget',
];

function QueryStep({ report, onResult, onBack }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [error, setError] = useState('');
  const ticker = useRef();

  const PHASES = [
    'Sending schema to Gemini AI…',
    'Gemini generating SQL…',
    'Executing SQL on PostgreSQL…',
    'Fetching results…',
  ];

  const run = async () => {
    if (!prompt.trim()) return;
    setError(''); setLoading(true); setPhaseIdx(0);
    let pi = 0;
    ticker.current = setInterval(() => {
      pi = Math.min(pi+1, PHASES.length-1);
      setPhaseIdx(pi);
    }, 2000);
    try {
      const result = await runQuery(report.reportId, prompt.trim());
      clearInterval(ticker.current);
      onResult(result);
    } catch(e) {
      clearInterval(ticker.current);
      setError(e?.response?.data?.message || e.message || 'Query failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="step-wrap two-col">
      <div className="card query-card">
        <div className="card-hd">
          <div className="step-badge">02</div>
          <div>
            <h2 className="card-title">Describe What You Need</h2>
            <p className="card-sub">Gemini AI converts your prompt to SQL and queries PostgreSQL</p>
          </div>
        </div>

        <div className="report-pill">
          <span className="rp-icon">{report.fileName?.split('.').pop()?.toUpperCase()}</span>
          <div>
            <div className="rp-name">{report.fileName}</div>
            <div className="rp-meta">{report.rowCount?.toLocaleString()} rows · {report.colCount} columns stored</div>
          </div>
          <button className="btn-ghost-sm" onClick={onBack}>← Change</button>
        </div>

        {report.columns && (
          <div className="schema-strip">
            <span className="schema-label">Columns:</span>
            {report.columns.map(c => <code key={c} className="col-chip">{c}</code>)}
          </div>
        )}

        <textarea
          className="prompt-ta"
          rows={3}
          placeholder='e.g. "show top 10 by amount descending" or "status is PAID and amount > 5000"'
          value={prompt}
          onChange={e=>setPrompt(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey))run();}}
          disabled={loading}
        />

        <div className="eg-label">Example prompts</div>
        <div className="eg-chips">
          {QUERY_EXAMPLES.map(ex=>(
            <button key={ex} className="eg-chip" onClick={()=>setPrompt(ex)} disabled={loading}>{ex}</button>
          ))}
        </div>

        {error && <div className="err-box">⚠ {error}</div>}

        <button className="btn-run" onClick={run} disabled={loading||!prompt.trim()}>
          {loading
            ? <><span className="spinner"/>{PHASES[phaseIdx]}</>
            : 'Run Query →'}
        </button>
        <div className="shortcut">⌘ + Enter</div>
      </div>

      <div className="tips-card">
        <div className="tips-title">📖 Prompt Guide</div>
        <div className="tips-section">Show data</div>
        <ul className="tips-list">
          <li><code>show all records</code></li>
          <li><code>top 10 by amount descending</code></li>
          <li><code>first 5 rows</code></li>
        </ul>
        <div className="tips-section">Filter</div>
        <ul className="tips-list">
          <li><code>status is PAID</code></li>
          <li><code>amount &gt; 50000</code></li>
          <li><code>amount between 1000 and 5000</code></li>
          <li><code>vendor contains ABC</code></li>
        </ul>
        <div className="tips-section">Select columns</div>
        <ul className="tips-list">
          <li><code>show only invoice_number and total</code></li>
          <li><code>return product_code, qty, price</code></li>
        </ul>
        <div className="tips-section">Combine</div>
        <ul className="tips-list">
          <li><code>status is PAID and amount &gt; 1000 top 20</code></li>
          <li><code>qty &gt; 5 sorted by price desc</code></li>
        </ul>
        <div className="tips-footer">
          ✓ Real SQL · No rate limit on query path
        </div>
      </div>
    </div>
  );
}

// ─── STEP 3: Results ──────────────────────────────────────────────────────────
function ResultsStep({ result, report, onNewQuery }) {
  const [exporting, setExporting] = useState(false);
  const [exportErr, setExportErr] = useState('');
  const { generatedSql, columns, rows, prompt, llmModel, executionMs } = result;

  const doExport = async () => {
    setExporting(true); setExportErr('');
    try {
      await downloadExcel(report.fileName, prompt, columns, rows);
    } catch(e) {
      setExportErr('Export failed: ' + (e.message||'unknown'));
    } finally { setExporting(false); }
  };

  return (
    <div className="step-wrap">
      <div className="card results-card">
        {/* Top bar */}
        <div className="results-topbar">
          <div className="results-stat">
            <span className="results-num">{rows.length.toLocaleString()}</span>
            <span className="results-lbl"> rows matched</span>
            <span className="results-badges">
              <span className="badge badge-green">{columns.length} columns</span>
              <span className="badge badge-blue">{llmModel}</span>
              <span className="badge badge-gray">{executionMs}ms</span>
            </span>
          </div>
          <div className="results-actions">
            <button className="btn-ghost" onClick={onNewQuery}>← New Query</button>
            <button className="btn-export" onClick={doExport} disabled={exporting||rows.length===0}>
              {exporting
                ? <><span className="spinner-wh"/>Generating…</>
                : <>⬇ Download Excel</>}
            </button>
          </div>
        </div>
        {exportErr && <div className="err-box">⚠ {exportErr}</div>}

        {/* Prompt */}
        <div className="prompt-banner">
          <strong>Prompt:</strong> "{prompt}"
        </div>

        {/* SQL */}
        <div className="sql-block">
          <div className="sql-head">Generated SQL <span className="sql-model">{llmModel}</span></div>
          <pre className="sql-code">{generatedSql}</pre>
        </div>

        {/* Preview table */}
        {rows.length === 0 ? (
          <div className="no-rows">
            <div className="no-rows-icon">🔍</div>
            <div>No rows matched.</div>
            <div className="no-rows-hint">Try "show all records" to verify data loaded, then narrow down.</div>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>{columns.map(c=><th key={c}>{c.replace(/_/g,' ')}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((row,i)=>(
                  <tr key={i} className={i%2===1?'alt-row':''}>
                    {columns.map(c=><td key={c}>{fmt(row[c])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > 0 && (
          <div className="table-foot">
            {rows.length.toLocaleString()} rows · {columns.length} columns
            {rows.length >= 1000 && <span className="warn"> — showing first 1000 rows, add LIMIT to get fewer</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function fmt(v) {
  if (v == null) return '—';
  if (typeof v === 'number') return v.toLocaleString('en-IN');
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  return String(v);
}

// ─── STEPPER ─────────────────────────────────────────────────────────────────
function Stepper({ step }) {
  const steps = ['Upload Data','Write Prompt','Preview & Export'];
  return (
    <div className="stepper">
      {steps.map((label,i)=>{
        const n = i+1;
        const done = n < step, active = n === step;
        return (
          <React.Fragment key={n}>
            <div className={`st ${active?'st-active':''} ${done?'st-done':''}`}>
              <div className="st-circle">{done?'✓':n}</div>
              <div className="st-label">{label}</div>
            </div>
            {i < steps.length-1 && <div className={`st-line ${done?'st-line-done':''}`}/>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep]     = useState(1);
  const [report, setReport] = useState(null);
  const [result, setResult] = useState(null);

  const handleUploaded = (r) => { setReport(r); setResult(null); setStep(2); };
  const handleResult   = (r) => { setResult(r); setStep(3); };
  const handleNewQuery = ()  => { setResult(null); setStep(2); };
  const handleBack     = ()  => { setReport(null); setResult(null); setStep(1); };

  return (
    <div className="app">
      <header className="app-hdr">
        <div className="hdr-inner">
          <div className="logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect width="24" height="24" rx="7" fill="#6366f1"/>
              <path d="M6 12l4 4L18 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="logo-name">ReportPrompt</span>
            <span className="logo-tag">AI</span>
          </div>
          <div className="hdr-pills">
            <span className="hdr-pill">Gemini AI</span>
            <span className="hdr-pill">Spring Boot</span>
            <span className="hdr-pill">PostgreSQL</span>
          </div>
        </div>
      </header>

      <div className="hero-strip">
        <div className="hero-inner">
          <Stepper step={step}/>
        </div>
      </div>

      <main className="main">
        {step === 1 && <UploadStep onDone={handleUploaded}/>}
        {step === 2 && report && <QueryStep report={report} onResult={handleResult} onBack={handleBack}/>}
        {step === 3 && result  && <ResultsStep result={result} report={report} onNewQuery={handleNewQuery}/>}
      </main>

      <footer className="app-ft">
        Built with React · Spring Boot Microservices · PostgreSQL · Gemini AI
      </footer>
    </div>
  );
}
