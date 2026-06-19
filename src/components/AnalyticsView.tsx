/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BarChart3, TrendingUp, Sparkles, Percent, Calendar } from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  RadialBarChart, 
  RadialBar 
} from 'recharts';
import { useTradingStore } from '../store';

export default function AnalyticsView() {
  const { winRate, trades } = useTradingStore();

  // 1. Dynamic Monthly Yield (%)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthPnL: Record<string, number> = {};
  const currentMonthIdx = new Date().getMonth();
  // seed prior 6 months
  for (let i = 5; i >= 0; i--) {
    const idx = (currentMonthIdx - i + 12) % 12;
    monthPnL[months[idx]] = 0;
  }
  trades.forEach(t => {
    const date = new Date(t.timestamp);
    if (!isNaN(date.getTime())) {
      const m = months[date.getMonth()];
      if (monthPnL[m] !== undefined) {
        monthPnL[m] += (t.pnl / 100000.0) * 100;
      }
    }
  });
  const monthPerf = Object.entries(monthPnL).map(([month, val]) => ({
    month,
    yield: parseFloat(val.toFixed(2))
  }));

  // 2. Dynamic dollar Yield by Asset
  const assetPnLMap: Record<string, number> = {
    'BTC/USDT': 0,
    'ETH/USDT': 0,
    'EUR/USD': 0,
    'GBP/USD': 0,
    'XAU/USD': 0,
    'USO/USD': 0,
    'SPX500': 0,
    'NAS100': 0,
  };
  trades.forEach(t => {
    if (assetPnLMap[t.symbol] !== undefined) {
      assetPnLMap[t.symbol] += t.pnl;
    }
  });
  const assetPerfData = Object.entries(assetPnLMap).map(([name, pnl]) => ({
    name,
    yield: parseFloat(pnl.toFixed(2))
  }));

  // 3. Dynamic Trade Direction Spread
  let longCount = 0;
  let shortCount = 0;
  trades.forEach(t => {
    if (t.direction === 'long') longCount++;
    else if (t.direction === 'short') shortCount++;
  });
  // default to 1 for both if empty to display empty distribution cleanly
  const directionSpread = [
    { name: 'LONG trades', value: longCount || (trades.length === 0 ? 1 : 0), fill: '#10b981' },
    { name: 'SHORT trades', value: shortCount || (trades.length === 0 ? 1 : 0), fill: '#f43f5e' }
  ];

  // 4. Dynamic Strategy Efficiency
  const stratStats: Record<string, { wins: number; total: number }> = {
    'Trend Following': { wins: 0, total: 0 },
    'Breakout Momentum': { wins: 0, total: 0 },
    'Mean Reversion': { wins: 0, total: 0 },
    'Volatility Expansion': { wins: 0, total: 0 },
    'Orderbook Liquidity': { wins: 0, total: 0 },
    'Manual Exit': { wins: 0, total: 0 }
  };
  trades.forEach(t => {
    const strat = t.strategy || 'Manual Exit';
    if (stratStats[strat]) {
      stratStats[strat].total++;
      if (t.status === 'profit') stratStats[strat].wins++;
    }
  });
  const stratEfficiency = Object.entries(stratStats)
    .filter(([_, stats]) => stats.total > 0 || ['Trend Following', 'Breakout Momentum', 'Mean Reversion', 'Orderbook Liquidity'].includes(_))
    .map(([name, stats]) => ({
      name,
      rate: stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0
    }));

  return (
    <div className="space-y-6">
      {/* Intro block */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <span>Advanced Analytics Console</span>
          </h2>
          <p className="text-[11px] text-slate-500 font-sans">
            Deep performance evaluation based on trade execution, returns distribution and alpha generation
          </p>
        </div>
      </div>

      {/* Grid of Analytical charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Monthly Returns Grid */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl shadow-lg">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono mb-4">Monthly Performance Yield (%)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthPerf}>
                <XAxis dataKey="month" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px', color: '#fff' }}
                />
                <Bar dataKey="yield">
                  {monthPerf.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.yield >= 0 ? '#10b981' : '#f43f5e'} opacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Asset Class Performance */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl shadow-lg">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono mb-4">Total dollar Yield by Asset</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assetPerfData} layout="vertical">
                <XAxis type="number" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#475569" fontSize={10} width={70} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px', color: '#fff' }}
                />
                <Bar dataKey="yield">
                  {assetPerfData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.yield >= 0 ? '#6366f1' : '#f43f5e'} opacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Strategy Efficiency match */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl shadow-lg">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono mb-4">Historical Algorithm Win Rates (%)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stratEfficiency}>
                <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '11px', color: '#fff' }}
                />
                <Bar dataKey="rate" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Trade Direction Allocation */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl shadow-lg">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono mb-4 font-sans">Trade Direction Spread</h3>
          <div className="h-56 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={directionSpread}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {directionSpread.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center pointer-events-none">
              <span className="font-mono text-sm text-slate-500 uppercase">Win Ratio</span>
              <span className="font-mono text-xl font-black text-emerald-400">{winRate}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
