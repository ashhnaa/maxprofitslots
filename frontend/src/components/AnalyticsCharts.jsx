import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { BarChart3, PieChart as PieIcon, Clock } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AnalyticsCharts({ analyticsData, sportBreakdown }) {
  if (!analyticsData) return null;

  // Prepare Peak vs Non-Peak Data
  const peakVsNonPeakData = [
    {
      category: 'Peak Hours',
      fillRate: analyticsData.overallFillRate ? Math.round(analyticsData.overallFillRate.peak_fill_rate * 100) : 0,
      utilization: analyticsData.utilizationByPeakStatus ? (analyticsData.utilizationByPeakStatus.peak ? Math.round(analyticsData.utilizationByPeakStatus.peak.fill_rate * 100) : 0) : 0
    },
    {
      category: 'Non-Peak Hours',
      fillRate: analyticsData.overallFillRate ? Math.round(analyticsData.overallFillRate.off_peak_fill_rate * 100) : 0,
      utilization: analyticsData.utilizationByPeakStatus ? (analyticsData.utilizationByPeakStatus.off_peak ? Math.round(analyticsData.utilizationByPeakStatus.off_peak.fill_rate * 100) : 0) : 0
    }
  ];

  // Prepare Sport Utilization Data
  const sportData = (sportBreakdown || []).map(item => ({
    name: item.sport_type ? (item.sport_type.charAt(0).toUpperCase() + item.sport_type.slice(1)) : 'Unknown',
    fillRate: Math.round(parseFloat(item.fill_rate || 0) * 100),
    totalSlots: parseInt(item.total_slots || 0, 10),
    bookedSlots: parseInt(item.booked_slots || 0, 10)
  }));

  // Prepare Time of Day Data if available
  const timeOfDayData = (analyticsData.utilizationByTimeOfDay || []).map(item => ({
    hour: `${item.hour_of_day}:00`,
    fillRate: Math.round(parseFloat(item.fill_rate || 0) * 100)
  }));

  return (
    <div className="analytics-charts-grid">
      {/* Chart 1: Peak vs Non-Peak Occupancy */}
      <div className="glass-card chart-card">
        <div className="card-header">
          <BarChart3 className="icon text-indigo" />
          <h3>Peak vs Non-Peak Utilization</h3>
        </div>
        <p className="card-subtitle">Comparing booking rates during high-demand vs off-peak hours</p>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={peakVsNonPeakData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
              <XAxis dataKey="category" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" unit="%" domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                formatter={(value) => [`${value}%`, 'Utilization Rate']}
              />
              <Bar dataKey="fillRate" name="Fill Rate %" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Sport Utilization */}
      <div className="glass-card chart-card">
        <div className="card-header">
          <PieIcon className="icon text-emerald" />
          <h3>Utilization by Sport Type</h3>
        </div>
        <p className="card-subtitle">Off-peak booking performance breakdown across sports</p>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={sportData} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
              <XAxis type="number" stroke="#94a3b8" unit="%" domain={[0, 100]} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                formatter={(value) => [`${value}%`, 'Fill Rate']}
              />
              <Bar dataKey="fillRate" name="Fill Rate %" fill="#10b981" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 3: Time of Day Demand Profile (if available) */}
      {timeOfDayData.length > 0 && (
        <div className="glass-card chart-card full-width">
          <div className="card-header">
            <Clock className="icon text-amber" />
            <h3>Hourly Demand Profile</h3>
          </div>
          <p className="card-subtitle">Historical booking density across 24 hours of the day</p>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={timeOfDayData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                <XAxis dataKey="hour" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" unit="%" domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                  formatter={(value) => [`${value}%`, 'Demand Density']}
                />
                <Bar dataKey="fillRate" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
