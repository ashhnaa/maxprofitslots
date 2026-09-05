import React, { useState } from 'react';
import { Activity, ShieldCheck, Zap } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function DashboardHeader() {
  const [backendStatus, setBackendStatus] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const checkHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`);
      if (res.ok) {
        const data = await res.json();
        setBackendStatus(data);
      } else {
        setBackendStatus({ status: 'ERROR', message: 'Backend unhealthy' });
      }
    } catch (err) {
      setBackendStatus({ status: 'ERROR', message: 'Failed to connect' });
    } finally {
      setLoadingHealth(false);
    }
  };

  return (
    <header className="header-card glass-card">
      <div className="header-title-group">
        <div className="header-icon-badge">
          <Zap size={24} />
        </div>
        <div>
          <h1 className="header-title">SPORTS TURF PROFIT OPTIMIZER</h1>
          <p className="header-subtitle">
            AI-driven profit optimization & off-peak utilization for sports turf owners
          </p>
        </div>
      </div>

      <div className="header-right">
        <div className="provider-badge">
          <span className="dot-pulse"></span>
          <span>Booking Provider: <strong>Demo (PostgreSQL)</strong></span>
        </div>

        <button 
          className="health-btn" 
          onClick={checkHealth} 
          disabled={loadingHealth}
          title="Check Backend API Health"
        >
          {loadingHealth ? (
            <Activity className="spin-icon" size={16} />
          ) : (
            <ShieldCheck size={16} />
          )}
          <span>{backendStatus?.status === 'OK' ? 'Backend Online ✅' : 'Check Health'}</span>
        </button>
      </div>
    </header>
  );
}
