/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTradingStore } from '../store';
import { ArrowLeftRight, Download, Calendar, DollarSign } from 'lucide-react';
import { AssetClass } from '../types';

export default function TradesView() {
  const { trades } = useTradingStore();
  const [classFilter, setClassFilter] = useState<AssetClass | 'all'>('all');

  const filteredTrades = React.useMemo(() => {
    if (classFilter === 'all') return trades;
    return trades.filter(t => t.assetClass === classFilter);
  }, [trades, classFilter]);

  const totalPnL = filteredTrades.reduce((acc, curr) => acc + curr.pnl, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-indigo-400" />
            <span>Institutional Settlement Ledger</span>
          </h2>
          <p className="text-[11px] text-slate-500">Immutable ledger logs detailing liquidated weights and margin yields</p>
        </div>

        <button 
          onClick={() => alert("Downloading CSV of final trading records...")}
          className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs font-semibold py-2 px-3 rounded-lg text-slate-300 hover:text-white transition-all flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span>Export Ledger</span>
        </button>
      </div>

      {/* Grid of Total settlement sums */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-mono font-bold block uppercase">Total settlements count</span>
            <span className="font-mono text-lg font-black text-white">{filteredTrades.length} trades</span>
          </div>
          <Calendar className="w-6 h-6 text-slate-600" />
        </div>

        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-mono font-bold block uppercase">Net profits generated</span>
            <span className={`font-mono text-lg font-black ${totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
              {totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <DollarSign className="w-6 h-6 text-emerald-500/20" />
        </div>

        {/* Filters Panel */}
        <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl flex items-center justify-end">
          <div className="flex gap-1">
            {(['all', 'crypto', 'forex', 'commodity', 'index'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setClassFilter(filter)}
                className={`text-[10px] font-mono px-2 py-1 rounded border uppercase font-semibold transition-colors ${
                  classFilter === filter 
                    ? 'bg-slate-800 border-slate-700 text-emerald-400' 
                    : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Settlement Logs Table */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800/85 text-slate-500 font-mono font-medium">
                <th className="py-2.5">Trade ID</th>
                <th className="py-2.5">Symbol</th>
                <th className="py-2.5">Direction</th>
                <th className="py-2.5">Used Strategy</th>
                <th className="py-2.5 text-right">Qty Size</th>
                <th className="py-2.5 text-right">Entry Price</th>
                <th className="py-2.5 text-right">Exit Price</th>
                <th className="py-2.5 text-right">Settled Yield</th>
                <th className="py-2.5 text-right">Duration</th>
                <th className="py-2.5 text-right">Settled Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredTrades.map((trade) => (
                <tr key={trade.id} className="hover:bg-slate-850/10 transition-colors">
                  <td className="py-3 font-mono font-bold text-slate-450">{trade.id}</td>
                  <td className="py-3 font-mono font-bold text-slate-100">{trade.symbol}</td>
                  <td className="py-3">
                    <span className={`font-mono text-[9px] font-black uppercase px-2 py-0.2 rounded border ${
                      trade.direction === 'long' 
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
                        : 'bg-rose-500/10 border-rose-500/25 text-rose-450'
                    }`}>
                      {trade.direction.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 text-slate-350">{trade.strategy}</td>
                  <td className="py-3 text-right font-mono text-slate-300">{trade.size.toLocaleString()}</td>
                  <td className="py-3 text-right font-mono text-slate-500">${trade.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 5 })}</td>
                  <td className="py-3 text-right font-mono text-slate-300">${trade.exitPrice.toLocaleString(undefined, { maximumFractionDigits: 5 })}</td>
                  <td className={`py-3 text-right font-mono font-bold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({trade.pnlPercent.toFixed(2)}%)
                  </td>
                  <td className="py-3 text-right font-mono text-slate-450">{trade.execTime}</td>
                  <td className="py-3 text-right font-mono text-slate-550">
                    {new Date(trade.timestamp).toLocaleDateString([], { month: 'short', day: '2-digit' })}{' '}
                    {new Date(trade.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
              {filteredTrades.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    No settled log transactions match the filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
