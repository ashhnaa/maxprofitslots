import React, { useState } from 'react';
import { Target, Send, CheckCircle, Info, Sparkles } from 'lucide-react';
import { simulateNotification } from '../services/api';

export default function TargetCustomers({ slot, customers, recommendedAction }) {
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  if (recommendedAction !== 'TARGETED_NOTIFICATION') {
    return null;
  }

  const handleSimulate = async () => {
    if (!slot || !customers || customers.length === 0) return;
    setSimulating(true);
    setSimulationResult(null);

    try {
      const customerIds = customers.map((c) => c.customerId);
      const res = await simulateNotification(slot.id || slot.slot_id, customerIds);
      setSimulationResult(res);
    } catch (err) {
      console.error('Failed to simulate notification:', err);
    } finally {
      setSimulating(false);
    }
  };

  const hasTargets = customers && customers.length > 0;

  return (
    <div className="glass-card target-customers-card">
      <div className="card-header flex-between">
        <div>
          <div className="card-title-group">
            <Target className="icon text-indigo" size={22} />
            <h3>Target Customers</h3>
          </div>
          <p className="card-subtitle">
            Customers with highest booking probability for this vacant slot based on historical behavior.
          </p>
        </div>

        {hasTargets && (
          <button
            className="btn-simulate-notif"
            onClick={handleSimulate}
            disabled={simulating}
          >
            <Send size={14} style={{ marginRight: '6px' }} />
            {simulating ? 'Simulating...' : 'Simulate Notification'}
          </button>
        )}
      </div>

      {simulationResult && (
        <div className="simulation-banner">
          <div className="sim-banner-header">
            <CheckCircle size={16} className="text-emerald" />
            <strong>Notification Simulation Output (Demonstration Only)</strong>
          </div>
          <p className="sim-banner-msg">{simulationResult.message}</p>
          <span className="sim-banner-tag">Status: {simulationResult.notificationStatus} &bull; Gateway: None</span>
        </div>
      )}

      {!hasTargets ? (
        <div className="analyzing-placeholder">
          <Info className="text-amber" size={24} />
          <p>No eligible historical target customers found for this slot parameters.</p>
        </div>
      ) : (
        <div className="target-table-wrapper">
          <table className="target-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Target Score</th>
                <th>Historical Behavior & Reasons</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((cust) => {
                const score = cust.targetScore;
                let badgeClass = 'score-high';
                if (score < 70) badgeClass = 'score-medium';
                if (score < 50) badgeClass = 'score-low';

                return (
                  <tr key={cust.customerId}>
                    <td className="cust-name-cell">
                      <strong>{cust.name}</strong>
                      <span className="cust-meta">Customer #{cust.customerId}</span>
                    </td>
                    <td>
                      <div className={`score-badge ${badgeClass}`}>
                        <Sparkles size={12} style={{ marginRight: '4px' }} />
                        <span>{score} / 100</span>
                      </div>
                    </td>
                    <td>
                      <div className="reasons-pill-list">
                        {(cust.reasons || []).map((reason, idx) => (
                          <span key={idx} className="reason-pill">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
