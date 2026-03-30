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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 relative overflow-hidden bg-scene-dashboard">
      {/* Animated background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl animate-float" style={{animation: 'float 12s ease-in-out infinite'}}></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-secondary/10 to-transparent rounded-full blur-3xl animate-float" style={{animation: 'float 14s ease-in-out infinite', animationDelay: '-3s'}}></div>
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-gradient-to-br from-pink-300/10 to-transparent rounded-full blur-3xl animate-morph" style={{animation: 'morph 10s ease-in-out infinite'}}></div>
      </div>

      {/* Header */}
      <header className="bg-gradient-to-r from-primary via-secondary to-purple-600 shadow-2xl sticky top-0 z-40 backdrop-blur-md bg-opacity-95 border-b-4 border-gradient-to-r border-primary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
          <div className="flex justify-between items-center">
            <div className="animate-fade-in-up">
              <h1 className="text-5xl font-black text-white mb-2 flex items-center gap-3">
                <span className="text-6xl animate-float" style={{animation: 'float 3s ease-in-out infinite'}}>📄</span>
                <span className="text-white drop-shadow-lg">Invoice Processor</span>
              </h1>
              <p className="text-white/90 text-sm font-bold uppercase tracking-widest">
                ✨ Welcome, <span className="text-white">{user?.full_name}</span>
              </p>
            </div>
            <button 
              onClick={logout} 
              className="bg-white/20 hover:bg-white/40 text-white px-8 py-3 rounded-2xl font-bold transition-all duration-300 backdrop-blur border-2 border-white/50 hover:shadow-2xl hover:shadow-white/20 hover:-translate-y-1 hover:scale-110 active:scale-95"
            >
              👋 Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {/* Upload Section */}
        <section className="mb-16 animate-fade-in-up" style={{animationDelay: '0.1s'}}>
          <div className="card p-10 shadow-2xl border-2 border-gradient-to-r from-primary/20 to-secondary/20 hover-3d relative overflow-hidden">
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" style={{pointerEvents: 'none'}}></div>
            
            <div className="mb-10 relative">
              <h2 className="section-header flex items-center gap-3">
                <span className="text-5xl animate-bounce-slow">🚀</span>
                <span>Process Invoice</span>
              </h2>
              <p className="text-gray-600 font-semibold text-lg">Enter custom instructions, upload your file, and watch AI work its magic</p>
            </div>

            {/* Prompt Input */}
            <div className="mb-10 animate-scale-in relative" style={{animationDelay: '0.2s'}}>
              <label htmlFor="userPrompt" className="form-label flex items-center gap-3">
                💬 Custom AI Instructions 
                <span className="text-xs bg-gradient-to-r from-primary to-secondary text-white px-4 py-2 rounded-full font-bold tracking-wide">Optional</span>
              </label>
              <textarea
                id="userPrompt"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="e.g., Extract only vendor information, focus on line items, extract payment terms, etc."
                rows="4"
                className="input-field resize-none hover-3d"
              />
              <p className="text-xs text-gray-600 mt-3 flex items-center gap-2 font-semibold">
                💡 <span>Leave blank to extract all information, or specify exactly what you need</span>
              </p>
            </div>

            {/* File Selection */}
            <div className="bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 rounded-3xl p-16 text-center mb-10 border-4 border-dashed border-primary/30 hover:border-primary/60 transition-all duration-300 animate-scale-in hover-3d relative overflow-hidden group" style={{animationDelay: '0.3s'}}>
              {/* Animated background */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23667eea\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}}></div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                disabled={uploading}
                className="hidden"
              />
              <div className="mb-6 relative">
                <div className="text-8xl mb-6 animate-float drop-shadow-lg" style={{animation: 'float 4s ease-in-out infinite'}}>📁</div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="btn-primary text-xl px-12 py-5 btn-ripple btn-glow relative"
                >
                  {uploading ? '⏳ Processing...' : '📂 Choose Invoice File'}
                </button>
              </div>
              {selectedFile && (
                <p className="text-gray-800 text-lg font-bold animate-slide-in-right relative">
                  ✅ Selected: <span className="text-primary font-black">{selectedFile.name}</span>
                </p>
              )}
            </div>

            {/* Upload Button */}
            {selectedFile && (
              <button
                onClick={handleUploadWithPrompt}
                disabled={uploading}
                className="btn-primary w-full py-5 text-2xl font-black shadow-2xl hover:shadow-3xl animate-scale-in btn-ripple btn-glow relative overflow-hidden group"
              >
                {uploading ? '⏳ Processing Invoice...' : '🎯 Process with Gemini AI'}
              </button>
            )}

            {error && (
              <div className="mt-8 p-6 bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500 text-red-700 text-lg rounded-2xl animate-scale-in shadow-lg flex items-center gap-4 font-semibold">
                <span className="text-4xl">⚠️</span>
                <span>{error}</span>
              </div>
            )}
          </div>
        </section>

        {/* Invoices Section */}
        <section className="animate-fade-in-up relative" style={{animationDelay: '0.2s'}}>
          <h2 className="section-header flex items-center gap-3">
            <span className="text-5xl animate-bounce-slow">📋</span>
            Your Processed Invoices
          </h2>

          {loading ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4 animate-bounce-slow">⏳</div>
              <p className="text-gray-600 font-medium">Loading your invoices...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-16 card p-12">
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-gray-600 font-medium mb-2">No invoices yet</p>
              <p className="text-gray-500 text-sm">Upload your first invoice above to get started with AI extraction!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {invoices.map((invoice, index) => (
                <div 
                  key={invoice.id} 
                  className="card p-6 hover:-translate-y-2 hover:shadow-2xl group animate-fade-in-up cursor-pointer"
                  style={{animationDelay: `${0.1 + index * 0.05}s`}}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-gray-800 flex-1 break-words group-hover:text-primary transition-colors duration-300">
                      📄 {invoice.original_filename}
                    </h3>
                    <span className={`ml-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 ${
                      invoice.status === 'completed' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 shadow-lg shadow-green-200/50' :
                      invoice.status === 'processing' ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 shadow-lg shadow-yellow-200/50 animate-pulse-gentle' :
                      invoice.status === 'failed' ? 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700 shadow-lg shadow-red-200/50' :
                      'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 shadow-lg shadow-blue-200/50'
                    }`}>
                      {invoice.status === 'completed' && '✅ Ready'}
                      {invoice.status === 'processing' && '⏳ Processing'}
                      {invoice.status === 'failed' && '❌ Failed'}
                      {invoice.status === 'pending' && '⏱️ Pending'}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 mb-4 flex items-center gap-2">
                    <span>📅</span>
                    {new Date(invoice.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>

                  {invoice.error_message && (
                    <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4 border-l-4 border-red-500">
                      {invoice.error_message}
                    </p>
                  )}

                  <div className="flex gap-3 flex-wrap">
                    {invoice.status === 'completed' && (
                      <>
                        <button
                          onClick={() => handlePreviewInvoice(invoice)}
                          className="flex-1 btn-primary text-sm py-3 font-semibold hover:shadow-lg transition-all duration-300"
                        >
                          👁️ Preview
                        </button>
                        <button
                          onClick={() => handleDownloadHTML(invoice.id)}
                          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-sm py-3 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-green-500/30 hover:-translate-y-0.5"
                        >
                          ⬇️ Download
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDeleteInvoice(invoice.id)}
                      className="flex-1 btn-danger text-sm py-3 font-semibold hover:shadow-lg transition-all duration-300"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
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
