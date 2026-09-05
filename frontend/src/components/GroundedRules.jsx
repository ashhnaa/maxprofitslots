import React from 'react';
import { BookOpen, ShieldCheck, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';

export default function GroundedRules({ grounding, rules }) {
  if (!grounding && !rules) return null;

  const policySource = grounding?.policySource || rules?.policySource || 'Standard Arena Policy';
  const isGrounded = grounding?.isGroundedPolicy !== false;
  const rulesUsed = grounding?.rulesUsed || [];
  const rejectedActions = grounding?.rejectedActions || [];

  return (
    <div className="glass-card grounding-card">
      <div className="card-header flex-between">
        <div className="card-title-group">
          <BookOpen className="icon text-indigo" size={22} />
          <h3>Grounded Business Rules & Policies</h3>
        </div>

        <div className="policy-source-badge">
          <FileText size={13} style={{ marginRight: '4px' }} />
          <span>Source: <strong>{policySource}</strong></span>
        </div>
      </div>

      <p className="card-subtitle">
        Agent decisions are grounded in arena-specific operating rules retrieved from local policy documents.
      </p>

      {/* Grounded Rules Bullet Points */}
      <div className="grounding-rules-list">
        {rulesUsed.length > 0 ? (
          rulesUsed.slice(0, 4).map((item, idx) => (
            <div key={idx} className="grounding-rule-item">
              <CheckCircle2 size={15} className="text-emerald flex-shrink-0" style={{ marginTop: '2px' }} />
              <div className="rule-text-group">
                <span className="rule-content">{item.rule}</span>
                <span className="rule-citation">
                  Section: <em>{item.section}</em> &bull; Source: {item.source}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="grounding-rule-item">
            <ShieldCheck size={15} className="text-indigo" />
            <div className="rule-text-group">
              <span className="rule-content">
                Max Discount: {rules?.maxDiscountPercentage || 20}% &bull; Peak Discounts Allowed: {rules?.allowPeakDiscounts ? 'Yes' : 'No'}
              </span>
              <span className="rule-citation">Source: {policySource}</span>
            </div>
          </div>
        )}
      </div>

      {/* Rejected Actions Display */}
      {rejectedActions.length > 0 && (
        <div className="rejected-actions-box">
          <div className="rejected-header">
            <ShieldAlert size={16} className="text-rose" />
            <strong>Candidate Actions Prohibited by Grounded Policy</strong>
          </div>

          <div className="rejected-list">
            {rejectedActions.map((rej, idx) => (
              <div key={idx} className="rejected-item">
                <span className="rejected-action-badge">{rej.label || rej.action}</span>
                <span className="rejected-reason">{rej.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
