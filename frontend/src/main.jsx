import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unexpected error' };
  }

  componentDidCatch(error, info) {
    console.error('[RootErrorBoundary] Runtime crash:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', background: '#f8fafc', color: '#0f172a' }}>
          <div style={{ maxWidth: '680px', width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>Frontend runtime error</h1>
            <p style={{ marginTop: '10px', marginBottom: '14px', color: '#334155' }}>The app crashed while rendering. Reload once. If this persists, share this error text.</p>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, padding: '12px', borderRadius: '10px', background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#b91c1c', fontSize: '13px' }}>
              {this.state.message}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
);
