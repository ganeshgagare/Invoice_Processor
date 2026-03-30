import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { invoiceAPI } from '../services/api';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  console.log('[Dashboard] Mounted - user:', user);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      console.log('[Dashboard] Loading invoices...');
      const response = await invoiceAPI.listInvoices();
      console.log('[Dashboard] Invoices loaded:', response.data);
      setInvoices(response.data.invoices || []);
    } catch (err) {
      console.error('[Dashboard] Failed to load invoices:', err);
      setError('Failed to load invoices: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    console.log('[Dashboard] useEffect - loading invoices');
    loadInvoices();
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      console.log('[Dashboard] File selected:', file.name);
    }
  };

  const handleUploadWithPrompt = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    setUploading(true);
    console.log('[Dashboard] Starting upload with prompt:', userPrompt);
    
    try {
      const response = await invoiceAPI.uploadInvoice(selectedFile, userPrompt);
      if (response.data.status === 'completed') {
        alert('✅ Invoice processed successfully!');
        setUserPrompt('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadInvoices();
      } else {
        alert('⚠️ Invoice processing failed: ' + response.data.message);
      }
    } catch (err) {
      console.error('[Dashboard] Upload error:', err);
      alert('Error uploading invoice: ' + (err.response?.data?.detail || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = (e) => {
    handleFileSelect(e);
  };

  const handlePreviewInvoice = async (invoice) => {
    setSelectedInvoice(invoice);
    setShowPreview(true);
  };

  const handleDeleteInvoice = async (id) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await invoiceAPI.deleteInvoice(id);
        loadInvoices();
      } catch (err) {
        alert('Error deleting invoice: ' + (err.response?.data?.detail || err.message));
      }
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

  return (
    <div className="min-h-screen bg-slate-50 bg-scene-dashboard relative overflow-hidden">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center text-lg shadow-md">📄</div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">Invoice Processor</h1>
              <p className="text-xs sm:text-sm text-slate-500">Automated extraction workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">User</span>
              <span className="text-sm font-semibold text-slate-800">{user?.full_name}</span>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <section className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Upload New Invoice</h2>
              <p className="text-slate-600 mt-2">Upload a document and optionally provide extraction instructions.</p>
            </div>

            <div className="mb-6">
              <label htmlFor="userPrompt" className="block mb-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
                Custom Instructions <span className="ml-2 text-xs font-semibold text-slate-500 normal-case">Optional</span>
              </label>
              <textarea
                id="userPrompt"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Example: focus on invoice total, vendor name, due date, and line items."
                rows="4"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-none"
              />
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 sm:p-10 text-center bg-slate-50">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                disabled={uploading}
                className="hidden"
              />
              <div className="text-5xl mb-3">📁</div>
              <p className="text-slate-700 font-semibold mb-4">Drop a file or choose manually</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="btn-primary px-7 py-3 text-base"
              >
                {uploading ? 'Processing...' : 'Choose Invoice File'}
              </button>

              {selectedFile && (
                <p className="mt-4 text-sm font-semibold text-slate-700">
                  Selected: <span className="text-primary">{selectedFile.name}</span>
                </p>
              )}
            </div>

            {selectedFile && (
              <button
                onClick={handleUploadWithPrompt}
                disabled={uploading}
                className="btn-primary w-full mt-6 py-4 text-lg"
              >
                {uploading ? 'Processing Invoice...' : 'Process with Gemini AI'}
              </button>
            )}

            {error && (
              <div className="mt-5 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-semibold">
                {error}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Today</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{invoices.length}</p>
              <p className="text-sm text-slate-600">Invoices in your workspace</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Supported Files</h3>
              <ul className="space-y-2 text-sm text-slate-600 font-medium">
                <li>PDF documents</li>
                <li>JPG and JPEG images</li>
                <li>PNG and WebP images</li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-primary to-secondary text-white rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-bold uppercase tracking-wide mb-2">Pro Tip</h3>
              <p className="text-sm text-white/90">Use short, specific prompts to improve extraction quality and consistency.</p>
            </div>
          </aside>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Processed Invoices</h2>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-600 font-semibold">
              Loading your invoices...
            </div>
          ) : invoices.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <div className="text-4xl mb-3">📄</div>
              <p className="text-slate-700 font-semibold">No invoices yet</p>
              <p className="text-sm text-slate-500 mt-1">Your uploaded invoices will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <article key={invoice.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-500">{new Date(invoice.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</p>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate mt-1">{invoice.original_filename}</h3>
                      {invoice.error_message && (
                        <p className="mt-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
                          {invoice.error_message}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold w-fit ${getStatusBadgeClass(invoice.status)}`}>
                        {getStatusText(invoice.status)}
                      </span>

                      <div className="flex gap-2 flex-wrap sm:justify-end">
                        {invoice.status === 'completed' && (
                          <>
                            <button
                              onClick={() => handlePreviewInvoice(invoice)}
                              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-semibold hover:bg-slate-200 transition-colors"
                            >
                              Preview
                            </button>
                            <button
                              onClick={() => handleDownloadHTML(invoice.id)}
                              className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
                            >
                              Download
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          className="px-4 py-2 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {showPreview && selectedInvoice && (
        <InvoicePreview
          invoice={selectedInvoice}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};

const InvoicePreview = ({ invoice, onClose }) => {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const loadHTML = async () => {
      try {
        const response = await invoiceAPI.getInvoiceHTML(invoice.id);
        setHtml(response.data.html);
      } catch (err) {
        console.error('Error loading HTML:', err);
        setHtml('<p>Error loading invoice preview</p>');
      } finally {
        setLoading(false);
      }
    };
    loadHTML();
  }, [invoice.id]);

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-up"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-8 bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-gray-200 rounded-t-2xl">
          <h2 className="text-2xl font-bold gradient-text flex items-center gap-3">
            <span className="text-3xl">📄</span>
            Invoice Preview
          </h2>
          <button 
            onClick={onClose} 
            className="text-3xl text-gray-600 hover:text-red-500 hover:scale-110 transition-all duration-300 p-2 hover:bg-red-50 rounded-lg"
          >
            ✕
          </button>
        </div>
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce-slow">📄</div>
              <p className="text-gray-600 font-medium">Loading preview...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-6 bg-gray-50">
            <iframe
              srcDoc={html}
              title="Invoice Preview"
              className="w-full h-full border-0 rounded-lg"
              style={{ minHeight: '500px' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
