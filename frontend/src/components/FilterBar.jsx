import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';

export default function FilterBar({
  arenas,
  sports,
  selectedArena,
  selectedSport,
  onArenaChange,
  onSportChange
}) {
  const handleReset = () => {
    onArenaChange('');
    onSportChange('');
  };

  return (
    <div className="glass-card filter-card">
      <div className="filter-bar-content">
        <div className="filter-title">
          <Filter size={18} className="text-indigo" />
          <span>Filters:</span>
        </div>

        <div className="filter-controls">
          <div className="filter-group">
            <label htmlFor="arena-select">Arena:</label>
            <select
              id="arena-select"
              className="filter-select"
              value={selectedArena || ''}
              onChange={(e) => onArenaChange(e.target.value)}
            >
              <option value="">All Arenas</option>
              {(arenas || []).map((a, idx) => {
                const arenaId = typeof a === 'object' ? (a.arena_id || a.id) : a;
                const arenaName = typeof a === 'object' ? (a.name || `Arena #${arenaId}`) : `Arena #${a}`;
                return (
                  <option key={idx} value={arenaId}>
                    {arenaName}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="sport-select">Sport:</label>
            <select
              id="sport-select"
              className="filter-select"
              value={selectedSport || ''}
              onChange={(e) => onSportChange(e.target.value)}
            >
              <option value="">All Sports</option>
              {(sports || []).map((s, idx) => {
                const sportName = typeof s === 'string' ? s : (s.sport_type || s.sport || `Sport #${idx}`);
                return (
                  <option key={idx} value={sportName}>
                    {sportName.charAt(0).toUpperCase() + sportName.slice(1)}
                  </option>
                );
              })}
            </select>
          </div>

          {(selectedArena || selectedSport) && (
            <button className="filter-reset-btn" onClick={handleReset}>
              <RotateCcw size={14} /> Reset Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
