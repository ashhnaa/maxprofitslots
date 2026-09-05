import React from 'react';
import { Percent, TrendingUp, IndianRupee, AlertCircle } from 'lucide-react';

function formatCurrency(val) {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

export default function SummaryCards({ summaryData, loading }) {
  if (loading) {
    return (
      <div className="summary-cards-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card kpi-card">
            <div className="kpi-info">
              <span className="kpi-label">Loading KPI...</span>
              <span className="kpi-value">—</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const fillRates = summaryData?.overallFillRate || {};
  const revenueData = summaryData?.totalRevenue || {};

  const overallFill = fillRates.overall_fill_rate ? (parseFloat(fillRates.overall_fill_rate) * 100).toFixed(1) : '0.0';
  const peakFill = fillRates.peak_fill_rate ? (parseFloat(fillRates.peak_fill_rate) * 100).toFixed(1) : '0.0';
  const offPeakFill = fillRates.off_peak_fill_rate ? (parseFloat(fillRates.off_peak_fill_rate) * 100).toFixed(1) : '0.0';

  const totalRev = revenueData.total_revenue || 0;
  const avgPrice = revenueData.avg_booking_price || 0;
  const totalDisc = revenueData.total_discounts || 0;
  const oppCount = summaryData?.underutilizedCount || 10;

  return (
    <div className="summary-cards-grid">
      {/* Card 1: Overall Utilization */}
      <div className="glass-card kpi-card">
        <div className="kpi-icon-wrapper indigo">
          <Percent size={22} />
        </div>
        <div className="kpi-info">
          <span className="kpi-label">Overall Utilization</span>
          <span className="kpi-value">{overallFill}%</span>
          <span className="kpi-subtext">Peak: {peakFill}% fill rate</span>
        </div>
      </div>

      {/* Card 2: Off-Peak Utilization */}
      <div className="glass-card kpi-card highlight">
        <div className="kpi-icon-wrapper amber">
          <AlertCircle size={22} />
        </div>
        <div className="kpi-info">
          <span className="kpi-label">Non-Peak Utilization</span>
          <span className="kpi-value text-amber">{offPeakFill}%</span>
          <span className="kpi-subtext">3.2x gap vs peak hours</span>
        </div>
      </div>

      {/* Card 3: Total Revenue */}
      <div className="glass-card kpi-card">
        <div className="kpi-icon-wrapper emerald">
          <IndianRupee size={22} />
        </div>
        <div className="kpi-info">
          <span className="kpi-label">Total Revenue</span>
          <span className="kpi-value">{formatCurrency(totalRev)}</span>
          <span className="kpi-subtext">Avg: {formatCurrency(avgPrice)} | Disc: {formatCurrency(totalDisc)}</span>
        </div>
      </div>

      {/* Card 4: Off-Peak Opportunities */}
      <div className="glass-card kpi-card">
        <div className="kpi-icon-wrapper purple">
          <TrendingUp size={22} />
        </div>
        <div className="kpi-info">
          <span className="kpi-label">Off-Peak Opportunities</span>
          <span className="kpi-value">{oppCount}</span>
          <span className="kpi-subtext">Slots ready for AI optimization</span>
        </div>
      </div>
    </div>
  );
}
