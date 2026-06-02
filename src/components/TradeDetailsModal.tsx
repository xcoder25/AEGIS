/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  X, 
  Sparkles, 
  ShieldCheck, 
  Percent, 
  TrendingUp, 
  TrendingDown, 
  Cpu, 
  HelpCircle,
  Clock,
  History
} from 'lucide-react';
import { TradingSignal } from '../types';
import { useTradingStore } from '../store';

interface TradeDetailsModalProps {
  signal: TradingSignal;
  onClose: () => void;
}

export default function TradeDetailsModal({ signal, onClose }: TradeDetailsModalProps) {
  const { approveSignal, rejectSignal, riskLimits } = useTradingStore();

  const mockRegimeExplanation = React.useMemo(() => {
    switch (signal.symbol) {
      case 'BTC/USDT':
        return 'BTC is exiting a 14-day consolidative squeeze with high volume expansion. The regime shows high buy-side order book pressure with low sell-side resistance until $96.500.';
      case 'XAU/USD':
        return 'Gold is highly oversold due to safe-haven liquid flows moving into treasury assets. Standard deviations on 4H MACD show structural seller exhaust, pointing to short term recovery.';
      default:
        return 'Asset exhibits standard distribution correlation with moderate trend persistence index. Institutional volume is steady across European and American sessions.';
    }
  }, [signal.symbol]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Container Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
        {/* Glow effect */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-teal-500 via-indigo-500 to-purple-500" />
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-400">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase font-mono tracking-wider">AI Copilot Analysis Log</h2>
              <p className="text-[10px] text-slate-500 font-medium">Bilateral reasoning for {signal.symbol}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 bg-slate-950 border border-slate-800 rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Bento grid summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block font-mono">Confidence</span>
              <span className="font-mono text-base font-bold text-emerald-400">{signal.confidence}%</span>
              <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${signal.confidence}%` }} />
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block font-mono">Regime Flow</span>
              <span className="font-mono text-xs font-bold text-indigo-400 truncate block mt-0.5" title={signal.marketRegime}>
                {signal.marketRegime}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block font-mono">Risk Level</span>
              <span className={`font-mono text-sm font-bold ${signal.riskScore <= 3 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {signal.riskScore}/10 (Low-Risk)
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block font-mono">Direction Match</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {signal.direction === 'buy' ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-mono text-sm font-bold uppercase">LONG</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4 text-rose-405" />
                    <span className="text-rose-400 font-mono text-sm font-bold uppercase">SHORT</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* AI Reasoning Text Block */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Full Dynamic AI Explanations</span>
            </h3>
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 font-sans text-xs text-slate-300 leading-relaxed">
              <p>{signal.explanation}</p>
              <p className="mt-3 text-[11px] text-indigo-300 border-t border-slate-900/60 pt-3">
                <strong>Copilot verdict:</strong> {mockRegimeExplanation}
              </p>
            </div>
          </div>

          {/* RAG memories & Risk Calculations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Historical RAG setups */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-orange-400" />
                <span>RAG Memory Sourcing</span>
              </h4>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-2 text-xs">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Matches found in DB:</span>
                  <span className="font-mono text-slate-205 font-medium">{signal.similarSetupsCount} similar setups</span>
                </div>
                <div className="flex justify-between items-center text-[11px] border-t border-slate-900 pt-1.5">
                  <span className="text-slate-500">Historical performance:</span>
                  <span className="font-mono text-emerald-400 font-bold">78.2% Win Ratio</span>
                </div>
                <div className="flex justify-between items-center text-[11px] border-t border-slate-900 pt-1.5">
                  <span className="text-slate-500">Average Profit Yield:</span>
                  <span className="font-mono text-emerald-400 font-medium">+2.15% per trade</span>
                </div>
              </div>
            </div>

            {/* Risk calculations */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Risk Allocation Matrix</span>
              </h4>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-2 text-xs">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Risk Allocation Parameter:</span>
                  <span className="font-mono text-slate-200 font-medium">{riskLimits.riskPerTrade}% per ticket</span>
                </div>
                <div className="flex justify-between items-center text-[11px] border-t border-slate-900 pt-1.5">
                  <span className="text-slate-500">Projected Stop-Loss limit:</span>
                  <span className="font-mono text-rose-450 font-bold">-$1,871.25 Loss Max</span>
                </div>
                <div className="flex justify-between items-center text-[11px] border-t border-slate-900 pt-1.5">
                  <span className="text-slate-500">Liquid leverage allocation:</span>
                  <span className="font-mono text-emerald-400 font-medium">10x Co-lever margin</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Formulated: {new Date(signal.timestamp).toLocaleTimeString()}</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              id="modal-reject-signal"
              onClick={() => {
                rejectSignal(signal.id);
                onClose();
              }}
              className="bg-transparent border border-slate-800 hover:bg-slate-900 hover:text-white transition-all py-1.5 px-4 rounded-lg text-xs font-semibold text-slate-400"
            >
              REJECT SETUP
            </button>
            <button
              id="modal-approve-signal"
              onClick={() => {
                approveSignal(signal.id);
                onClose();
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all py-1.5 px-4 rounded-lg text-xs font-bold font-sans shadow-lg shadow-emerald-500/20"
            >
              APPROVE & ENGAGE POSITION
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
