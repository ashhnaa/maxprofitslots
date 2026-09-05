import React from 'react';
import { Sparkles, Clock, MapPin, Trophy, Flame } from 'lucide-react';

function formatCurrency(val) {
  if (val === undefined || val === null) return '₹0';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

export default function OpportunityList({
  opportunities,
  selectedSlotId,
  onSelectOpportunity,
  loading
}) {
  if (loading) {
    return (
      <div className="glass-card opp-card">
        <div className="panel-header">
          <div className="panel-title">
            <Flame className="text-amber" size={20} />
            <h3>Underutilized Off-Peak Opportunities</h3>
          </div>
        </div>
        <div className="analyzing-placeholder">
          <div className="spinner"></div>
          <p>Loading underutilized slot opportunities...</p>
        </div>
      </div>
    );
  }

  if (!opportunities || opportunities.length === 0) {
    return (
      <div className="glass-card opp-card">
        <div className="panel-header">
          <div className="panel-title">
            <Flame className="text-amber" size={20} />
            <h3>Underutilized Off-Peak Opportunities</h3>
          </div>
        </div>
        <div className="analyzing-placeholder">
          <p>No underutilized off-peak opportunities found for selected filters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card opp-card">
      <div className="panel-header">
        <div>
          <div className="panel-title">
            <Flame className="text-amber" size={20} />
            <h3>Underutilized Off-Peak Opportunities</h3>
          </div>
          <p className="panel-subtitle">
            Ranked by historical vacancy & potential profit lift. Click to optimize.
          </p>
        </div>
        <span className="opp-badge">{opportunities.length} Opportunities</span>
      </div>

      <div className="opp-scroll-container">
        {opportunities.map((opp, idx) => {
          const resolvedSlotId = opp.slot_id || opp.slotId || opp.id || (idx + 1);
          const isSelected = selectedSlotId === resolvedSlotId;
          const rawFill = parseFloat(opp.historical_fill_rate !== undefined ? opp.historical_fill_rate : (opp.historicalFillRate !== undefined ? opp.historicalFillRate : 0));
          const fillRatePct = rawFill <= 1.0 && rawFill > 0 ? (rawFill * 100).toFixed(1) : rawFill.toFixed(1);
          const rawScore = parseFloat(opp.opportunity_score !== undefined ? opp.opportunity_score : (opp.opportunityScore !== undefined ? opp.opportunityScore : 0));
          const score = rawScore <= 1.0 && rawScore > 0 ? (rawScore * 100).toFixed(0) : rawScore.toFixed(0);
          const dayName = opp.day_of_week !== undefined 
            ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][opp.day_of_week] 
            : (opp.dayOfWeek || 'Off-Peak');

          const normalizedOpp = {
            ...opp,
            slot_id: resolvedSlotId,
          };

          return (
            <div
              key={resolvedSlotId || idx}
              className={`opp-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectOpportunity(normalizedOpp)}
            >
              <div className="opp-main-info">
                <div className="opp-arena-row">
                  <span className="opp-arena-name">{opp.arena_name || opp.arena || `Arena #${opp.arena_id || opp.arenaId || 1}`}</span>
                  <span className="opp-sport-badge">{opp.sport_type || opp.sport || 'Football'}</span>
                </div>

                <div className="opp-time-row">
                  <span><Clock size={12} inline="true" /> {dayName} &bull; {opp.start_time || opp.time || '14:00'}</span>
                </div>

                <div className="opp-stats-row">
                  <span className="stat-pill">
                    Hist. Fill: <strong>{fillRatePct}%</strong>
                  </span>
                  <span className="stat-pill">
                    Score: <strong>{score}</strong>
                  </span>
                </div>
              </div>

              <div className="opp-right-actions">
                <span className="opp-price-tag">{formatCurrency(opp.base_price || opp.normalPrice || 1200)}</span>
                <button
                  className={`btn-analyze-ai ${isSelected ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectOpportunity(normalizedOpp);
                  }}
                >
                  <Sparkles size={13} style={{ marginRight: '4px' }} />
                  {isSelected ? 'Selected' : 'Analyze with AI'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
