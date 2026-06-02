/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRightLeft, 
  Search, 
  DollarSign, 
  ShieldCheck, 
  ShoppingBag,
  Zap
} from 'lucide-react';
import { useTradingStore } from '../store';
import { MarketAsset, AssetClass, Position } from '../types';

export default function MarketsView() {
  const { markets, positions, addNotification, riskLimits } = useTradingStore();
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset>(markets[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<AssetClass | 'all'>('all');

  // Order state
  const [tradeDirection, setTradeDirection] = useState<'long' | 'short'>('long');
  const [tradeSize, setTradeSize] = useState('0.10');
  const [leverage, setLeverage] = useState(10);
  const [successMsg, setSuccessMsg] = useState('');

  // Sift assets
  const filteredAssets = useMemo(() => {
    return markets.filter(m => {
      const matchesSearch = m.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            m.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === 'all' || m.assetClass === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [markets, searchQuery, activeTab]);

  // Execute quick order
  const handleExecuteOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const size = parseFloat(tradeSize);
    if (isNaN(size) || size <= 0) {
      addNotification('Order execution failed: Invalid size specified.', 'alert');
      return;
    }

    // Check risk rules
    if (positions.length >= riskLimits.maxOpenTrades) {
      addNotification(`Risk block: Exceeds max open trading limits (${riskLimits.maxOpenTrades}). Close other weights first.`, 'alert');
      return;
    }

    // Calculate simulated margin based on leverage selection
    const rawMargin = (size * selectedAsset.price) / leverage;
    
    const newPos: Position = {
      id: `pos-${Date.now()}`,
      symbol: selectedAsset.symbol,
      assetClass: selectedAsset.assetClass,
      direction: tradeDirection,
      size,
      entryPrice: selectedAsset.price,
      currentPrice: selectedAsset.price,
      pnl: 0,
      pnlPercent: 0,
      margin: parseFloat(rawMargin.toFixed(2)),
      isAuto: false,
      timestamp: new Date().toISOString()
    };

    // Push the position onto the Zustand lists safely
    useTradingStore.setState((state) => ({
      positions: [...state.positions, newPos],
      accountBalance: state.accountBalance - rawMargin
    }));

    addNotification(`ORDER EXECUTION SUCCESS: Opened ${tradeDirection.toUpperCase()} of ${size} ${selectedAsset.symbol} at $${selectedAsset.price} (${leverage}x loop-leverage).`, 'trade');
    
    setSuccessMsg(`Executed ${tradeDirection.toUpperCase()} ${size} ${selectedAsset.symbol}!`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Sparkline builder paths
  const renderSparkline = (history: number[], trend: 'up' | 'down' | 'neutral') => {
    if (!history || history.length === 0) return null;
    const min = Math.min(...history);
    const max = Math.max(...history);
    const range = max - min || 1;
    const width = 80;
    const height = 24;
    
    const points = history.map((val, idx) => {
      const x = (idx / (history.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    }).join(' ');

    const strokeColor = trend === 'up' ? '#10b981' : '#f43f5e';
    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Tickers layout panel */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">Institutional Multi-Asset Ledger</h2>
              <p className="text-[11px] text-slate-500">Live prices sourced from active liquid bridges</p>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                id="input-markets-search"
                type="text"
                placeholder="Search symbol, name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 text-xs text-slate-100 pl-8 pr-4 py-2 rounded-lg border border-slate-800 w-full md:w-56 focus:outline-none focus:border-slate-700"
              />
            </div>
          </div>

          {/* Navigation filter tabs */}
          <div className="flex gap-1.5 border-b border-slate-800/60 pb-3 mb-2 overflow-x-auto">
            {(['all', 'crypto', 'forex', 'commodity', 'index'] as const).map((tab) => (
              <button
                key={tab}
                id={`btn-market-tab-${tab}`}
                onClick={() => setActiveTab(tab)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium uppercase font-sans transition-all tracking-wider ${
                  activeTab === tab 
                    ? 'bg-slate-800 border-slate-700 text-emerald-400 font-semibold' 
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/85 text-slate-500 font-mono font-medium">
                  <th className="py-3">Asset Symbol</th>
                  <th className="py-3 text-right">Price</th>
                  <th className="py-3 text-right">Change 24h</th>
                  <th className="py-3 text-center hidden md:table-cell">Trend Wave</th>
                  <th className="py-3 text-right hidden lg:table-cell">Asset Cap / Volume</th>
                  <th className="py-3 text-center">Ticket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredAssets.map((asset) => (
                  <tr 
                    key={asset.symbol} 
                    className={`hover:bg-slate-850/20 transition-colors cursor-pointer ${selectedAsset.symbol === asset.symbol ? 'bg-slate-800/10' : ''}`}
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <td className="py-3 flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${
                        asset.trend === 'up' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-slate-100">{asset.symbol}</span>
                        <span className="text-[10px] text-slate-500 max-w-[120px] truncate">{asset.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-200">
                      {asset.price.toLocaleString(undefined, { 
                        minimumFractionDigits: asset.assetClass === 'forex' ? 5 : 2, 
                        maximumFractionDigits: asset.assetClass === 'forex' ? 5 : 2 
                      })}
                    </td>
                    <td className={`py-3 text-right font-mono font-bold ${asset.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
                      {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%
                    </td>
                    <td className="py-3 text-center hidden md:table-cell">
                      <div className="flex justify-center">
                        {renderSparkline(asset.history, asset.trend)}
                      </div>
                    </td>
                    <td className="py-3 text-right hidden lg:table-cell font-mono text-slate-400">
                      ${(asset.volume / 1000000).toFixed(1)}M
                    </td>
                    <td className="py-3 text-center">
                      <button
                        id={`btn-asset-select-${asset.symbol.toLowerCase().replace('/', '-')}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAsset(asset);
                        }}
                        className="text-[10px] bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-slate-300 hover:text-white"
                      >
                        Trade
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredAssets.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-505">
                      No multi-asset tickers match the query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Execution Ticket Card */}
      <div className="space-y-4">
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl shadow-lg relative overflow-hidden">
          {/* Neon background glare */}
          <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-indigo-500/10 to-indigo-500/0 rounded-full blur-2xl pointer-events-none" />
          
          <h3 className="text-base font-semibold text-white mb-1 leading-none uppercase tracking-wider flex items-center gap-2">
            <span>Execute Trading Ticket</span>
            <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded tracking-widest leading-none font-bold">MARGIN SPEC</span>
          </h3>
          <p className="text-[11px] text-slate-500 mb-4 font-sans">Submit instant leverage contracts directly into current system pool</p>

          <form onSubmit={handleExecuteOrder} className="space-y-4">
            {/* Target Selected Asset Details */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider font-mono">SELECTED ASSET</span>
                <span className="block font-mono text-sm font-bold text-slate-100">{selectedAsset.symbol}</span>
                <p className="text-[10px] text-slate-400 mt-1">{selectedAsset.name}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block font-mono">LIVE FEED</span>
                <span className="font-mono text-sm font-bold text-emerald-400">
                  {selectedAsset.price.toLocaleString(undefined, { 
                    minimumFractionDigits: selectedAsset.assetClass === 'forex' ? 5 : 2, 
                    maximumFractionDigits: selectedAsset.assetClass === 'forex' ? 5 : 2 
                  })}
                </span>
                <p className={`text-[10px] font-mono font-semibold mt-0.5 ${selectedAsset.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {selectedAsset.changePercent >= 0 ? '+' : ''}{selectedAsset.changePercent.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Direction Selection */}
            <div>
              <label className="block text-[10px] font-mono text-slate-400 font-bold mb-2 uppercase tracking-wide">Direction Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="trade-dir-long"
                  type="button"
                  onClick={() => setTradeDirection('long')}
                  className={`py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all border ${
                    tradeDirection === 'long' 
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400 shadow shadow-emerald-505' 
                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  LONG (Buy)
                </button>
                <button
                  id="trade-dir-short"
                  type="button"
                  onClick={() => setTradeDirection('short')}
                  className={`py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all border ${
                    tradeDirection === 'short' 
                      ? 'bg-rose-950/60 border-rose-500 text-rose-400 shadow shadow-rose-505' 
                      : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  SHORT (Sell)
                </button>
              </div>
            </div>

            {/* Trade Size & Leverage */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 font-bold mb-1.5 uppercase tracking-wide">Size (Qty)</label>
                <input
                  id="order-size-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={tradeSize}
                  onChange={(e) => setTradeSize(e.target.value)}
                  className="w-full bg-slate-950 text-xs text-slate-100 py-2.5 px-3 rounded-lg border border-slate-800 font-mono font-bold focus:outline-none focus:border-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-400 font-bold mb-1.5 uppercase tracking-wide">Leverage Loop</label>
                <select
                  id="order-leverage-select"
                  value={leverage}
                  onChange={(e) => setLeverage(parseInt(e.target.value))}
                  className="w-full bg-slate-950 text-xs text-slate-100 py-2.5 px-3 rounded-lg border border-slate-800 font-mono focus:outline-none focus:border-slate-700"
                >
                  <option value={1}>1x (No Leverage)</option>
                  <option value={5}>5x Leverage</option>
                  <option value={10}>10x Leverage</option>
                  <option value={20}>20x Leverage</option>
                  <option value={50}>50x Leverage</option>
                  <option value={100}>100x Pro Cap</option>
                </select>
              </div>
            </div>

            {/* Quick Estimation */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-850/80 text-[11px] font-mono space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Notional Exposure:</span>
                <span className="text-slate-300 font-bold">
                  ${(parseFloat(tradeSize || '0') * selectedAsset.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-900 pt-1.5">
                <span className="text-slate-500">Required Margin:</span>
                <span className="text-emerald-400 font-bold">
                  ${((parseFloat(tradeSize || '0') * selectedAsset.price) / leverage).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="submit-market-order"
              type="submit"
              className={`w-full py-2.5 rounded-lg text-xs font-semibold tracking-wider transition-all shadow-md ${
                tradeDirection === 'long'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
              }`}
            >
              TRANSMIT ORDER NOW
            </button>
          </form>

          {/* Success Dialog overlay */}
          {successMsg && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
              <div className="bg-slate-900 border border-emerald-500/50 p-4 rounded-xl shadow-2xl max-w-[240px] space-y-3">
                <div className="h-10 w-10 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6 animate-pulse" />
                </div>
                <h4 className="text-xs font-bold text-slate-100 uppercase font-sans tracking-wide">ORDER MATCHED</h4>
                <p className="text-[11px] text-slate-400 leading-normal">{successMsg}</p>
                <p className="text-[9px] text-slate-500 font-mono">Bilateral Execution Standard</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
