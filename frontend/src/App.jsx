import React, { useState } from 'react';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function App() {
  const [backendStatus, setBackendStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkBackendHealth = async () => {
    setLoading(true);
    setError(null);
    setBackendStatus(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }
      const data = await response.json();
      setBackendStatus(data);
    } catch (err) {
      setError(err.message || 'Failed to connect to backend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-container">
      <section className="hero-card">
        <div className="logo-badge">
          <span>⚽ Turf Analytics</span>
        </div>

        <h1 className="title">SPORTS TURF PROFIT OPTIMIZER</h1>
        <p className="subtitle">AI-powered off-peak turf utilization and profit optimization</p>

        <div className="stage-card">
          <span className="stage-label">Current Stage</span>
          <span className="stage-value">
            <span className="stage-pulse"></span>
            Project initialization
          </span>
        </div>

        <div className="action-section">
          <button
            id="btn-check-backend"
            className="btn-check-backend"
            onClick={checkBackendHealth}
            disabled={loading}
          >
            {loading ? 'Checking...' : 'Check Backend'}
          </button>

          {backendStatus && (
            <div className="status-result success">
              <div className="result-header">
                <span>Status: {backendStatus.status}</span>
                <span>✅ Connected</span>
              </div>
              <p className="result-message">{backendStatus.message}</p>
            </div>
          )}

          {error && (
            <div className="status-result error">
              <div className="result-header">
                <span>Connection Error</span>
                <span>❌ Failed</span>
              </div>
              <p className="result-message">{error}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
