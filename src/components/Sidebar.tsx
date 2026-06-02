/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Radio, 
  Briefcase, 
  ArrowLeftRight, 
  Cpu, 
  Sparkles, 
  ShieldAlert, 
  Database, 
  BarChart3, 
  Settings, 
  AlertOctagon, 
  Wifi, 
  WifiOff,
  X
} from 'lucide-react';
import { useTradingStore } from '../store';
import logoUrl from '../assets/images/aegis_ai_logo_1780357203730.png';

const NAV_ITEMS = [
  { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'Markets', label: 'Markets', icon: TrendingUp },
  { id: 'Signals', label: 'Signals', icon: Radio },
  { id: 'Portfolio', label: 'Portfolio', icon: Briefcase },
  { id: 'Trades', label: 'Trades', icon: ArrowLeftRight },
  { id: 'Strategies', label: 'Strategies', icon: Cpu },
  { id: 'AI Copilot', label: 'AI Copilot', icon: Sparkles, accent: true },
  { id: 'Risk Manager', label: 'Risk Manager', icon: ShieldAlert },
  { id: 'Memory (RAG)', label: 'Memory (RAG)', icon: Database },
  { id: 'Analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'Settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { activeTab, setActiveTab, wsStatus, emergencyStop, isMobileSidebarOpen, setIsMobileSidebarOpen } = useTradingStore();

  return (
    <aside 
      id="sidebar-container" 
      className={`fixed top-0 left-0 z-40 w-64 h-screen transition-transform duration-300 ${
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 border-r border-slate-800/80 bg-slate-950 flex flex-col justify-between`}
    >
      {/* Platform Branding */}
      <div className="p-5 flex flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={logoUrl} 
              alt="AegisAI Logo" 
              className="w-10 h-10 rounded-xl border border-white/10 shadow-lg object-cover"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="font-sans font-bold tracking-tight text-white leading-none">AEGIS <span className="text-indigo-400">AI</span></h1>
              <span className="font-mono text-[9px] text-slate-500 font-semibold tracking-widest uppercase">QUANT PLATFORM</span>
            </div>
          </div>
          {/* Close button for mobile screen view */}
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            title="Close sidebar"
            id="sidebar-mobile-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-time Statusbadge */}
        <div className="mt-4 flex items-center justify-between bg-slate-900/60 rounded-lg py-2 px-3 border border-slate-800/40">
          <span className="text-[11px] text-slate-400 font-medium">Network Engine</span>
          <div className="flex items-center gap-2">
            {wsStatus === 'connected' ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-mono text-[10px] text-emerald-400 font-semibold">LIVE CONNECT</span>
              </>
            ) : wsStatus === 'connecting' ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-spin absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span className="font-mono text-[10px] text-indigo-400 font-semibold">HANDSHAKE</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                <span className="font-mono text-[10px] text-rose-500 font-semibold">OFFLINE</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Nav List */}
      <div className="px-3 py-1 flex-1 overflow-y-auto space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id.toLowerCase().replace(/\s/g, '-')}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                isActive 
                  ? 'bg-slate-905 border border-white/5 text-emerald-400 text-shadow shadow-emerald-500/5' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
              }`}
            >
              <Icon className={`w-[18px] h-[18px] transition-colors ${
                isActive 
                  ? 'text-emerald-400' 
                  : item.accent ? 'text-indigo-400 group-hover:text-indigo-300' : 'text-slate-500 group-hover:text-slate-300'
              }`} />
              <span className={`font-medium ${isActive ? 'font-semibold' : 'text-slate-400'}`}>{item.label}</span>
              {item.accent && (
                <span className="ml-auto text-[9px] font-mono font-bold bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20 uppercase tracking-widest leading-none">
                  AI
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Emergency Action Block */}
      <div className="p-4 border-t border-slate-900 flex flex-col gap-3 bg-slate-950/80">
        <button
          id="btn-sidebar-emergency"
          onClick={emergencyStop}
          className="w-full bg-rose-950/50 text-rose-300 hover:bg-rose-900 hover:text-white transition-all py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 border border-rose-900/50 shadow-lg shadow-rose-950/10 text-xs font-semibold"
        >
          <AlertOctagon className="w-4 h-4" />
          <span>EMERGENCY STOP</span>
        </button>
        <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 font-mono">
          <span>v2.5.0-Production</span>
          <span>Latency: 12ms</span>
        </div>
      </div>
    </aside>
  );
}
