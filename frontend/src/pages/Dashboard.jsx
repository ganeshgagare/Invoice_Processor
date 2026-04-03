import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { invoiceAPI } from '../services/api';

const USER_PROMPT_MAX_LENGTH = 500;

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileInputRef = useRef(null);

  const safeInvoices = Array.isArray(invoices) ? invoices : [];

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const response = await invoiceAPI.listInvoices();
      const nextInvoices = response?.data?.invoices;
      setInvoices(Array.isArray(nextInvoices) ? nextInvoices : []);
      setError(null);
    } catch (err) {
      setInvoices([]);
      setError('Failed to load invoices: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadInvoices();
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadWithPrompt = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    const trimmedPrompt = userPrompt.trim();
    if (trimmedPrompt.length > USER_PROMPT_MAX_LENGTH) {
      alert(`Custom instructions can be up to ${USER_PROMPT_MAX_LENGTH} characters only.`);
      return;
    }

    setUploading(true);
    try {
      const response = await invoiceAPI.uploadInvoice(selectedFile, userPrompt);
      if (response?.data?.status === 'completed') {
        alert('✅ Invoice processed successfully!');
      } else {
        alert('⚠️ Invoice processing failed: ' + (response?.data?.message || 'Unknown error'));
      }

      setUserPrompt('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadInvoices();
    } catch (err) {
      alert('Error uploading invoice: ' + (err.response?.data?.detail || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handlePreviewInvoice = async (invoice) => {
    setSelectedInvoice(invoice);
    setShowPreview(true);
    setPreviewLoading(true);
    setPreviewHtml('');

    try {
      const response = await invoiceAPI.getInvoiceHTML(invoice.id);
      setPreviewHtml(response?.data?.html || '<p>No preview available.</p>');
    } catch (err) {
      setPreviewHtml('<p>Error loading invoice preview</p>');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDeleteInvoice = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await invoiceAPI.deleteInvoice(id);
      await loadInvoices();
    } catch (err) {
      alert('Error deleting invoice: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDownloadHTML = async (id) => {
    try {
      const response = await invoiceAPI.getInvoiceHTML(id);
      const blob = new Blob([response.data.html], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${id}.html`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error downloading HTML: ' + (err.response?.data?.detail || err.message));
    }
  };

  const getStatusBadgeClass = (status) => {
    if (status === 'completed') return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    if (status === 'processing') return 'bg-amber-100 text-amber-800 border border-amber-200';
    if (status === 'failed') return 'bg-rose-100 text-rose-800 border border-rose-200';
    return 'bg-sky-100 text-sky-800 border border-sky-200';
  };

  const getStatusText = (status) => {
    if (status === 'completed') return 'Completed';
    if (status === 'processing') return 'Processing';
    if (status === 'failed') return 'Failed';
    return 'Pending';
  };

  const completedCount = safeInvoices.filter((invoice) => invoice?.status === 'completed').length;
  const processingCount = safeInvoices.filter((invoice) => invoice?.status === 'processing').length;
  const failedCount = safeInvoices.filter((invoice) => invoice?.status === 'failed').length;

  const formatInvoiceDate = (rawDate) => {
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) return 'Date unavailable';
    return parsed.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 bg-scene-dashboard relative overflow-hidden">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-3 min-w-0 text-left"
            aria-label="Go to landing page"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center text-lg shadow-md shrink-0">📄</div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 truncate">Invoice Processor</h1>
              <p className="text-xs sm:text-sm text-slate-500 truncate">Automated extraction workspace</p>
            </div>
          </button>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 max-w-[240px]">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">User</span>
              <span className="text-sm font-semibold text-slate-800 truncate">{user?.full_name}</span>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10 space-y-6">
        <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-primary to-secondary text-white shadow-xl border border-white/10 overflow-hidden">
          <div className="px-5 sm:px-7 py-6 sm:py-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">Workspace</p>
              <h2 className="text-2xl sm:text-3xl font-black mt-1">Welcome back, {user?.full_name || 'User'}</h2>
              <p className="text-white/85 mt-1 text-sm sm:text-base">Your dashboard is ready. Upload an invoice or review recent processing results below.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center min-w-0 sm:min-w-[300px]">
              <div className="rounded-2xl bg-white/10 backdrop-blur px-3 py-3 border border-white/10">
                <p className="text-2xl font-black">{safeInvoices.length}</p>
                <p className="text-[11px] uppercase tracking-wide text-white/75 mt-1">Total</p>
              </div>
              <div className="rounded-2xl bg-white/10 backdrop-blur px-3 py-3 border border-white/10">
                <p className="text-2xl font-black text-emerald-200">{completedCount}</p>
                <p className="text-[11px] uppercase tracking-wide text-white/75 mt-1">Done</p>
              </div>
              <div className="rounded-2xl bg-white/10 backdrop-blur px-3 py-3 border border-white/10">
                <p className="text-2xl font-black text-amber-200">{processingCount + failedCount}</p>
                <p className="text-[11px] uppercase tracking-wide text-white/75 mt-1">Active</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.55fr)_360px] gap-6 items-start">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 lg:p-7">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Upload Invoice</h2>
                <p className="text-slate-600 mt-1">Upload a document and optionally provide extraction instructions.</p>
              </div>
              <div className="sm:text-right text-sm text-slate-500">
                <p className="font-semibold text-slate-700">Recommended</p>
                <p>PDF, JPG, PNG, WebP</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_200px] gap-4 lg:gap-5 items-stretch">
              <div className="h-full flex flex-col">
                <label htmlFor="userPrompt" className="block mb-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
                  Custom Instructions <span className="ml-2 text-xs font-semibold text-slate-500 normal-case">Optional</span>
                </label>
                <textarea
                  id="userPrompt"
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="Example: focus on invoice total, vendor name, due date, and line items."
                  rows="4"
                  maxLength={USER_PROMPT_MAX_LENGTH}
                  className="w-full flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none min-h-[150px]"
                />
                <div className="mt-2 text-right text-xs font-semibold text-slate-500">
                  {userPrompt.length}/{USER_PROMPT_MAX_LENGTH} characters
                </div>
              </div>

              <div className="border border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50 flex flex-col justify-between h-full min-h-[186px]">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  disabled={uploading}
                  className="hidden"
                />
                <div>
                  <div className="text-3xl mb-2">📁</div>
                  <p className="text-slate-700 font-semibold">Drop a file or choose manually</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">Keep the file small and the prompt specific for best results.</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="btn-primary w-full px-4 py-2.5 text-sm"
                  >
                    {uploading ? 'Processing...' : 'Choose File'}
                  </button>
                  {selectedFile && (
                    <p className="mt-3 text-xs sm:text-sm font-semibold text-slate-700 break-all">
                      Selected: <span className="text-primary">{selectedFile.name}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {selectedFile && (
              <button
                onClick={handleUploadWithPrompt}
                disabled={uploading}
                className="btn-primary w-full mt-5 py-3.5 text-base sm:text-lg"
              >
                {uploading ? 'Processing Invoice...' : 'Process Invoice'}
              </button>
            )}

            {error && (
              <div className="mt-4 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-semibold">
                {error}
              </div>
            )}
          </div>

          <aside className="grid sm:grid-cols-2 xl:grid-cols-1 gap-4 items-stretch self-stretch">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 h-full flex flex-col">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Supported Files</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 font-medium flex-1 content-start">
                <span className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">PDF</span>
                <span className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">JPG</span>
                <span className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">PNG</span>
                <span className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">WebP</span>
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary to-secondary text-white rounded-2xl shadow-sm p-4 sm:p-5 h-full flex flex-col justify-between min-h-[160px]">
              <h3 className="text-sm font-bold uppercase tracking-wide mb-2">Pro Tip</h3>
              <p className="text-sm text-white/90 leading-relaxed">Use short prompts like invoice total, due date, vendor, and line items for more accurate extraction.</p>
            </div>
          </aside>
        </section>

        <section>
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Processed Invoices</h2>
              <p className="text-sm text-slate-600 mt-1">Quick access to previews, downloads, and deletions.</p>
            </div>
            <p className="text-sm font-semibold text-slate-500 whitespace-nowrap">{safeInvoices.length} total</p>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-600 font-semibold">
              Loading your invoices...
            </div>
          ) : safeInvoices.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <div className="text-4xl mb-3">📄</div>
              <p className="text-slate-700 font-semibold">No invoices yet</p>
              <p className="text-sm text-slate-500 mt-1">Your uploaded invoices will appear here.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {safeInvoices.map((invoice) => (
                <article key={invoice?.id || `${invoice?.original_filename || 'invoice'}-${invoice?.created_at || Math.random()}`} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col justify-between gap-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {formatInvoiceDate(invoice?.created_at)}
                      </p>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate mt-1">{invoice?.original_filename || 'Unnamed invoice'}</h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${getStatusBadgeClass(invoice?.status)}`}>
                      {getStatusText(invoice?.status)}
                    </span>
                  </div>

                  {invoice?.error_message && (
                    <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
                      {invoice.error_message}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {invoice?.status === 'completed' && (
                      <>
                        <button
                          onClick={() => handleDownloadHTML(invoice.id)}
                          className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => handlePreviewInvoice(invoice)}
                          className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-semibold hover:bg-slate-200 transition-colors"
                        >
                          Preview
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDeleteInvoice(invoice?.id)}
                      className="px-4 py-2 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {showPreview && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center" onClick={() => setShowPreview(false)}>
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-start sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Invoice Preview</p>
                <h3 className="text-lg sm:text-2xl font-black text-slate-900 truncate">{selectedInvoice.original_filename}</h3>
                <p className="text-sm text-slate-500 mt-1">{selectedInvoice.status === 'completed' ? 'Processed invoice output' : 'Invoice details'}</p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="shrink-0 w-10 h-10 rounded-xl bg-slate-100 text-slate-600 font-black hover:bg-slate-200 transition-colors"
                aria-label="Close preview"
              >
                ×
              </button>
            </div>

            <div className="grid lg:grid-cols-[320px_1fr] flex-1 min-h-0">
              <aside className="border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50 p-5 sm:p-6 overflow-auto">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-white border border-slate-200 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</p>
                    <p className={`mt-1 inline-flex px-3 py-1 rounded-full text-xs font-bold ${getStatusBadgeClass(selectedInvoice.status)}`}>
                      {getStatusText(selectedInvoice.status)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white border border-slate-200 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Created</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {formatInvoiceDate(selectedInvoice.created_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-white border border-slate-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Prompt</p>
                  <p className="mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedInvoice.user_prompt || 'No custom prompt was provided.'}
                  </p>
                </div>

                {selectedInvoice.error_message && (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-rose-700">Error</p>
                    <p className="mt-2 text-sm text-rose-700 leading-relaxed">{selectedInvoice.error_message}</p>
                  </div>
                )}
              </aside>

              <section className="min-h-0 flex flex-col">
                <div className="flex-1 min-h-0 overflow-auto bg-slate-100 p-3 sm:p-4">
                  {previewLoading ? (
                    <div className="h-full min-h-[60vh] flex items-center justify-center text-slate-600 font-semibold bg-white rounded-2xl border border-slate-200">
                      Loading preview...
                    </div>
                  ) : (
                    <iframe
                      srcDoc={previewHtml}
                      title="Invoice Preview"
                      className="w-full h-full min-h-[60vh] border border-slate-200 rounded-2xl bg-white shadow-sm"
                    />
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
