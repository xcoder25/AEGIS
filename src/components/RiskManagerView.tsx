/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, Percent, HelpCircle, AlertTriangle, Coins, Target } from 'lucide-react';
import { useTradingStore } from '../store';

export default function RiskManagerView() {
  const { riskLimits, updateRiskLimits, addNotification, positions } = useTradingStore();

  const handleLimitChange = (field: string, val: number) => {
    updateRiskLimits({ [field]: val });
  };

  // Portfolio calculation variables
  const activeMargin = positions.reduce((acc, curr) => acc + curr.margin, 0);
  const totalHeatPercent = Math.min(Math.round((activeMargin / 25000) * 100), 100);
  const currentExposurePercent = Math.min(Math.round((riskLimits.currentExposure / 125000) * 100), 100);

  return (
    <div className="space-y-6">
      {/* Introduction Banner */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl shadow-lg">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>Institutional Core Risk Engine</span>
        </h2>
        <p className="text-[11px] text-slate-500">Enforces leverage locks, margin spreads, and hard limits to safeguard aggregate equity</p>
      </div>

      {/* Visual Gauges Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gauge 1: Exposure Meter */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Current Risk Exposure</h3>
            <p className="text-[10px] text-slate-500 mt-1">Margin lock size relative to liquid aggregate balance</p>
          </div>
          <div className="my-5 flex items-baseline gap-2">
            <span className="font-mono text-xl font-black text-white">${riskLimits.currentExposure.toLocaleString()}</span>
            <span className="font-mono text-xs text-indigo-400 font-bold">{currentExposurePercent}% Limit</span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${currentExposurePercent}%` }} 
            />
          </div>
        </div>

        {/* Gauge 2: Peak Drawdown lock */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Drawdown Lock Percentage</h3>
            <p className="text-[10px] text-slate-500 mt-1">Maximum allowed peak drawdown parameters</p>
          </div>
          <div className="my-5 flex items-baseline gap-2">
            <span className="font-mono text-xl font-black text-rose-455">{riskLimits.maxDrawdown}% Drawdown</span>
            <span className="font-mono text-[10px] text-slate-500 uppercase font-semibold">Active cap limit</span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-rose-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${(riskLimits.maxDrawdown / 15) * 100}%` }} 
            />
          </div>
        </div>

        {/* Gauge 3: Portfolio Heat gauge */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Portfolio Heat Index</h3>
            <p className="text-[10px] text-slate-500 mt-1">Aggregate margin deployment pressure metric</p>
          </div>
          <div className="my-5 flex items-baseline gap-2">
            <span className={`font-mono text-xl font-black ${totalHeatPercent > 60 ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
              {totalHeatPercent}% Heat
            </span>
            <span className="font-mono text-[10px] text-slate-550 uppercase font-bold">
              {totalHeatPercent > 60 ? 'IMBALANCE WARNING' : 'SAFE THRESHOLD'}
            </span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${totalHeatPercent > 60 ? 'bg-amber-400' : 'bg-emerald-400'}`} 
              style={{ width: `${totalHeatPercent}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Adjustable limits sliders console */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl shadow-lg">
        <h3 className="text-sm font-bold text-white mb-4 border-b border-slate-850 pb-2 flex items-center gap-1.5">
          <Target className="w-4 h-4 text-emerald-400" />
          <span>Active Limitation Guardrails</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Daily Loss Limit */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Daily Loss Safeguard Limit:</span>
              <span className="text-white font-bold">${riskLimits.dailyLossLimit.toLocaleString()}</span>
            </div>
            <input
              id="slider-risk-daily"
              type="range"
              min="1000"
              max="15000"
              step="500"
              value={riskLimits.dailyLossLimit}
              onChange={(e) => handleLimitChange('dailyLossLimit', parseInt(e.target.value))}
              className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Weekly Loss Limit */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Weekly Loss Safeguard Limit:</span>
              <span className="text-white font-bold">${riskLimits.weeklyLossLimit.toLocaleString()}</span>
            </div>
            <input
              id="slider-risk-weekly"
              type="range"
              min="5000"
              max="50000"
              step="1000"
              value={riskLimits.weeklyLossLimit}
              onChange={(e) => handleLimitChange('weeklyLossLimit', parseInt(e.target.value))}
              className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Risk Per Trade */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Target Risk Per Trade (% Margin):</span>
              <span className="text-white font-bold">{riskLimits.riskPerTrade}%</span>
            </div>
            <input
              id="slider-risk-per-trade"
              type="range"
              min="0.5"
              max="5"
              step="0.1"
              value={riskLimits.riskPerTrade}
              onChange={(e) => handleLimitChange('riskPerTrade', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Max Open Trades */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Max Open Trading Contracts:</span>
              <span className="text-white font-bold">{riskLimits.maxOpenTrades} contracts</span>
            </div>
            <input
              id="slider-risk-max-trades"
              type="range"
              min="2"
              max="10"
              step="1"
              value={riskLimits.maxOpenTrades}
              onChange={(e) => handleLimitChange('maxOpenTrades', parseInt(e.target.value))}
              className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
