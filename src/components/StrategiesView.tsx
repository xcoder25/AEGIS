/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Cpu, CheckCircle2, XCircle, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useTradingStore } from '../store';

export default function StrategiesView() {
  const { strategies, updateStrategy, addNotification } = useTradingStore();

  const handleToggleStrategy = (id: string, currentlyEnabled: boolean) => {
    updateStrategy(id, !currentlyEnabled);
    const strat = strategies.find(s => s.id === id);
    if (strat) {
      addNotification(
        `Strategy Config Modified: ${strat.name} is now ${!currentlyEnabled ? 'ENABLED' : 'DISABLED'}`,
        'info'
      );
    }
  };

  const handleWeightChange = (id: string, weightString: string) => {
    const nextWeight = parseInt(weightString);
    if (!isNaN(nextWeight)) {
      updateStrategy(id, true, nextWeight);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Intro Banner */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <span>Algos, Modules & Risk Allocation Layers</span>
          </h2>
          <p className="text-[11px] text-slate-500">Fine-tune institutional portfolio weights across our five custom mathematical execution containers</p>
        </div>
        <span className="text-[10px] bg-slate-950 font-mono text-emerald-400 border border-slate-800 rounded px-2.5 py-1 uppercase tracking-widest font-bold">
          Active allocation sum: {strategies.reduce((acc, curr) => acc + (curr.enabled ? curr.activeWeight : 0), 0)}%
        </span>
      </div>

      {/* Grid of Strategy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {strategies.map((strat) => (
          <div 
            key={strat.id} 
            className={`bg-slate-900/40 backdrop-blur-md border rounded-xl p-5 flex flex-col justify-between shadow-lg transition-all relative overflow-hidden ${
              strat.enabled 
                ? 'border-slate-800/80 shadow-emerald-500/5' 
                : 'border-slate-900 opacity-60'
            }`}
          >
            {/* Strategy header block */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[10px] font-mono font-bold tracking-wider uppercase leading-none">ALGO MATRIX LAYER</span>
                
                {/* Active check indicator */}
                <button
                  id={`btn-toggle-strat-${strat.id}`}
                  onClick={() => handleToggleStrategy(strat.id, strat.enabled)}
                  className={`text-[10px] px-2 py-0.5 rounded border uppercase transition-colors font-bold ${
                    strat.enabled 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-slate-950 border-slate-850 text-slate-450 hover:bg-slate-900'
                  }`}
                >
                  {strat.enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">{strat.name}</h3>
                <p className="text-[11.5px] text-slate-450 leading-relaxed mt-1">{strat.description}</p>
              </div>
            </div>

            {/* Backtest Telemetry metrics */}
            <div className="grid grid-cols-2 gap-2 my-4 border-y border-slate-850/60 py-3 bg-slate-950/20 rounded-lg p-3">
              <div>
                <span className="text-[9px] text-slate-500 uppercase font-mono block">Backtest Win %:</span>
                <span className="font-mono text-xs font-bold text-emerald-400">{strat.winRate}%</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 uppercase font-mono block">Profit Factor:</span>
                <span className="font-mono text-xs font-bold text-slate-201">{strat.profitFactor}x</span>
              </div>
              <div className="mt-1">
                <span className="text-[9px] text-slate-500 uppercase font-mono block">Sharpe Index:</span>
                <span className="font-mono text-xs font-bold text-indigo-400">{strat.sharpeRatio}</span>
              </div>
              <div className="mt-1">
                <span className="text-[9px] text-slate-500 uppercase font-mono block">Max Drawdown:</span>
                <span className="font-mono text-xs font-bold text-rose-450">-{strat.drawdown}%</span>
              </div>
            </div>

            {/* Parameter configuration */}
            <div className="space-y-2 mt-2">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-slate-500 uppercase font-bold">Allocation Weight</span>
                <span className={`font-bold ${strat.enabled ? 'text-emerald-400' : 'text-slate-500'}`}>{strat.activeWeight}%</span>
              </div>
              <input
                id={`slider-weight-${strat.id}`}
                type="range"
                min="0"
                max="100"
                step="5"
                value={strat.activeWeight}
                disabled={!strat.enabled}
                onChange={(e) => handleWeightChange(strat.id, e.target.value)}
                className={`w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer ${
                  strat.enabled ? 'accent-emerald-500' : 'accent-slate-800'
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
