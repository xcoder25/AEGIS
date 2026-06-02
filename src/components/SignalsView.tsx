/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Radio, 
  Check, 
  X, 
  Eye, 
  Sparkles,
  Percent,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { useTradingStore } from '../store';
import { TradingSignal } from '../types';
import TradeDetailsModal from './TradeDetailsModal';

export default function SignalsView() {
  const { signals, approveSignal, rejectSignal, selectedSignal, setSelectedSignal } = useTradingStore();
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'approved'>('pending');

  const filteredSignals = React.useMemo(() => {
    if (filterMode === 'all') return signals;
    if (filterMode === 'pending') return signals.filter(s => s.status === 'pending');
    return signals.filter(s => s.status === 'approved' || s.status === 'executed');
  }, [signals, filterMode]);

  return (
    <div className="space-y-4">
      {/* Introduction Card */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>AI Copilot Smart Signals deck</span>
          </h2>
          <p className="text-[11px] text-slate-500">Formulated in real-time by analyzing technical indicators, sentiment charts and RAG pattern databases</p>
        </div>

        {/* Filter Selection Tabs */}
        <div className="flex gap-1.5 p-1 bg-slate-950 border border-slate-850 rounded-lg text-xs font-mono">
          <button
            id="filter-sig-pending"
            onClick={() => setFilterMode('pending')}
            className={`px-3 py-1 rounded transition-colors font-semibold uppercase ${
              filterMode === 'pending' ? 'bg-slate-800 text-emerald-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Pending ({signals.filter(s => s.status === 'pending').length})
          </button>
          <button
            id="filter-sig-approved"
            onClick={() => setFilterMode('approved')}
            className={`px-3 py-1 rounded transition-colors font-semibold uppercase ${
              filterMode === 'approved' ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Approved ({signals.filter(s => s.status === 'approved').length})
          </button>
          <button
            id="filter-sig-all"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 rounded transition-colors font-semibold uppercase ${
              filterMode === 'all' ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            All Logs ({signals.length})
          </button>
        </div>
      </div>

      {/* Signals List Grid */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800/85 text-slate-500 font-mono font-medium">
                <th className="py-3">Asset Symbol</th>
                <th className="py-3">Strategy Framework</th>
                <th className="py-3">Direction</th>
                <th className="py-3">Confidence</th>
                <th className="py-3">Risk/10</th>
                <th className="py-3 hidden lg:table-cell max-w-[200px]">AI Rationale Summary</th>
                <th className="py-3 text-right">Age</th>
                <th className="py-3 text-center">Execution Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredSignals.map((signal) => (
                <tr key={signal.id} className="hover:bg-slate-850/20 transition-colors">
                  {/* Symbol */}
                  <td className="py-3">
                    <div className="flex flex-col">
                      <span className="font-mono font-bold text-slate-100">{signal.symbol}</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mt-1 font-mono">{signal.assetClass}</span>
                    </div>
                  </td>

                  {/* Strategy */}
                  <td className="py-3">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-slate-200 font-medium">{signal.strategy}</span>
                    </div>
                  </td>

                  {/* Direction */}
                  <td className="py-3">
                    <span className={`inline-flex items-center gap-1 font-mono font-bold uppercase rounded px-2 py-0.5 border ${
                      signal.direction === 'buy' 
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
                        : 'bg-rose-500/10 border-rose-500/25 text-rose-450'
                    }`}>
                      {signal.direction === 'buy' ? 'Long' : 'Short'}
                    </span>
                  </td>

                  {/* Confidence */}
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-200">{signal.confidence}%</span>
                      <div className="w-16 bg-slate-950 h-1.5 rounded-full overflow-hidden hidden md:block">
                        <div 
                          className="bg-emerald-500 h-full rounded-full" 
                          style={{ width: `${signal.confidence}%` }} 
                        />
                      </div>
                    </div>
                  </td>

                  {/* Risk Score */}
                  <td className="py-3">
                    <span className={`font-mono font-bold text-shadow py-0.5 px-2 rounded-full text-[10px] border ${
                      signal.riskScore <= 3
                        ? 'bg-emerald-500/15 border-emerald-500/10 text-emerald-400'
                        : 'bg-amber-500/15 border-amber-500/10 text-amber-400'
                    }`}>
                      {signal.riskScore} (Low)
                    </span>
                  </td>

                  {/* AI Explanation Summary */}
                  <td className="py-3 hidden lg:table-cell max-w-[200px]">
                    <p className="text-slate-400 truncate leading-snug" title={signal.explanation}>
                      {signal.explanation}
                    </p>
                  </td>

                  {/* Timestamp / Age */}
                  <td className="py-3 text-right font-mono text-slate-500">
                    {new Date(signal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>

                  {/* Action triggers */}
                  <td className="py-3 text-center">
                    {signal.status === 'pending' ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          id={`btn-reject-sig-${signal.id}`}
                          onClick={() => rejectSignal(signal.id)}
                          className="p-1 text-slate-400 hover:text-rose-410 hover:bg-slate-800 rounded transition-colors border border-slate-850"
                          title="Reject Signal"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          id={`btn-approve-sig-${signal.id}`}
                          onClick={() => approveSignal(signal.id)}
                          className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 rounded transition-colors border border-slate-850"
                          title="Approve Signal"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          id={`btn-view-details-${signal.id}`}
                          onClick={() => setSelectedSignal(signal)}
                          className="p-1 text-indigo-400 hover:text-indigo-300 hover:bg-slate-800 rounded transition-colors border border-slate-850"
                          title="Detailed AI Diagnostics"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5 text-[10px]">
                        <span className={`font-mono font-bold uppercase py-0.5 px-2 rounded ${
                          signal.status === 'approved' 
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/10'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-500/10'
                        }`}>
                          {signal.status}
                        </span>
                        <button
                          id={`btn-view-details-${signal.id}`}
                          onClick={() => setSelectedSignal(signal)}
                          className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-all"
                          title="Review setup details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredSignals.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                    No active trading setups in {filterMode.toUpperCase()} state.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Render AI Sourced Diagnostics Modal overlay if selected */}
      {selectedSignal && (
        <TradeDetailsModal 
          signal={selectedSignal} 
          onClose={() => setSelectedSignal(null)} 
        />
      )}
    </div>
  );
}
