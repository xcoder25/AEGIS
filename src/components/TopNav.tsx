/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Bell, 
  User, 
  Cpu, 
  ChevronDown, 
  CheckCircle, 
  AlertTriangle, 
  Trash2,
  Globe,
  Menu,
  LogOut,
  ShieldAlert,
  Key,
  Sliders,
  Maximize2
} from 'lucide-react';
import { useTradingStore } from '../store';

const BROKERS = ['Binance Pro', 'IQ Option', 'Future Brokers'];

export default function TopNav() {
  const { 
    user,
    logout,
    autoTradingEnabled, 
    toggleAutoTrading, 
    activeBroker, 
    setActiveBroker, 
    notifications, 
    clearNotifications,
    dailyPnL,
    wsStatus,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    backendMode,
    backendConnectionState,
    layoutDensity,
    setLayoutDensity,
    screenWidth,
    setScreenWidth,
    textScale,
    setTextScale
  } = useTradingStore();

  const [brokerOpen, setBrokerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 right-0 left-0 md:pl-64 h-16 border-b border-slate-900/80 bg-slate-950/80 backdrop-blur-md z-30 flex items-center justify-between px-4 md:px-6">
      {/* Account Status Information */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Hamburger Menu Toggle Button on Mobile */}
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-850 border border-slate-800/80 transition-colors"
          id="btn-sidebar-mobile-toggle"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${
            backendMode === 'custom' 
              ? (backendConnectionState === 'connected' ? 'bg-emerald-500 shadow-md shadow-emerald-500/50' : 'bg-amber-500 animate-pulse')
              : 'bg-indigo-500 shadow shadow-indigo-505'
          }`} />
          <span className="font-mono text-xs text-slate-400 font-semibold uppercase tracking-wider hidden sm:inline">Engine:</span>
          <span className={`font-sans text-[10px] font-bold px-2 py-0.5 rounded border uppercase transition-all flex items-center gap-1 ${
            backendMode === 'custom'
              ? (backendConnectionState === 'connected' 
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400' 
                  : 'bg-amber-950/20 border-amber-500/30 text-amber-400')
              : 'bg-slate-900 border-indigo-500/20 text-indigo-400'
          }`}>
            {backendMode === 'custom' 
              ? (backendConnectionState === 'connected' ? 'Live Custom API' : 'Custom Connecting') 
              : 'Coinbase Live'}
          </span>
        </div>
        <div className="hidden lg:flex items-center gap-1.5 border-l border-slate-800 pl-4">
          <span className="text-slate-500 text-xs">Today's Profit Limit:</span>
          <span className={`text-xs font-bold font-mono ${dailyPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {dailyPnL >= 0 ? '+' : ''}${dailyPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Control Actions & Notifications Panel */}
      <div className="flex items-center gap-4">
        {/* Active Broker Select */}
        <div className="relative">
          <button
            id="btn-broker-select"
            onClick={() => setBrokerOpen(!brokerOpen)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-850 text-slate-200 py-1.5 px-3 rounded-lg border border-slate-800 text-xs font-medium transition-all"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>{activeBroker}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${brokerOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {brokerOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-1 z-50">
              {BROKERS.map((broker) => (
                <button
                  key={broker}
                  id={`btn-broker-opt-${broker.toLowerCase().replace(/\s/g, '-')}`}
                  onClick={() => {
                    setActiveBroker(broker);
                    setBrokerOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 hover:bg-slate-800 text-xs font-medium transition-colors ${
                    activeBroker === broker ? 'text-emerald-400 font-semibold' : 'text-slate-300'
                  }`}
                >
                  {broker}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Auto/Copilot Toggle Button */}
        <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1 border border-slate-800 text-xs">
          <button
            id="btn-autotoggle-copilot"
            onClick={() => {
              if (autoTradingEnabled) toggleAutoTrading();
            }}
            className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              !autoTradingEnabled 
                ? 'bg-indigo-950/80 text-indigo-400 border border-indigo-500/20 shadow shadow-indigo-505' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Copilot Mode</span>
          </button>
          <button
            id="btn-autotoggle-auto"
            onClick={() => {
              if (!autoTradingEnabled) toggleAutoTrading();
            }}
            className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              autoTradingEnabled 
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/20 shadow shadow-emerald-505' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Auto Exec</span>
          </button>
        </div>

        {/* Workspace Quick Scale Popover (highly adjustable and flexible) */}
        <div className="relative">
          <button
            id="btn-quick-layout-toggle"
            type="button"
            onClick={() => {
              setLayoutMenuOpen(!layoutMenuOpen);
              setNotifOpen(false);
              setBrokerOpen(false);
              setProfileOpen(false);
            }}
            className="p-1.5 px-2.5 text-slate-400 hover:text-emerald-400 bg-slate-900 hover:bg-slate-850 rounded-lg border border-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Adjust Screen Flexibility"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider hidden sm:inline text-slate-350">
              LAYOUT SCALE
            </span>
          </button>

          {layoutMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-50 p-4 space-y-4 text-left animate-fadeIn">
              <div className="pb-2 border-b border-slate-900">
                <span className="text-xs font-bold text-slate-100 block">Workspace Flex Parameters</span>
                <span className="text-[9px] font-mono text-slate-500 uppercase">On-the-fly Screen Adjuster</span>
              </div>

              {/* Spacing Selector */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono text-indigo-400 font-bold uppercase block">Layout Density</span>
                <div className="grid grid-cols-3 gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-850">
                  {(['compact', 'normal', 'spacious'] as const).map((density) => (
                    <button
                      key={density}
                      type="button"
                      onClick={() => setLayoutDensity(density)}
                      className={`text-[9.5px] font-mono font-bold capitalize py-1 px-1.5 rounded transition-colors cursor-pointer ${
                        layoutDensity === density 
                          ? 'bg-slate-800 text-emerald-450 text-emerald-400' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {density}
                    </button>
                  ))}
                </div>
              </div>

              {/* Screen Width selector */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono text-indigo-400 font-bold uppercase block">Screen Width Mode</span>
                <div className="grid grid-cols-2 gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-850">
                  <button
                    type="button"
                    onClick={() => setScreenWidth('centered')}
                    className={`text-[9.5px] font-mono font-bold capitalize py-1 px-1.5 rounded transition-colors cursor-pointer ${
                      screenWidth === 'centered' 
                        ? 'bg-slate-800 text-emerald-455 text-emerald-400' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Centered
                  </button>
                  <button
                    type="button"
                    onClick={() => setScreenWidth('full')}
                    className={`text-[9.5px] font-mono font-bold capitalize py-1 px-1.5 rounded transition-colors cursor-pointer ${
                      screenWidth === 'full' 
                        ? 'bg-slate-800 text-emerald-455 text-emerald-400' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Full Width
                  </button>
                </div>
              </div>

              {/* Text Sizing Selector */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono text-indigo-400 font-bold uppercase block">Typography Scaling</span>
                <div className="grid grid-cols-3 gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-855">
                  {(['sm', 'base', 'lg'] as const).map((scale) => (
                    <button
                      key={scale}
                      type="button"
                      onClick={() => setTextScale(scale)}
                      className={`text-[9.5px] font-mono font-bold uppercase py-1 px-1.5 rounded transition-colors cursor-pointer ${
                        textScale === scale 
                          ? 'bg-slate-800 text-emerald-455 text-emerald-400' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {scale === 'base' ? 'MED' : scale}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            id="btn-notifications-toggle"
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-2 text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-850 rounded-lg border border-slate-800 transition-all relative"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-950">
                <span className="text-xs font-semibold text-slate-100">Live Logs & Alerts</span>
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-850">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No active notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="p-3 hover:bg-slate-850/40 text-xs flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold font-mono uppercase px-1.5 py-0.2 rounded ${
                          n.type === 'alert' 
                            ? 'bg-rose-500/10 text-rose-400' 
                            : n.type === 'signal'
                            ? 'bg-indigo-500/10 text-indigo-400'
                            : n.type === 'trade'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {n.type}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">{n.timestamp}</span>
                      </div>
                      <p className="text-slate-300 font-medium text-[11px] leading-normal">{n.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Account Badge with Dropdown */}
        <div className="relative flex items-center pl-2 border-l border-slate-800">
          <button
            id="btn-user-profile-badge"
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 text-left p-1 rounded-lg hover:bg-slate-900/40 transition-colors"
          >
            <div className={`h-8 w-8 rounded-full border flex items-center justify-center text-xs font-mono font-bold select-none ${
              user?.avatar === 'indigo' ? 'bg-indigo-505/20 text-indigo-400 border-indigo-500/20' :
              user?.avatar === 'emerald' ? 'bg-emerald-505/20 text-emerald-400 border-emerald-500/20' :
              user?.avatar === 'amber' ? 'bg-amber-505/20 text-amber-400 border-amber-500/20' :
              user?.avatar === 'rose' ? 'bg-rose-505/20 text-rose-400 border-rose-500/20' :
              user?.avatar === 'cyan' ? 'bg-cyan-505/20 text-cyan-400 border-cyan-500/20' :
              user?.avatar === 'purple' ? 'bg-purple-505/20 text-purple-400 border-purple-500/20' :
              'bg-slate-800 text-slate-200 border-slate-700'
            }`}>
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'OP'}
            </div>
            <div className="hidden lg:flex flex-col">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                {user?.name || 'Operator'}
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </span>
              <span className="text-[9px] font-mono text-slate-500 leading-none">
                {user?.email ? user.email.split('@')[0] : 'Trader'}
              </span>
            </div>
          </button>

          {profileOpen && (
            <div 
              className="absolute right-0 top-12 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden"
              id="user-profile-dropdown"
            >
              {/* Profile Card Header */}
              <div className="p-4 border-b border-slate-800 bg-[#07080a] space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-mono font-bold border ${
                    user?.avatar === 'indigo' ? 'bg-indigo-550/20 text-indigo-400 border-indigo-500/20' :
                    user?.avatar === 'emerald' ? 'bg-emerald-550/20 text-emerald-400 border-emerald-500/20' :
                    user?.avatar === 'amber' ? 'bg-amber-55/20 text-amber-400 border-amber-500/20' :
                    user?.avatar === 'rose' ? 'bg-rose-550/20 text-rose-400 border-rose-500/20' :
                    user?.avatar === 'cyan' ? 'bg-cyan-550/20 text-cyan-400 border-cyan-500/20' :
                    user?.avatar === 'purple' ? 'bg-purple-550/20 text-purple-400 border-purple-500/20' :
                    'bg-slate-800 text-slate-200 border-slate-700'
                  }`}>
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : 'OP'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-100 truncate">{user?.name || 'Aegis Operator'}</span>
                    <span className="text-[9px] font-mono text-indigo-405 truncate tracking-wide">{user?.role || 'Senior Quant Trader'}</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate px-1 bg-black/40 py-0.5 rounded text-center">
                  License: {user?.email || 'unregistered@aegis.ai'}
                </div>
              </div>

              {/* Status details / APIs */}
              <div className="p-3 border-b border-slate-800 text-[10.5px] space-y-2.5 select-none bg-slate-900/40">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-mono">Profile Registration:</span>
                  <span className="text-slate-200 font-semibold font-mono text-[9px]">
                    {user?.registeredAt ? new Date(user.registeredAt).toLocaleDateString() : 'Active'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-mono">Secure API Stream:</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase font-mono ${
                    user?.brokerApiKey 
                      ? 'bg-emerald-950/25 border-emerald-500/20 text-emerald-400' 
                      : 'bg-slate-800 border-slate-800 text-slate-500'
                  }`}>
                    {user?.brokerApiKey ? 'LINKED' : 'SIM ONLY'}
                  </span>
                </div>
                {user?.brokerApiKey && (
                  <div className="text-[9px] font-mono text-slate-500 truncate bg-slate-950/45 p-1.5 rounded flex items-center gap-1 border border-white/5">
                    <Key className="w-2.5 h-2.5 text-indigo-400" />
                    <span className="truncate">{user.brokerApiKey}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-1 bg-[#07080a]">
                <button
                  id="btn-profile-logout"
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-rose-950/20 text-rose-400 hover:text-rose-300 font-medium text-xs rounded-lg transition-colors flex items-center gap-2 border border-transparent hover:border-rose-900/20"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Terminate Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
