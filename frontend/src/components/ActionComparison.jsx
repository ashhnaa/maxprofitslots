import React from 'react';
import { Check, ShieldAlert, Award } from 'lucide-react';

function formatCurrency(val) {
  if (val === undefined || val === null || val < 0) return '—';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

export default function ActionComparison({ actions, recommendedAction }) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="glass-card action-comp-card">
      <div className="card-header">
        <Award className="icon text-amber" size={20} />
        <h3>Candidate Action Profitability Matrix</h3>
      </div>
      <p className="card-subtitle">
        Evaluating expected net profit across candidate actions under arena policy rules.
      </p>

      <div className="matrix-table-wrapper">
        <table className="matrix-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Status</th>
              <th>P(Booking)</th>
              <th>Discount %</th>
              <th>Final Price</th>
              <th>Exp Revenue</th>
              <th>Cost</th>
              <th>Expected Profit</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((act, idx) => {
              const actionName = act.action_name || act.action || `Action ${idx}`;
              const isRecommended = actionName === recommendedAction && (act.is_valid !== false);
              const isValid = act.is_valid !== false;
              const probPct = isValid && act.booking_probability !== undefined 
                ? `${(parseFloat(act.booking_probability) * 100).toFixed(1)}%` 
                : '—';

              return (
                <tr
                  key={actionName}
                  className={isRecommended ? 'recommended-row' : ''}
                >
                  <td>
                    <strong>{actionName}</strong>
                  </td>

                  <td>
                    {isRecommended ? (
                      <span className="rec-check-badge">
                        <Check size={12} /> RECOMMENDED
                      </span>
                    ) : isValid ? (
                      <span className="opp-badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'none' }}>
                        Valid
                      </span>
                    ) : (
                      <span className="opp-badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                        <ShieldAlert size={12} inline="true" /> Prohibited
                      </span>
                    )}
                  </td>

                  <td>{probPct}</td>
                  <td>{act.discount_pct || act.discount_percentage || 0}%</td>
                  <td>{formatCurrency(act.final_price || act.finalPrice)}</td>
                  <td>{formatCurrency(act.expected_revenue || act.expectedRevenue)}</td>
                  <td>{formatCurrency(act.action_cost || act.actionCost)}</td>

                  <td>
                    {isValid ? (
                      <strong className={isRecommended ? 'text-emerald' : ''}>
                        {formatCurrency(act.expected_profit || act.expectedProfit)}
                      </strong>
                    ) : (
                      <span className="text-muted" title={act.invalidation_reason}>
                        Invalid ({act.invalidation_reason || 'Disallowed'})
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
