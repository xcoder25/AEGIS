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

// Mock datasets for Analytics Page
const MONTH_PERF = [
  { month: 'Jan', yield: 4.2 },
  { month: 'Feb', yield: 6.8 },
  { month: 'Mar', yield: -2.3 },
  { month: 'Apr', yield: 8.4 },
  { month: 'May', yield: 11.5 },
  { month: 'Jun', yield: 2.1 } // today
];

const ASSET_PERF_DATA = [
  { name: 'BTC/USDT', yield: 8940 },
  { name: 'ETH/USDT', yield: 2450 },
  { name: 'EUR/USD', yield: 1080 },
  { name: 'XAU/USD', yield: -430 },
  { name: 'SPX500', yield: 3100 },
  { name: 'NAS100', yield: 5420 }
];

const DIRECTION_SPREAD = [
  { name: 'LONG trades', value: 68, fill: '#10b981' },
  { name: 'SHORT trades', value: 32, fill: '#f43f5e' }
];

const STRAT_EFFICIENCY = [
  { name: 'Trend Following', rate: 71 },
  { name: 'Breakout Momentum', rate: 58 },
  { name: 'Mean Reversion', rate: 76 },
  { name: 'Orderbook Delta', rate: 69 }
];

export default function AnalyticsView() {
  const { winRate, trades } = useTradingStore();

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
              <BarChart data={MONTH_PERF}>
                <XAxis dataKey="month" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px', color: '#fff' }}
                />
                <Bar dataKey="yield">
                  {MONTH_PERF.map((entry, index) => (
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
              <BarChart data={ASSET_PERF_DATA} layout="vertical">
                <XAxis type="number" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#475569" fontSize={10} width={70} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px', color: '#fff' }}
                />
                <Bar dataKey="yield">
                  {ASSET_PERF_DATA.map((entry, index) => (
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
              <BarChart data={STRAT_EFFICIENCY}>
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
                  data={DIRECTION_SPREAD}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {DIRECTION_SPREAD.map((entry, index) => (
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
