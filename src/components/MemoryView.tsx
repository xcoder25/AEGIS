/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Database, Search, CheckCircle2, XCircle, Sliders, Brain, RefreshCw } from 'lucide-react';
import { useTradingStore } from '../store';

export default function MemoryView() {
  const { memories, addNotification } = useTradingStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'win' | 'loss'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search filter matches: symbol OR strategy OR regime match
  const filteredMemories = useMemo(() => {
    return memories.filter(m => {
      const matchesSearch = 
        m.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.strategy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.regime.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = typeFilter === 'all' || m.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [memories, searchQuery, typeFilter]);

  const handleRefreshRAG = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      addNotification("RAG Database Synchronization completed. 4 active vectors synced.", 'info');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            <span>AI Copilot RAG Memory database</span>
          </h2>
          <p className="text-[11px] text-slate-500 font-sans">
            Retrospective vector indexes containing historical setups, trade journals and macro cluster regimes
          </p>
        </div>

        <button
          id="btn-sync-rag-vector"
          onClick={handleRefreshRAG}
          disabled={isRefreshing}
          className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs font-semibold py-2 px-3.5 rounded-lg text-slate-300 hover:text-white transition-all flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          <span>{isRefreshing ? 'Re-building index' : 'Sync Vectors'}</span>
        </button>
      </div>

      {/* Database Search Hub Controls */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Query Bar */}
          <div className="relative w-full md:flex-1">
            <Search className="w-4 h-4 text-slate-505 absolute left-3 top-3" />
            <input
              id="rag-search-input"
              type="text"
              placeholder="Search vector database by symbol, strategy, or market regime..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 text-xs text-slate-100 pl-9 pr-4 py-3 rounded-xl border border-slate-850 focus:outline-none focus:border-slate-700"
            />
          </div>

          {/* Type filters */}
          <div className="flex gap-1 bg-slate-950 p-1 border border-slate-850 rounded-lg text-xs font-mono w-full md:w-auto justify-center">
            {(['all', 'win', 'loss'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setTypeFilter(filter)}
                className={`px-3 py-1.5 rounded uppercase font-bold transition-colors ${
                  typeFilter === filter ? 'bg-slate-850 text-emerald-400' : 'text-slate-500 hover:text-slate-350'
                }`}
              >
                {filter === 'all' ? 'All vectors' : filter === 'win' ? 'Winning Patterns' : 'Losing Patterns'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vector Match Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredMemories.map((mem) => (
          <div 
            key={mem.id} 
            className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl flex flex-col justify-between shadow-lg relative overflow-hidden"
          >
            {/* Pattern match indicator on corner */}
            <div className="absolute top-0 right-0 p-3 bg-slate-950 text-[10px] font-mono border-l border-b border-slate-850 text-indigo-400 rounded-bl-lg font-bold">
              {mem.patternMatchScore}% MATCH
            </div>

            {/* Header info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded ${mem.type === 'win' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-450'}`}>
                  {mem.type === 'win' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                </div>
                <div>
                  <span className="font-mono font-bold text-slate-100 text-sm">{mem.symbol}</span>
                  <span className="text-[10px] text-slate-500 block leading-none mt-0.5">{mem.timestamp}</span>
                </div>
              </div>

              {/* RAG content */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-slate-500 font-mono">Strategy:</span>
                  <span className="text-indigo-300 font-bold font-mono">{mem.strategy}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-slate-500 font-mono">Regime context:</span>
                  <span className="text-slate-205 font-medium">{mem.regime}</span>
                </div>
              </div>

              {/* Journal details */}
              <p className="text-[11.5px] text-slate-400 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-900 font-sans">
                {mem.details}
              </p>
            </div>

            {/* PnL yield */}
            <div className="mt-4 pt-3 border-t border-slate-850/60 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">Historical Net Impact:</span>
              <span className={`font-bold ${mem.type === 'win' ? 'text-emerald-400' : 'text-rose-450'}`}>
                {mem.pnl >= 0 ? '+' : ''}${mem.pnl.toLocaleString()} ({mem.pnlPercent}%)
              </span>
            </div>
          </div>
        ))}
        {filteredMemories.length === 0 && (
          <div className="col-span-2 py-16 text-center bg-slate-900/20 border border-slate-850/40 rounded-xl">
            <Brain className="w-10 h-10 text-slate-600 mx-auto mb-3 animate-pulse" />
            <p className="text-xs text-slate-500 font-sans">No matching Retrospective patterns found in vector database.</p>
          </div>
        )}
      </div>
    </div>
  );
}
