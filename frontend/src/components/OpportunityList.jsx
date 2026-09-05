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
          const isSelected = selectedSlotId === opp.slot_id;
          const fillRatePct = Math.round(parseFloat(opp.historical_fill_rate || 0) * 100);
          const score = (parseFloat(opp.opportunity_score || 0) * 100).toFixed(0);
          const dayName = opp.day_of_week !== undefined ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][opp.day_of_week] : 'Off-Peak';

          return (
            <div
              key={opp.slot_id || idx}
              className={`opp-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectOpportunity(opp)}
            >
              <div className="opp-main-info">
                <div className="opp-arena-row">
                  <span className="opp-arena-name">{opp.arena_name || `Arena #${opp.arena_id}`}</span>
                  <span className="opp-sport-badge">{opp.sport_type || 'Football'}</span>
                </div>

                <div className="opp-time-row">
                  <span><Clock size={12} inline="true" /> {dayName} &bull; {opp.start_time ? opp.start_time.substring(0, 5) : '14:00'} - {opp.end_time ? opp.end_time.substring(0, 5) : '15:00'}</span>
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
                <span className="opp-price-tag">{formatCurrency(opp.base_price || 1200)}</span>
                <button
                  className={`btn-analyze-ai ${isSelected ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectOpportunity(opp);
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
