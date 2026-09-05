import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Cpu, CheckCircle } from 'lucide-react';

export default function DecisionTrace({ trace }) {
  const [expanded, setExpanded] = useState(true);

  if (!trace || trace.length === 0) return null;

  return (
    <div className="glass-card trace-card">
      <div className="card-header" onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
        <Cpu className="icon text-indigo" size={20} />
        <h3>How the AI Decided (Agent Execution Trace)</h3>
        <span className="opp-badge">{trace.length} Steps</span>
        <div style={{ marginLeft: 'auto' }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {expanded && (
        <div className="trace-steps-container">
          {trace.map((step, idx) => (
            <div key={idx} className="trace-step">
              <span className="step-num">{idx + 1}</span>
              <div className="step-body">
                <span className="step-name">{step.stage || step.step || `Step ${idx + 1}`}</span>
                <span className="step-desc">{step.description || step.details || step}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
