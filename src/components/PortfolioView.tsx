/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Briefcase, 
  Play, 
  Pause, 
  AlertOctagon, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert,
  Sliders,
  CheckCircle,
  HelpCircle,
  Clock,
  ArrowRightLeft
} from 'lucide-react';
import { useTradingStore } from '../store';

export default function PortfolioView() {
  const { 
    autoTradingEnabled, 
    toggleAutoTrading, 
    positions, 
    closePosition, 
    closeAllTrades, 
    emergencyStop,
    strategies,
    trades,
    accountBalance
  } = useTradingStore();

  // Dialog Overlay Control States
  const [activeDialog, setActiveDialog] = useState<'enable_auto' | 'disable_auto' | 'close_all' | 'halt' | null>(null);

  // Simulated live trade queue (dynamic pending limit order books)
  const [tradeQueue] = useState([
    { id: 'q-1', symbol: 'BTC/USDT', direction: 'LONG Limit', entryPrice: 91400.00, size: 0.50, triggerType: 'RSI oversold', status: 'Wired' },
    { id: 'q-2', symbol: 'NAS100', direction: 'SHORT Limit', entryPrice: 18600.20, size: 4.0, triggerType: 'EMA crossing exhaustion', status: 'Armed' }
  ]);

  const activeStrategiesCount = strategies.filter(s => s.enabled).length;

  const handleConfirmAction = () => {
    if (activeDialog === 'enable_auto' || activeDialog === 'disable_auto') {
      toggleAutoTrading();
    } else if (activeDialog === 'close_all') {
      closeAllTrades();
    } else if (activeDialog === 'halt') {
      emergencyStop();
    }
    setActiveDialog(null);
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Control Deck */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-400" />
              <span>Execution Auto-Engine Deck</span>
            </h2>
            <p className="text-[11px] text-slate-500">Autonomous loop execution handles approved signals using configured strategy parameters</p>
          </div>

          {/* Controls Hub */}
          <div className="flex flex-wrap gap-2">
            {autoTradingEnabled ? (
              <button
                id="btn-trigger-disable-auto"
                onClick={() => setActiveDialog('disable_auto')}
                className="bg-indigo-950 text-indigo-300 hover:bg-slate-800 transition-all font-semibold uppercase py-2 px-4 rounded-lg border border-indigo-900/50 text-xs flex items-center gap-2"
              >
                <Pause className="w-4 h-4" />
                <span>Disable Auto Mode</span>
              </button>
            ) : (
              <button
                id="btn-trigger-enable-auto"
                onClick={() => setActiveDialog('enable_auto')}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all font-bold uppercase py-2 px-4 rounded-lg text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/10 animate-pulse"
              >
                <Play className="w-4 h-4" />
                <span>Enable Auto Mode</span>
              </button>
            )}

            <button
              id="btn-trigger-close-all"
              onClick={() => setActiveDialog('close_all')}
              className="bg-transparent border border-slate-850 hover:bg-slate-900 text-rose-450 hover:text-rose-400 transition-all py-2 px-4 rounded-lg text-xs font-semibold flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Close All Positions</span>
            </button>

            <button
              id="btn-trigger-emergency-halt"
              onClick={() => setActiveDialog('halt')}
              className="bg-rose-950 text-rose-300 hover:bg-rose-900 hover:text-white transition-all py-2 px-4 rounded-lg text-xs font-bold flex items-center gap-2 border border-rose-900/40"
            >
              <AlertOctagon className="w-4 h-4" />
              <span>Emergency Halting</span>
            </button>
          </div>
        </div>

        {/* Engine metadata summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 border-t border-slate-800/60 pt-4">
          <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850">
            <span className="text-[10px] text-slate-550 font-bold uppercase font-mono tracking-wider block">Auto status</span>
            <span className={`font-mono text-sm font-black uppercase ${autoTradingEnabled ? 'text-emerald-400' : 'text-slate-400'}`}>
              {autoTradingEnabled ? 'ONLINE-ACTIVE' : 'STANDBY'}
            </span>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850">
            <span className="text-[10px] text-slate-550 font-bold uppercase font-mono tracking-wider block">Active algos</span>
            <span className="font-mono text-sm font-bold text-slate-200">
              {activeStrategiesCount} / {strategies.length} weight layers
            </span>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850">
            <span className="text-[10px] text-slate-550 font-bold uppercase font-mono tracking-wider block">Position counts</span>
            <span className="font-mono text-sm font-bold text-slate-200">
              {positions.length} active executions
            </span>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-850">
            <span className="text-[10px] text-slate-550 font-bold uppercase font-mono tracking-wider block">Reserved Margin</span>
            <span className="font-mono text-sm font-bold text-emerald-400">
              ${positions.reduce((acc, curr) => acc + curr.margin, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Positions Ledger and pending queue segment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Open positions ledger */}
        <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl shadow-lg">
          <h3 className="text-sm font-bold text-white mb-3">Active Open Leverage Contracts</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/85 text-slate-505 font-mono">
                  <th className="py-2.5">Asset</th>
                  <th className="py-2.5">Direction</th>
                  <th className="py-2.5 text-right">Size</th>
                  <th className="py-2.5 text-right">Entry Price</th>
                  <th className="py-2.5 text-right">Live Price</th>
                  <th className="py-2.5 text-right">Profit/Loss</th>
                  <th className="py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {positions.map((pos) => (
                  <tr key={pos.id} className="hover:bg-slate-850/10 transition-colors">
                    <td className="py-2.5">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-slate-100">{pos.symbol}</span>
                        <span className="text-[9px] text-slate-500 font-mono">Class: {pos.assetClass.toUpperCase()}</span>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <span className={`font-mono text-[10px] font-bold uppercase rounded px-1.5 py-0.2 border ${
                        pos.direction === 'long' 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-450'
                      }`}>
                        {pos.direction}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono text-slate-300 font-medium">{pos.size}</td>
                    <td className="py-2.5 text-right font-mono text-slate-450">${pos.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 5 })}</td>
                    <td className="py-2.5 text-right font-mono text-slate-205">${pos.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 5 })}</td>
                    <td className={`py-2.5 text-right font-mono font-bold ${pos.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)} ({pos.pnlPercent.toFixed(2)}%)
                    </td>
                    <td className="py-2.5 text-center">
                      <button
                        id={`btn-close-pos-${pos.id}`}
                        onClick={() => closePosition(pos.id)}
                        className="text-[10px] bg-rose-950/20 text-rose-400 hover:bg-rose-900 hover:text-white border border-rose-900/20 px-2.5 py-1 rounded transition-colors"
                      >
                        Liquidate
                      </button>
                    </td>
                  </tr>
                ))}
                {positions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-505">
                      No active leverage contracts open.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trade Queue Panel and recent trades */}
        <div className="space-y-6">
          {/* Limit Trade Queue */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl shadow-lg">
            <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
              <span>Limit Order Book queue</span>
            </h3>
            <p className="text-[10px] text-slate-550 mb-3 block">Deferred limit structures awaiting market crossing conditions</p>

            <div className="space-y-3">
              {tradeQueue.map((item) => (
                <div key={item.id} className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex items-center justify-between text-xs font-mono">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-105">{item.symbol}</span>
                      <span className="text-[9px] text-indigo-400 px-1 rounded bg-indigo-500/10">{item.direction}</span>
                    </div>
                    <span className="text-[9px] text-slate-500 block mt-0.5">Rule: {item.triggerType}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-205">${item.entryPrice.toLocaleString()}</span>
                    <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1 rounded block mt-0.5 w-fit ml-auto">{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Executions History Logs */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl shadow-lg">
            <h3 className="text-sm font-bold text-white mb-3">Consecutive executions logs</h3>
            <div className="space-y-3">
              {trades.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-205">{item.symbol}</span>
                      <span className={`font-mono text-[9px] px-1 rounded ${item.pnl >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-455'}`}>
                        {item.direction.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono">Algo: {item.strategy}</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-mono font-semibold ${item.pnl >= 0 ? 'text-emerald-400' : 'text-rose-405'}`}>
                      {item.pnl >= 0 ? '+' : ''}${item.pnl.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-slate-500 block font-mono">dur: {item.execTime}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs Overlay */}
      {activeDialog && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-4">
            <div className="h-12 w-12 rounded-full bg-slate-950 border border-slate-800 text-indigo-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                {activeDialog === 'enable_auto' && 'CONFIRM ENABLE AUTO TRADING'}
                {activeDialog === 'disable_auto' && 'CONFIRM SUSPEND AUTO TRADING'}
                {activeDialog === 'close_all' && 'CONFIRM FORCE CLOSE ALL'}
                {activeDialog === 'halt' && 'CONFIRM CRITICAL SYSTEM HALT'}
              </h4>
              <p className="text-xs text-slate-400 leading-normal">
                {activeDialog === 'enable_auto' && 'This enables non-interactive algorithmic entry. The engine is authorized to manage collateral loops and submit orders. Action requires margin backing.'}
                {activeDialog === 'disable_auto' && 'This pauses automated loops. Ongoing positions will require manual execution. Highly recommended if macro indicators are volatile.'}
                {activeDialog === 'close_all' && 'This liquidates all active leverage derivatives. Market slippage might affect resulting PnL logs.'}
                {activeDialog === 'halt' && 'This closes all active exposure and suspends the general execution core. Resuming will require institutional clearance.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                id="btn-confirm-cancel"
                onClick={() => setActiveDialog(null)}
                className="bg-transparent hover:bg-slate-850 p-2 text-xs rounded-lg font-semibold text-slate-400"
              >
                ABORT
              </button>
              <button
                id="btn-confirm-action"
                onClick={handleConfirmAction}
                className="bg-emerald-500 hover:bg-emerald-450 p-2 text-xs rounded-lg font-bold text-slate-950"
              >
                PROCEED
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
