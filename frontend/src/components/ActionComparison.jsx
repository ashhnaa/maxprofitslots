import React from 'react';
import { Check, ShieldAlert, Award } from 'lucide-react';

function formatCurrency(val) {
  if (val === undefined || val === null || isNaN(val) || val < -900000) return '—';
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
              const actionName = act.action || act.action_name || `Action ${idx}`;
              const isValid = act.isValid !== undefined ? act.isValid : (act.is_valid !== false);
              const isRecommended = actionName === recommendedAction && isValid;

              const rawProb = act.bookingProbability !== undefined ? act.bookingProbability : act.booking_probability;
              const probPct = isValid && rawProb !== undefined ? `${(parseFloat(rawProb) * 100).toFixed(1)}%` : '—';

              const discountPct = act.discountPercentage !== undefined ? act.discountPercentage : (act.discount_pct || act.discount_percentage || 0);
              const finalPrice = act.finalPrice !== undefined ? act.finalPrice : (act.final_price || 0);
              const expRevenue = act.expectedRevenue !== undefined ? act.expectedRevenue : (act.expected_revenue || 0);
              const actionCost = act.actionCost !== undefined ? act.actionCost : (act.action_cost || 0);
              const expProfit = act.expectedProfit !== undefined ? act.expectedProfit : (act.expected_profit || 0);
              const invalidReason = act.invalidationReason || act.invalidation_reason || 'Prohibited by Policy';

              return (
                <tr
                  key={actionName}
                  className={isRecommended ? 'recommended-row' : ''}
                >
                  <td>
                    <strong>{act.label || actionName}</strong>
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
                      <span className="opp-badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }} title={invalidReason}>
                        <ShieldAlert size={12} inline="true" /> Prohibited
                      </span>
                    )}
                  </td>

                  <td>{probPct}</td>
                  <td>{discountPct}%</td>
                  <td>{formatCurrency(finalPrice)}</td>
                  <td>{formatCurrency(expRevenue)}</td>
                  <td>{formatCurrency(actionCost)}</td>

                  <td>
                    {isValid ? (
                      <strong className={isRecommended ? 'text-emerald' : ''}>
                        {formatCurrency(expProfit)}
                      </strong>
                    ) : (
                      <span className="text-muted" title={invalidReason} style={{ fontSize: '0.75rem' }}>
                        {invalidReason.length > 40 ? `${invalidReason.substring(0, 40)}...` : invalidReason}
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
