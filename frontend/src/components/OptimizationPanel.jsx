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

  // Handle both camelCase and snake_case backend payloads
  const recAction = optimizationResult?.recommendedAction || optimizationResult?.recommended_action || 'DO_NOTHING';
  const isDoNothing = recAction === 'DO_NOTHING';

  // Format Historical Fill Rate
  let histFill = '0.0';
  if (optimizationResult?.historicalFillRate !== undefined) {
    const v = parseFloat(optimizationResult.historicalFillRate);
    histFill = v <= 1.0 && v > 0 ? (v * 100).toFixed(1) : v.toFixed(1);
  } else if (slot?.historicalFillRate !== undefined || slot?.historical_fill_rate !== undefined) {
    const v = parseFloat(slot.historicalFillRate || slot.historical_fill_rate);
    histFill = v <= 1.0 && v > 0 ? (v * 100).toFixed(1) : v.toFixed(1);
  }

  // Format ML Probability
  let mlProb = '0.0';
  if (optimizationResult?.bookingProbability !== undefined) {
    const v = parseFloat(optimizationResult.bookingProbability);
    mlProb = v <= 1.0 ? (v * 100).toFixed(1) : v.toFixed(1);
  } else if (optimizationResult?.natural_booking_probability !== undefined) {
    const v = parseFloat(optimizationResult.natural_booking_probability);
    mlProb = v <= 1.0 ? (v * 100).toFixed(1) : v.toFixed(1);
  }

  const expProfit = optimizationResult?.expectedProfit !== undefined 
    ? optimizationResult.expectedProfit 
    : (optimizationResult?.expected_profit || 0);

  const reason = optimizationResult?.reason || 'Calculated optimal expected profit under arena policy rules.';

  // Slot Metadata
  const slotObj = optimizationResult?.slot || slot;
  const slotId = slotObj?.id || slotObj?.slot_id || slot?.slot_id || '—';
  const arenaName = slotObj?.arenaName || slotObj?.arena_name || (slotObj?.arenaId ? `Arena #${slotObj.arenaId}` : (slotObj?.arena_id ? `Arena #${slotObj.arena_id}` : 'Arena'));
  const sportName = slotObj?.sport || slotObj?.sport_type || 'Football';
  const basePrice = slotObj?.normalPrice || slotObj?.normal_price || slotObj?.base_price || 1200;

  return (
    <div className="glass-card optimization-card">
      <div className="card-header">
        <Bot className="icon text-indigo" size={22} />
        <h3>AI Agent Recommendation</h3>
      </div>

      <div className="slot-context-banner">
        <span>Slot #{slotId} &bull; {arenaName} &bull; {sportName}</span>
        <span className="opp-badge">Base Price: {formatCurrency(basePrice)}</span>
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
