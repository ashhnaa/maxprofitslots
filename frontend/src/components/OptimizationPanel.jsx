import React from 'react';
import { Bot, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

function formatCurrency(val) {
  if (val === undefined || val === null) return '₹0';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

export default function OptimizationPanel({ slot, optimizationResult, loading }) {
  if (loading) {
    return (
      <div className="glass-card optimization-card">
        <div className="card-header">
          <Bot className="icon text-indigo spin-icon" size={22} />
          <h3>AI Profit Optimization Agent</h3>
        </div>
        <div className="analyzing-placeholder">
          <div className="spinner"></div>
          <p>Analyzing slot demand, business rules, & profit maximization matrix...</p>
        </div>
      </div>
    );
  }

  if (!slot && !optimizationResult) {
    return (
      <div className="glass-card optimization-card">
        <div className="card-header">
          <Bot className="icon text-indigo" size={22} />
          <h3>AI Profit Optimization Agent</h3>
        </div>
        <div className="analyzing-placeholder">
          <Sparkles size={32} className="text-indigo" />
          <p>Select any underutilized slot on the left to trigger the AI Agent.</p>
        </div>
      </div>
    );
  }

  const isDoNothing = optimizationResult?.recommended_action === 'DO_NOTHING';
  const histFill = (parseFloat(optimizationResult?.historical_fill_rate || slot?.historical_fill_rate || 0) * 100).toFixed(1);
  const mlProb = (parseFloat(optimizationResult?.natural_booking_probability || 0) * 100).toFixed(1);
  const recAction = optimizationResult?.recommended_action || 'DO_NOTHING';
  const expProfit = optimizationResult?.expected_profit || 0;
  const expRevenue = optimizationResult?.expected_revenue || 0;
  const actionCost = optimizationResult?.action_cost || 0;
  const reason = optimizationResult?.reason || 'Calculated optimal expected profit under arena policy rules.';

  return (
    <div className="glass-card optimization-card">
      <div className="card-header">
        <Bot className="icon text-indigo" size={22} />
        <h3>AI Agent Recommendation</h3>
      </div>

      <div className="slot-context-banner">
        <span>Slot #{slot?.slot_id || '—'} &bull; {slot?.arena_name || `Arena #${slot?.arena_id}`} &bull; {slot?.sport_type || 'Football'}</span>
        <span className="opp-badge">Base Price: {formatCurrency(slot?.base_price || 1200)}</span>
      </div>

      <div className={`ai-recommendation-box ${isDoNothing ? 'do-nothing' : ''}`}>
        <div className="rec-header">
          <span className="rec-tag">OPTIMAL ACTION</span>
          {isDoNothing && <span className="rec-tag text-amber"><AlertTriangle size={12} inline="true" /> High Natural Demand</span>}
        </div>

        <div className="rec-action-title">
          <CheckCircle2 size={24} className={isDoNothing ? 'text-amber' : 'text-emerald'} />
          <span>{recAction}</span>
        </div>

        <div className="rec-metrics-grid">
          <div className="metric-tile">
            <span>Hist. Fill Rate</span>
            <strong>{histFill}%</strong>
          </div>

          <div className="metric-tile">
            <span>ML P(Booking)</span>
            <strong className="text-indigo">{mlProb}%</strong>
          </div>

          <div className="metric-tile">
            <span>Expected Net Profit</span>
            <strong className="text-emerald">{formatCurrency(expProfit)}</strong>
          </div>
        </div>

        <div className="rec-reasoning">
          <strong>Agent Rationale:</strong> {reason}
        </div>
      </div>
    </div>
  );
}
