import React, { useState, useEffect } from 'react';
import DashboardHeader from './components/DashboardHeader';
import FilterBar from './components/FilterBar';
import SummaryCards from './components/SummaryCards';
import OpportunityList from './components/OpportunityList';
import OptimizationPanel from './components/OptimizationPanel';
import GroundedRules from './components/GroundedRules';
import TargetCustomers from './components/TargetCustomers';
import ActionComparison from './components/ActionComparison';
import DecisionTrace from './components/DecisionTrace';
import AnalyticsCharts from './components/AnalyticsCharts';
import {
  fetchArenas,
  fetchSports,
  fetchSummary,
  fetchOpportunities,
  fetchAnalytics,
  fetchSportBreakdown,
  optimizeSlot
} from './services/api';
import './App.css';

function App() {
  // Filter States
  const [arenas, setArenas] = useState([]);
  const [sports, setSports] = useState([]);
  const [selectedArena, setSelectedArena] = useState('');
  const [selectedSport, setSelectedSport] = useState('');

  // Data States
  const [summaryData, setSummaryData] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [sportBreakdown, setSportBreakdown] = useState([]);

  // Optimization States
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [optimizationResult, setOptimizationResult] = useState(null);

  // Loading & Error States
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [analyzingSlot, setAnalyzingSlot] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Initial Filter Load
  useEffect(() => {
    async function loadInitialFilters() {
      setLoadingFilters(true);
      try {
        const [arenaList, sportList] = await Promise.all([
          fetchArenas(),
          fetchSports()
        ]);
        setArenas(arenaList);
        setSports(sportList);
      } catch (err) {
        console.error('Failed to load filter metadata:', err);
        setErrorMessage('Failed to load initial metadata.');
      } finally {
        setLoadingFilters(false);
      }
    }
    loadInitialFilters();
  }, []);

  // Main Data Load whenever filters change
  useEffect(() => {
    async function loadDashboardData() {
      setLoadingData(true);
      setErrorMessage(null);
      try {
        const [summary, opps, analytics, breakdown] = await Promise.all([
          fetchSummary(selectedArena, selectedSport),
          fetchOpportunities(selectedArena, selectedSport),
          fetchAnalytics(selectedArena, selectedSport),
          fetchSportBreakdown(selectedArena)
        ]);

        setSummaryData(summary);
        setOpportunities(opps);
        setAnalyticsData(analytics);
        setSportBreakdown(breakdown);

        // Auto-select first opportunity if none selected or current selection missing
        if (opps && opps.length > 0 && !selectedSlot) {
          handleSelectOpportunity(opps[0]);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setErrorMessage('Error fetching analytics & opportunities data.');
      } finally {
        setLoadingData(false);
      }
    }
    loadDashboardData();
  }, [selectedArena, selectedSport]);

  // Handle Opportunity Selection & Run AI Agent Optimization
  const handleSelectOpportunity = async (opp) => {
    const slotId = opp.slot_id || opp.slotId || opp.id || 1;
    setSelectedSlot({ ...opp, slot_id: slotId });
    setAnalyzingSlot(true);
    setOptimizationResult(null);
    try {
      const result = await optimizeSlot(slotId);
      setOptimizationResult(result);
    } catch (err) {
      console.error('Failed to optimize slot:', err);
      setErrorMessage('AI Agent failed to analyze the selected slot.');
    } finally {
      setAnalyzingSlot(false);
    }
  };

  const recommendedAction = optimizationResult?.recommendedAction || optimizationResult?.recommended_action;
  const actionsList = optimizationResult?.actions || optimizationResult?.action_evaluations;
  const agentTrace = optimizationResult?.trace || optimizationResult?.agent_trace;
  const targetCustomers = optimizationResult?.targetCustomers || [];
  const grounding = optimizationResult?.grounding;
  const rules = optimizationResult?.rules;

  return (
    <div className="app-container dark-theme">
      <div className="content-wrapper">
        <DashboardHeader />

        <FilterBar
          arenas={arenas}
          sports={sports}
          selectedArena={selectedArena}
          selectedSport={selectedSport}
          onArenaChange={setSelectedArena}
          onSportChange={setSelectedSport}
        />

        {errorMessage && (
          <div className="error-banner">
            <span>⚠️ {errorMessage}</span>
            <button onClick={() => setErrorMessage(null)}>Dismiss</button>
          </div>
        )}

        {/* Top Summary KPI Cards */}
        <SummaryCards summaryData={summaryData} loading={loadingData} />

        {/* Main Grid: Left = Underutilized Opportunities, Right = AI Profit Agent */}
        <div className="dashboard-grid">
          <section className="left-panel">
            <OpportunityList
              opportunities={opportunities}
              selectedSlotId={selectedSlot?.slot_id}
              onSelectOpportunity={handleSelectOpportunity}
              loading={loadingData}
            />
          </section>

          <section className="right-panel">
            <OptimizationPanel
              slot={selectedSlot}
              optimizationResult={optimizationResult}
              loading={analyzingSlot}
            />

            {optimizationResult && (
              <>
                <GroundedRules
                  grounding={grounding}
                  rules={rules}
                />

                <TargetCustomers
                  slot={selectedSlot}
                  customers={targetCustomers}
                  recommendedAction={recommendedAction}
                />

                <ActionComparison
                  actions={actionsList}
                  recommendedAction={recommendedAction}
                />

                <DecisionTrace
                  trace={agentTrace}
                />
              </>
            )}
          </section>
        </div>

        {/* Bottom Section: Analytics & Occupancy Charts */}
        <section className="analytics-section">
          <h2 className="section-title">
            <span>📊</span> Analytics & Utilization Insights
          </h2>
          <AnalyticsCharts
            analyticsData={analyticsData}
            sportBreakdown={sportBreakdown}
          />
        </section>

        <footer className="dashboard-footer">
          <p>
            ⚡ <strong>Sports Turf Profit Optimizer</strong> &bull; AI Agent Decision System &bull; Active Provider: Demo Provider
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
