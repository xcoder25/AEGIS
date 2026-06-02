/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Enhanced Trading Dashboard featuring live lightweight-charts ticker graphics,
 * AI Signals panel, Copilot trade executors, and rolling WebSocket feeds.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  ShieldAlert, 
  Clock, 
  ArrowUpRight, 
  Layers,
  Activity,
  Zap,
  Sparkles,
  Shield,
  Briefcase,
  Play,
  Pause,
  AlertCircle,
  Check,
  X,
  Database,
  Sliders,
  ChevronRight,
  Info,
  SlidersHorizontal,
  Server
} from 'lucide-react';
import { createChart, ColorType, LineStyle, CandlestickSeries, LineSeries, createSeriesMarkers } from 'lightweight-charts';
import { useTradingStore } from '../store';
import { AssetClass, TradingSignal, Position } from '../types';

// Helper generator for realistic historical candles
const generateHistoryCandles = (symbol: string, currentPrice: number, count = 100) => {
  const candles = [];
  let price = currentPrice * 0.97; // Start lower for upward trend line
  const step = (currentPrice - price) / count;
  const now = Math.floor(Date.now() / 1000);
  const interval = 60 * 5; // 5 minute bars
  
  // Choose precision based on asset class
  const isForex = symbol.includes('/');
  const decimalCount = isForex && !symbol.includes('USDT') ? 5 : 2;

  for (let i = 0; i < count; i++) {
    const open = price;
    const volatility = currentPrice * 0.0025;
    // Upward bias
    const isUp = Math.random() > 0.45;
    const close = price + (isUp ? 1 : -1) * (Math.random() * volatility) + (step * 0.7);
    const high = Math.max(open, close) + (Math.random() * volatility * 0.4);
    const low = Math.min(open, close) - (Math.random() * volatility * 0.4);
    
    candles.push({
      time: now - (count - i) * interval,
      open: parseFloat(open.toFixed(decimalCount)),
      high: parseFloat(high.toFixed(decimalCount)),
      low: parseFloat(low.toFixed(decimalCount)),
      close: parseFloat(close.toFixed(decimalCount))
    });
    price = close;
  }
  
  // Pin final close price exactly to currentPrice
  candles[candles.length - 1].close = currentPrice;
  return candles;
};

// ────────────────────────────────────────────────────────────────
// SUB-COMPONENT: LIGHTWEIGHT TRADINGVIEW CANDLESTICK CHART
// ────────────────────────────────────────────────────────────────
interface LightweightChartProps {
  symbol: string;
  currentPrice: number;
  signals: TradingSignal[];
  positions: Position[];
}

function LiveTradingChart({ symbol, currentPrice, signals, positions }: LightweightChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const smaLineRef = useRef<any>(null);
  
  // Keep candles state stable to avoid complete re-renders of lightweight-charts
  const [candles, setCandles] = useState<any[]>([]);

  // Regenerate history when symbol changes
  useEffect(() => {
    const historical = generateHistoryCandles(symbol, currentPrice);
    setCandles(historical);
  }, [symbol]);

  // Handle live price ticks on the very last candle
  useEffect(() => {
    if (candles.length === 0) return;
    
    const updatedCandles = [...candles];
    const lastIdx = updatedCandles.length - 1;
    const lastCandle = { ...updatedCandles[lastIdx] };
    
    lastCandle.close = currentPrice;
    lastCandle.high = Math.max(lastCandle.high, currentPrice);
    lastCandle.low = Math.min(lastCandle.low, currentPrice);
    
    updatedCandles[lastIdx] = lastCandle;
    setCandles(updatedCandles);
    
    // Update series directly in real-time if active
    if (seriesRef.current) {
      seriesRef.current.update(lastCandle);
      
      // Update SMA line endpoint
      if (smaLineRef.current && updatedCandles.length >= 20) {
        const sum = updatedCandles.slice(-20).reduce((acc, c) => acc + c.close, 0);
        smaLineRef.current.update({
          time: lastCandle.time,
          value: parseFloat((sum / 20).toFixed(symbol.includes('EUR') || symbol.includes('GBP') ? 5 : 2))
        });
      }
    }
  }, [currentPrice, symbol]);

  // Build the chart widget
  useEffect(() => {
    if (!chartContainerRef.current) return;
    if (candles.length === 0) return;

    // Create central chart frame
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#090b11' },
        textColor: '#94a3b8',
        fontSize: 11,
        fontFamily: '"JetBrains Mono", monospace',
      },
      grid: {
        vertLines: { color: '#131825' },
        horzLines: { color: '#131825' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 350,
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        alignLabels: true,
      }
    });
    
    chartRef.current = chart;

    // Candlestick Series
    const candidateSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });
    seriesRef.current = candidateSeries;
    candidateSeries.setData(candles);

    // Dynamic 20-period Simple Moving Average Line
    const smaSeries = chart.addSeries(LineSeries, {
      color: '#6366f1',
      lineWidth: 2,
      priceLineVisible: false,
      title: 'SMA 20',
    });
    smaLineRef.current = smaSeries;

    const smaData = [];
    for (let i = 0; i < candles.length; i++) {
      if (i < 20) continue;
      const sum = candles.slice(i - 20, i).reduce((acc, c) => acc + c.close, 0);
      smaData.push({ 
        time: candles[i].time, 
        value: parseFloat((sum / 20).toFixed(symbol.includes('EUR') || symbol.includes('GBP') ? 5 : 2)) 
      });
    }
    smaSeries.setData(smaData);

    // Apply active signal markers to the chart
    // Filter signals corresponding to this active asset
    const activeSinglets = signals.filter(s => s.symbol === symbol);
    if (activeSinglets.length > 0) {
      const markers = activeSinglets.map((sig, idx) => {
        const isBuy = sig.direction === 'buy';
        // Place marker slightly spaced inside history array
        const barIndex = Math.max(10, candles.length - 1 - (idx * 5));
        const barTime = candles[barIndex]?.time || candles[candles.length - 1].time;
        
        return {
          time: barTime,
          position: isBuy ? 'belowBar' as const : 'aboveBar' as const,
          color: isBuy ? '#10b981' : '#f43f5e',
          shape: isBuy ? 'arrowUp' as const : 'arrowDown' as const,
          text: `AI ${sig.direction.toUpperCase()}`
        };
      });
      createSeriesMarkers(candidateSeries as any, markers as any);
    }

    // Drawing position overlays (dashed entry lines)
    const activePositions = positions.filter(p => p.symbol === symbol);
    const positionLines: any[] = [];
    
    activePositions.forEach(pos => {
      const line = candidateSeries.createPriceLine({
        price: pos.entryPrice,
        color: pos.direction === 'long' ? '#10b981' : '#f43f5e',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `ENTRY (${pos.direction.toUpperCase()}) $${pos.entryPrice}`,
      });
      positionLines.push(line);
    });

    // Auto fit visual bounds
    chart.timeScale().fitContent();

    // Setup responsive size handler
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      positionLines.forEach(line => candidateSeries.removePriceLine(line));
      chart.remove();
    };
  }, [candles, symbol, signals, positions]);

  return (
    <div className="relative bg-slate-950 p-2 rounded-xl border border-slate-900/60 shadow-inner">
      <div className="absolute top-3 left-4 z-10 flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded border border-slate-800 text-[10px] font-mono text-indigo-400">
        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />
        <span>LIVE FEEDS: {symbol}</span>
      </div>
      <div ref={chartContainerRef} className="w-full h-[350px]" />
    </div>
  );
}

export default function DashboardView() {
  const { 
    accountBalance, 
    equity, 
    dailyPnL, 
    weeklyPnL, 
    winRate, 
    maxDrawdown, 
    drawdownPercent,
    markets,
    positions,
    signals,
    autoTradingEnabled,
    toggleAutoTrading,
    approveSignal,
    rejectSignal,
    closePosition,
    addNotification
  } = useTradingStore();

  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
  const [assetFilter, setAssetFilter] = useState<AssetClass | 'all'>('all');
  
  // Trade execution inputs
  const [tradeSize, setTradeSize] = useState<number>(1000);
  const [stopLoss, setStopLoss] = useState<number>(1.5);
  const [takeProfit, setTakeProfit] = useState<number>(3.0);
  const [riskLimit, setRiskLimit] = useState<number>(1.5);
  
  // Live simulation log states
  const [feedLogs, setFeedLogs] = useState<string[]>([]);
  
  // Mobile sub-tabs
  const [mobileSubTab, setMobileSubTab] = useState<'overview' | 'chart' | 'signals' | 'execution'>('overview');

  // Load the active asset metadata
  const selectedAsset = useMemo(() => {
    return markets.find(m => m.symbol === selectedSymbol) || markets[0];
  }, [markets, selectedSymbol]);

  // Find if there is a pending signal for the active asset for the AI Decision block
  const activePendingSignal = useMemo(() => {
    return signals.find(s => s.symbol === selectedSymbol && s.status === 'pending');
  }, [signals, selectedSymbol]);

  // Quick direct trade placing manually from execution panels
  const executeDirectTrade = (direction: 'long' | 'short') => {
    if (positions.length >= 5) {
      addNotification("Risk Limit Alert: Maximum open positions reaches risk limit. Close active positions first.", "alert");
      return;
    }

    const entryPrice = selectedAsset.price;
    const decimalCount = selectedSymbol.includes('EUR') || selectedSymbol.includes('GBP') ? 2 : 4;
    const computedSize = parseFloat((tradeSize / entryPrice).toFixed(decimalCount));

    const newPos: Position = {
      id: `pos-direct-${Date.now()}`,
      symbol: selectedSymbol,
      assetClass: selectedAsset.assetClass,
      direction,
      size: computedSize > 0 ? computedSize : 1,
      entryPrice,
      currentPrice: entryPrice,
      pnl: 0,
      pnlPercent: 0,
      margin: tradeSize,
      isAuto: false,
      timestamp: new Date().toISOString()
    };

    // Push into store positions
    useTradingStore.setState((state) => ({
      positions: [...state.positions, newPos],
      accountBalance: state.accountBalance - tradeSize
    }));

    addNotification(`Manual Execution: Successfully entered ${direction.toUpperCase()} trade on ${selectedSymbol} for $${tradeSize}`, "trade");
    
    // Log in WebSocket Feed
    setFeedLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ORDER EXECUTED: Direct manual ${direction.toUpperCase()} order matched ${computedSize} units @ $${entryPrice}`
    ]);
  };

  // Populate rolling real-time stream logs
  useEffect(() => {
    setFeedLogs([
      `[${new Date(Date.now() - 25000).toLocaleTimeString()}] NET: Secure socket handshake completed with clearing house.`,
      `[${new Date(Date.now() - 20000).toLocaleTimeString()}] DEPTH: Strong liquidity spreads verified on ${selectedSymbol}`,
      `[${new Date(Date.now() - 15000).toLocaleTimeString()}] FEED: Parsing orderbook depths on matching pools...`,
      `[${new Date(Date.now() - 10000).toLocaleTimeString()}] REGIME: Pattern diagnostics computed: Low Volatility Channel`,
      `[${new Date(Date.now() - 5000).toLocaleTimeString()}] SCAN: Checked 5 standard RAG memories matching structure.`
    ]);

    const timer = setInterval(() => {
      const asset = useTradingStore.getState().markets.find(m => m.symbol === selectedSymbol) || selectedAsset;
      const roundedPrice = selectedSymbol.includes('EUR') || selectedSymbol.includes('GBP') ? asset.price.toFixed(5) : asset.price.toFixed(2);
      
      const events = [
        `[${new Date().toLocaleTimeString()}] TICK: ${selectedSymbol} price updated to $${roundedPrice}`,
        `[${new Date().toLocaleTimeString()}] FEED: Bid/Ask spread updated to ${(Math.random() * 0.03 + 0.01).toFixed(4)}% width`,
        `[${new Date().toLocaleTimeString()}] VECTOR: Matching high interval moving resistance at $${(asset.price * 1.01).toFixed(selectedSymbol.includes('EUR') ? 4 : 1)}`,
        `[${new Date().toLocaleTimeString()}] QUANT: Computed breakout pattern factor = ${(Math.random() * 85 + 10).toFixed(1)}% weight`,
        `[${new Date().toLocaleTimeString()}] SYSTEM: Dynamic database telemetry synchronized (No leaks detected)`,
        `[${new Date().toLocaleTimeString()}] TRIGGER: Evaluated daily margin usage: ${( (positions.reduce((a,c) => a + c.margin, 0) / accountBalance) * 100 ).toFixed(2) }%`
      ];
      
      const randomEvent = events[Math.floor(Math.random() * events.length)];
      setFeedLogs(prev => [...prev.slice(-35), randomEvent]);
    }, 4500);

    return () => clearInterval(timer);
  }, [selectedSymbol]);

  // Filters assets listings
  const filteredMarkets = useMemo(() => {
    if (assetFilter === 'all') return markets;
    return markets.filter(m => m.assetClass === assetFilter);
  }, [markets, assetFilter]);

  return (
    <div id="dashboard-viewport-root" className="space-y-6">
      
      {/* ────────────────────────────────────────────────────────────────
          METRICS HEADER STRIP (Desktop & Tablet)
          ──────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4" id="stats-strip-row">
        
        {/* Card 1: Balance */}
        <div className="bg-[#121622]/40 backdrop-blur-md border border-slate-900/80 p-4 rounded-xl flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold">Account Cash</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-left">
            <span className="font-mono text-lg font-bold text-white block">
              ${accountBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block mt-1">Available to use</span>
          </div>
        </div>

        {/* Card 2: Net Equity */}
        <div className="bg-[#121622]/40 backdrop-blur-md border border-slate-900/80 p-4 rounded-xl flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold">Total Account Value</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-left">
            <span className="font-mono text-lg font-bold text-white block">
              ${equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] text-indigo-450 font-mono uppercase tracking-wider block mt-1">Balance + Open PnL</span>
          </div>
        </div>

        {/* Card 3: Daily PnL */}
        <div className="bg-[#121622]/40 backdrop-blur-md border border-slate-900/80 p-4 rounded-xl flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold">Today's Profit</span>
            {dailyPnL >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-rose-450" />}
          </div>
          <div className="mt-2 text-left">
            <span className={`font-mono text-lg font-bold block ${dailyPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {dailyPnL >= 0 ? '+' : ''}${dailyPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block mt-1">Real-time daily delta</span>
          </div>
        </div>

        {/* Card 4: Weekly PnL */}
        <div className="bg-[#121622]/40 backdrop-blur-md border border-slate-900/80 p-4 rounded-xl flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold">Weekly Profit</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-left">
            <span className="font-mono text-lg font-bold text-slate-200 block">
              +${weeklyPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block mt-1">Rolling 7-day total</span>
          </div>
        </div>

        {/* Card 5: Win Rate */}
        <div className="bg-[#121622]/40 backdrop-blur-md border border-slate-900/80 p-4 rounded-xl flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold">Winning Rate</span>
            <Percent className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-left">
            <span className="font-mono text-lg font-bold text-white block">
              {winRate}%
            </span>
            <span className="text-[9px] text-emerald-400 font-mono uppercase tracking-wider block mt-1">Close setup ratio</span>
          </div>
        </div>

        {/* Card 6: Drawdown */}
        <div className="bg-[#121622]/40 backdrop-blur-md border border-slate-900/80 p-4 rounded-xl flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-semibold">Active Drawdown</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-left">
            <span className="font-mono text-lg font-bold text-rose-450 block">
              {drawdownPercent}%
            </span>
            <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block mt-1">Risk Limit: {maxDrawdown}%</span>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          DESKTOP WORKSPACE LAYOUT
          ──────────────────────────────────────────────────────────────── */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-desktop-grid">
        
        {/* LEFT COLUMN: ACTIVE TRADING SYSTEM & CHART DISPLAY (Spans 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Chart Card header with dynamic Asset Ticker Selection */}
          <div className="bg-[#121622]/40 backdrop-blur-md border border-slate-900/80 rounded-xl p-5 shadow-lg space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5 font-display">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span>Real-time Technical Analysis Terminal</span>
                </h3>
                <p className="text-[11px] text-slate-500">Live price feeds, overlay indicators, signal triggers, and entry indicators</p>
              </div>

              {/* Ticker Dropdown Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono uppercase font-bold">Trading Symbol:</span>
                <select 
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-white font-mono rounded px-3 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {markets.map(m => (
                    <option key={m.symbol} value={m.symbol}>
                      {m.symbol} ({m.name.split(' ')[0]})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Injected Candlestick Interactive Chart (TradingView style) */}
            <LiveTradingChart 
              symbol={selectedSymbol} 
              currentPrice={selectedAsset.price}
              signals={signals}
              positions={positions}
            />

            {/* Live Quotes and Key Indicators Grid */}
            <div className="grid grid-cols-4 gap-2.5 bg-slate-950 p-3 rounded-lg border border-slate-900/60 font-mono text-[11px]">
              <div>
                <span className="text-slate-500 block uppercase text-[8.5px]">Open Price</span>
                <span className="text-slate-300 font-bold">
                  ${(selectedAsset.price * 0.992).toLocaleString(undefined, { maximumFractionDigits: selectedSymbol.includes('EUR') ? 5 : 2 })}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase text-[8.5px]">Daily High</span>
                <span className="text-emerald-400 font-bold">
                  ${Math.max(selectedAsset.price, selectedAsset.price * (1 + selectedAsset.changePercent*0.01)).toLocaleString(undefined, { maximumFractionDigits: selectedSymbol.includes('EUR') ? 5 : 2 })}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase text-[8.5px]">Daily Low</span>
                <span className="text-rose-400 font-bold">
                  ${Math.min(selectedAsset.price, selectedAsset.price * (1 - selectedAsset.changePercent*0.01)).toLocaleString(undefined, { maximumFractionDigits: selectedSymbol.includes('EUR') ? 5 : 2 })}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase text-[8.5px]">Spread Width</span>
                <span className="text-indigo-400 font-bold">
                  {selectedSymbol.includes('EUR') || selectedSymbol.includes('GBP') ? '0.00010 (Tight)' : '0.15 USDT (Highly Liquid)'}
                </span>
              </div>
            </div>
          </div>

          {/* AI SIGS & RECOMMENDATIONS PANEL */}
          <div className="bg-[#121622]/40 backdrop-blur-md border border-slate-900/80 rounded-xl p-5 shadow-lg space-y-4">
            
            <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5 col-span-2">
                  <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                  <span>AI Copilot Analysis Decision-Board</span>
                </h3>
                <p className="text-[11px] text-slate-500">Live orderbook diagnostics, vector correlations, and execution triggers</p>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
                Regime Status: Normal
              </span>
            </div>

            {/* Dynamic Sourcing Render */}
            {activePendingSignal ? (
              <div className="bg-indigo-950/15 border border-indigo-500/20 p-4 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg font-mono font-bold text-sm tracking-wider flex items-center gap-1 uppercase border ${
                      activePendingSignal.direction === 'buy' 
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
                        : 'bg-rose-500/10 border-rose-500/25 text-rose-450'
                    }`}>
                      <Info className="w-4 h-4 shrink-0" />
                      <span>RECOMMENDED DETECTED SETUP: {activePendingSignal.direction === 'buy' ? 'BUY LONG' : 'SELL SHORT'}</span>
                    </div>
                  </div>
                  
                  {/* Gauge/Confidence bar representation */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400 font-mono">CONFIDENCE RATE:</span>
                    <div className="bg-slate-950 p-1.5 rounded border border-slate-800 flex items-center gap-1.5 font-mono text-xs text-white font-extrabold shadow-inner">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                      <span>{activePendingSignal.confidence}%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">Sourced reasoning rationale (RAG Output)</div>
                  <p className="text-slate-300 text-xs leading-relaxed font-sans bg-slate-950/60 p-3 rounded-lg border border-slate-900 flex gap-2">
                    <Database className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{activePendingSignal.explanation}</span>
                  </p>
                </div>

                {/* Micro indicators indicators */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                  <div className="bg-slate-950 p-2 rounded border border-slate-900/60 text-slate-400">
                    <span className="text-[9px] text-slate-500 block font-semibold uppercase">Indicator Logic:</span>
                    <span className="text-white font-bold">{activePendingSignal.strategy}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-900/60 text-slate-400">
                    <span className="text-[9px] text-slate-500 block font-semibold uppercase">Market Regime:</span>
                    <span className="text-indigo-400 font-bold">{activePendingSignal.marketRegime}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-900/60 text-slate-400 col-span-2 sm:col-span-1">
                    <span className="text-[9px] text-slate-500 block font-semibold uppercase">Pattern matching:</span>
                    <span className="text-emerald-400 font-bold">{activePendingSignal.similarSetupsCount} Similar Sets</span>
                  </div>
                </div>

                {/* Core Approval Actions */}
                <div className="flex gap-3 pt-1">
                  <button 
                    onClick={() => {
                      rejectSignal(activePendingSignal.id);
                      setFeedLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] USER REJECTED: Suspended trade execution loop on ${selectedSymbol}`]);
                    }}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:text-white text-slate-300 font-bold text-xs py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-4 h-4 text-rose-500" />
                    DISCARD & REJECT SETUP
                  </button>
                  <button 
                    onClick={() => {
                      approveSignal(activePendingSignal.id);
                      setFeedLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] USER APPROVED: Dispatched automatic trade placement order to ledger`]);
                    }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-lg transition-colors shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4 text-emerald-300" />
                    APPROVE COPILOT EXECUTION
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-905 flex flex-col items-center justify-center py-7 text-center space-y-2.5">
                <AlertCircle className="w-8 h-8 text-indigo-400" />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-300 font-display block uppercase">No Pending Sourced Setups on {selectedSymbol}</span>
                  <p className="text-[11px] text-slate-500">Orderbook spreads are balanced. Matrix scanner is continuously scanning for liquidity pools breakout markers.</p>
                </div>
                <div className="bg-slate-900/40 p-2.5 rounded-lg max-w-lg border border-slate-900 text-[11px] font-mono text-zinc-400">
                  <span className="text-indigo-400 font-bold">Dynamic AI Scanning feedback:</span> Awaiting NY session liquidity convergence. Consecutive trends reside within standard safe bounds. Feel free to use the manual execution widgets below to directly dispatch standard orders.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE EXECUTION BOX, FEEDS & PORTFOLIO EXPOSURE (1 col) */}
        <div className="space-y-6">
          
          {/* TRADE ACTION & RISK PANEL */}
          <div className="bg-[#121622]/40 backdrop-blur-md border border-slate-900/80 rounded-xl p-5 shadow-lg space-y-4">
            
            <div className="border-b border-zinc-900 pb-2 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase font-display">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Execution Controls</span>
                </h3>
                <p className="text-[11px] text-slate-500">Dispatch direct manual orders and modify risks</p>
              </div>
            </div>

            {/* Engine system selector: Auto vs Copilot */}
            <div className="bg-slate-950 border border-slate-900 p-3.5 rounded-lg space-y-2.5">
              <span className="text-[9px] text-slate-400 font-mono font-bold block uppercase tracking-wider">ACTIVE ENGINE SCHEME</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button 
                  onClick={() => {
                    if (autoTradingEnabled) toggleAutoTrading();
                  }}
                  className={`py-2 px-2.5 rounded-lg font-bold transition-all uppercase flex flex-col items-center justify-center gap-1 border ${
                    !autoTradingEnabled 
                      ? 'bg-indigo-950/20 border-indigo-500/20 text-indigo-400 shadow shadow-indigo-500/5' 
                      : 'bg-slate-900 border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span className="text-[11px]">AI Copilot Mode</span>
                  <span className="text-[8px] font-mono font-normal lowercase text-slate-500 block">Manual Approvals</span>
                </button>
                <button 
                  onClick={() => {
                    if (!autoTradingEnabled) toggleAutoTrading();
                  }}
                  className={`py-2 px-2.5 rounded-lg font-bold transition-all uppercase flex flex-col items-center justify-center gap-1 border ${
                    autoTradingEnabled 
                      ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400 shadow shadow-emerald-500/5' 
                      : 'bg-slate-900 border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span className="text-[11px]">Auto trading mode</span>
                  <span className="text-[8px] font-mono font-normal lowercase text-slate-500 block">Fully Autonomous</span>
                </button>
              </div>

              {autoTradingEnabled && (
                <div className="bg-emerald-950/15 border border-emerald-500/10 p-2.5 rounded text-[10px] text-emerald-400 leading-normal flex items-start gap-1.5 font-sans">
                  <Play className="w-3.5 h-3.5 fill-current animate-pulse shrink-0 mt-0.5" />
                  <span>Aegis machine mode active. Safe execution protocols are dispatched automatically when matched confidence rates exceed 80%.</span>
                </div>
              )}
            </div>

            {/* Direct Trade Size Form */}
            <div className="space-y-3 font-mono text-xs">
              
              <div className="space-y-1.5">
                <div className="flex justify-between font-bold text-[10px] text-slate-400">
                  <span className="uppercase">POSITION MARGIN (USD)</span>
                  <span className="text-white">${tradeSize.toLocaleString()}</span>
                </div>
                <input 
                  type="range"
                  min={250}
                  max={10000}
                  step={250}
                  value={tradeSize}
                  onChange={(e) => setTradeSize(parseInt(e.target.value))}
                  className="w-full accent-indigo-550 h-1.5 bg-slate-900 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-500 uppercase">
                  <span>Min: $250</span>
                  <span>Leveraged Value: ${(tradeSize * 10).toLocaleString()} (10x Default)</span>
                  <span>Max: $10,000</span>
                </div>
              </div>

              {/* Advanced Risk settings Sliders */}
              <div className="bg-slate-950/30 p-3 rounded-lg border border-slate-900/60 space-y-3">
                <h4 className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                  <SlidersHorizontal className="w-3 h-3 text-indigo-400" />
                  <span>RISK TOLERANCE PRESETS</span>
                </h4>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-[9.5px]">
                    <span className="text-slate-500 block uppercase">Stop Loss Alert Limit</span>
                    <span className="text-zinc-300 font-bold">{stopLoss}%</span>
                  </div>
                  <input 
                    type="range" 
                    min={0.5} 
                    max={5.0} 
                    step={0.1}
                    value={stopLoss} 
                    onChange={(e) => setStopLoss(parseFloat(e.target.value))}
                    className="w-full accent-rose-450 h-1 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[9.5px]">
                    <span className="text-slate-500 block uppercase">Target Take Profit</span>
                    <span className="text-zinc-300 font-bold">{takeProfit}%</span>
                  </div>
                  <input 
                    type="range" 
                    min={1.0} 
                    max={10.0} 
                    step={0.2}
                    value={takeProfit} 
                    onChange={(e) => setTakeProfit(parseFloat(e.target.value))}
                    className="w-full accent-emerald-450 h-1 cursor-pointer"
                  />
                </div>
              </div>

              {/* Direct action triggers */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  onClick={() => executeDirectTrade('short')}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs py-3 rounded-xl transition-all border border-rose-500/20 cursor-pointer flex flex-col items-center justify-center leading-tight gap-0.5"
                >
                  <TrendingDown className="w-4 h-4 text-rose-450" />
                  <span className="uppercase text-[11px] block mt-0.5">DIRECT SELL</span>
                  <span className="text-[8px] font-mono text-zinc-500 font-normal">Sells {selectedSymbol} Spot</span>
                </button>
                <button 
                  onClick={() => executeDirectTrade('long')}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs py-3 rounded-xl transition-all border border-emerald-500/20 cursor-pointer flex flex-col items-center justify-center leading-tight gap-0.5"
                >
                  <TrendingUp className="w-4 h-4 text-emerald-450" />
                  <span className="uppercase text-[11px] block mt-0.5">DIRECT BUY</span>
                  <span className="text-[8px] font-mono text-zinc-500 font-normal">Buys {selectedSymbol} Spot</span>
                </button>
              </div>

            </div>
          </div>

          {/* REAL TIME WEBSOCKET FEED MONITOR */}
          <div className="bg-[#121622]/40 backdrop-blur-md border border-slate-900/80 rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-zinc-900">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Websocket Network Output</span>
              </h4>
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow shadow-emerald-400" />
            </div>

            <div className="bg-slate-950 border border-slate-905 p-3 rounded-lg font-mono text-[9px] text-indigo-400 space-y-1.5 h-36 overflow-y-auto select-none pr-1">
              {feedLogs.map((log, i) => (
                <p key={`feed-log-${i}`} className={`leading-normal border-l-2 pl-2 ${
                  log.includes('EXECUTED') || log.includes('BUY') || log.includes('TICK')
                    ? 'border-emerald-500 text-emerald-400/90' 
                    : log.includes('REJECTED') || log.includes('Suspended')
                    ? 'border-rose-500 text-rose-350/90'
                    : 'border-indigo-650 text-slate-400'
                }`}>
                  {log}
                </p>
              ))}
            </div>
            <span className="text-[9px] text-zinc-500 font-mono text-center block leading-none">Automatic rolling updates enabled (4500ms bounds)</span>
          </div>

          {/* ACTIVE POSITION MONITOR DISPLAY */}
          <div className="bg-[#121622]/40 backdrop-blur-md border border-slate-900/80 rounded-xl p-5 shadow-lg space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                <span>My Active Positions ({positions.length})</span>
              </h3>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {positions.map((pos) => (
                <div key={pos.id} className="bg-slate-950 border border-slate-900 p-3 rounded-lg flex items-center justify-between hover:border-slate-800 transition-all font-mono text-xs">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-bold">{pos.symbol}</span>
                      <span className={`text-[8px] uppercase px-1 py-0.5 rounded font-extrabold ${
                        pos.direction === 'long' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-450'
                      }`}>
                        {pos.direction}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-500 mt-1 block">Entry: ${pos.entryPrice.toLocaleString()} • Size: {pos.size}</span>
                  </div>

                  <div className="text-right flex items-center gap-2.5">
                    <div>
                      <span className={`block font-bold ${pos.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                      </span>
                      <span className={`text-[9px] ${pos.pnl >= 0 ? 'text-emerald-500/80' : 'text-rose-450/80'}`}>
                        {pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(2)}%
                      </span>
                    </div>
                    
                    <button 
                      onClick={() => {
                        closePosition(pos.id);
                        setFeedLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ORDER EXECUTED: Closed ${pos.symbol} ${pos.direction.toUpperCase()} market order.`]);
                      }}
                      className="p-1 text-slate-400 hover:text-white bg-slate-900 hover:bg-rose-950 border border-slate-850 rounded text-[10px] cursor-pointer"
                      title="Liquidate Trade"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {positions.length === 0 && (
                <div className="text-center py-7 border border-dashed border-slate-900 rounded-lg text-slate-500 text-[11px] font-sans">
                  No active margin exposure records found.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ────────────────────────────────────────────────────────────────
          MOBILE WORKSPACE LAYOUT
          ──────────────────────────────────────────────────────────────── */}
      <div className="block md:hidden space-y-4 px-1 pb-10" id="dashboard-mobile-view">
        
        {/* Tab Selection Menus */}
        <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-900 shadow-inner text-center font-semibold text-xs text-slate-500">
          <button 
            onClick={() => setMobileSubTab('overview')}
            className={`py-2 rounded-lg transition-all ${mobileSubTab === 'overview' ? 'bg-slate-900 text-white shadow font-bold' : ''}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setMobileSubTab('chart')}
            className={`py-2 rounded-lg transition-all ${mobileSubTab === 'chart' ? 'bg-slate-900 text-white shadow font-bold' : ''}`}
          >
            Charts
          </button>
          <button 
            onClick={() => setMobileSubTab('signals')}
            className={`py-2 rounded-lg transition-all ${mobileSubTab === 'signals' ? 'bg-slate-900 text-white shadow font-bold' : ''}`}
          >
            Signals
          </button>
          <button 
            onClick={() => setMobileSubTab('execution')}
            className={`py-2 rounded-lg transition-all ${mobileSubTab === 'execution' ? 'bg-slate-900 text-white shadow font-bold' : ''}`}
          >
            Actions
          </button>
        </div>

        {/* MOBILE CONTAINER SWITCHER */}
        
        {/* Mobile Tab 1: Sourced values card elements */}
        {mobileSubTab === 'overview' && (
          <div className="space-y-4" id="m-draw-overview">
            
            {/* Net account gradient view card */}
            <div className="relative bg-gradient-to-br from-indigo-950/45 via-slate-900/90 to-zinc-950 border border-indigo-500/10 rounded-2xl p-5 overflow-hidden shadow-2xl">
              <div className="absolute top-[10%] right-[10%] w-32 h-32 rounded-full bg-indigo-500/5 blur-xl pointer-events-none" />
              
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono text-indigo-400 block uppercase font-bold tracking-widest">TOTAL ACCOUNT VALUE</span>
                  <p className="text-3xl font-mono font-bold text-white tracking-tight mt-1">
                    ${equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <Sparkles className="w-5 h-5 text-indigo-405" />
              </div>

              <div className="mt-5 pt-3 border-t border-slate-900 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-500 font-mono block uppercase">AVAILABLE CASH</span>
                  <span className="text-sm font-mono font-bold text-slate-350">
                    ${accountBalance.toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-500 font-mono block uppercase">Today's delta</span>
                  <div className="flex items-center gap-0.5 text-emerald-400 font-mono text-xs font-bold justify-end mt-0.5">
                    <TrendingUp className="w-3.5 h-3.5 animate-pulse" />
                    <span>+{((dailyPnL / accountBalance) * 100).toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 border border-slate-900 p-3 rounded-xl">
                <span className="text-slate-500 text-[10px] block font-mono uppercase">Today's Profit</span>
                <span className={`text-sm font-mono font-extrabold block mt-1 ${dailyPnL >= 0 ? 'text-emerald-450' : 'text-rose-450'}`}>
                  {dailyPnL >= 0 ? '+' : ''}${dailyPnL.toFixed(0)}
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-900 p-3 rounded-xl">
                <span className="text-slate-500 text-[10px] block font-mono uppercase">Win Rate Close</span>
                <span className="text-sm font-mono font-extrabold text-white block mt-1">{winRate}%</span>
              </div>
              <div className="bg-slate-950 border border-slate-900 p-3 rounded-xl">
                <span className="text-slate-500 text-[10px] block font-mono uppercase">7-Day Change</span>
                <span className="text-sm font-mono font-extrabold text-indigo-400 block mt-1">+${weeklyPnL.toFixed(0)}</span>
              </div>
              <div className="bg-slate-950 border border-slate-900 p-3 rounded-xl">
                <span className="text-slate-500 text-[10px] block font-mono uppercase">Drawdown Risk</span>
                <span className="text-sm font-mono font-extrabold text-rose-455 block mt-1">{drawdownPercent}%</span>
              </div>
            </div>

            {/* Quick Switch for Auto Machine Mode */}
            <div className={`p-4 rounded-xl border transition-all duration-300 ${
              autoTradingEnabled 
                ? 'bg-emerald-950/10 border-emerald-500/20' 
                : 'bg-slate-950 border-slate-900'
            }`}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${autoTradingEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Aegis Auto Trading</h4>
                    <span className="text-[9px] text-slate-500 block">AI Automated position management</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={toggleAutoTrading}
                className={`w-full py-2.5 rounded-lg text-xs font-bold uppercase transition-all duration-300 flex items-center justify-center gap-2 border font-mono ${
                  autoTradingEnabled 
                    ? 'bg-emerald-500 border-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' 
                    : 'bg-slate-800 border-slate-750 text-white'
                }`}
              >
                {autoTradingEnabled ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    SUSPEND AUTONOMOUS ENGINE
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    ENGAGE AEGIS AUTONOMOUS TRADING
                  </>
                )}
              </button>
            </div>

            {/* Quick Watchlist summary */}
            <div className="bg-[#121622]/40 backdrop-blur-md border border-slate-900/80 p-4 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                <span>Select Asset Context:</span>
                <span className="text-[10px] text-indigo-400 font-mono">{selectedSymbol}</span>
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {markets.map(asset => (
                  <button
                    key={`m-asset-${asset.symbol}`}
                    onClick={() => setSelectedSymbol(asset.symbol)}
                    className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between text-xs transition-colors ${
                      selectedSymbol === asset.symbol 
                        ? 'bg-indigo-950/20 border border-indigo-500/20 text-white' 
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <div>
                      <span className="font-mono font-bold block">{asset.symbol}</span>
                      <span className="text-[9px] text-slate-500 block truncate max-w-[130px]">{asset.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold block">${asset.price.toLocaleString(undefined, { maximumFractionDigits: asset.assetClass === 'forex' ? 4 : 2 })}</span>
                      <span className={`text-[10px] font-mono font-semibold ${asset.changePercent >= 0 ? 'text-emerald-450' : 'text-rose-450'}`}>
                        {asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Mobile Tab 2: Sourced Lightweight Chart Widget */}
        {mobileSubTab === 'chart' && (
          <div className="space-y-4" id="m-draw-chart">
            <div className="bg-[#121622]/40 border border-slate-900/80 p-4 rounded-xl space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                <span className="font-mono font-bold text-white text-xs">Symbol: {selectedSymbol}</span>
                <span className="font-mono font-bold text-emerald-400 text-xs">${selectedAsset.price.toLocaleString(undefined, { maximumFractionDigits: selectedSymbol.includes('EUR') ? 4 : 2 })}</span>
              </div>
              
              <LiveTradingChart 
                symbol={selectedSymbol} 
                currentPrice={selectedAsset.price}
                signals={signals}
                positions={positions}
              />
            </div>
          </div>
        )}

        {/* Mobile Tab 3: Sourced Signals Panel */}
        {mobileSubTab === 'signals' && (
          <div className="space-y-4" id="m-draw-signals">
            <div className="bg-[#121622]/40 border border-slate-900 p-4 rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-900 flex justify-between items-center">
                <span>AI Sourced Diagnostics</span>
                <span className="font-mono text-[10px] text-slate-500">{selectedSymbol}</span>
              </h3>

              {activePendingSignal ? (
                <div className="space-y-3 font-sans text-xs">
                  <div className={`p-2.5 rounded-lg font-mono font-extrabold text-center uppercase ${
                    activePendingSignal.direction === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-450'
                  }`}>
                    RECOMMENDED ACTIONS: {activePendingSignal.direction.toUpperCase()} ({activePendingSignal.confidence}% Confidence)
                  </div>
                  
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-900/80 leading-relaxed font-sans text-slate-300">
                    <span className="font-mono block border-b border-slate-900 pb-1.5 font-bold uppercase text-indigo-400 tracking-wider text-[10px] mb-1.5 flex items-center gap-1">
                      <Database className="w-3 h-3 text-indigo-405" /> Rationale (RAG Output)
                    </span>
                    {activePendingSignal.explanation}
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => rejectSignal(activePendingSignal.id)}
                      className="flex-1 py-1.5 bg-slate-900 text-slate-400 border border-slate-800 rounded font-bold uppercase text-[10px] cursor-pointer"
                    >
                      Reject
                    </button>
                    <button 
                      onClick={() => approveSignal(activePendingSignal.id)}
                      className="flex-1 py-1.5 bg-indigo-600 text-white rounded font-bold uppercase text-[10px] cursor-pointer"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-7 text-xs text-slate-500 space-y-1 bg-slate-950 rounded-lg">
                  <span className="font-bold block text-slate-400 uppercase">No active setups for {selectedSymbol}</span>
                  <p>Orderbook is stable. Scan is running.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Tab 4: executions limits and active positions */}
        {mobileSubTab === 'execution' && (
          <div className="space-y-4" id="m-draw-execution">
            <div className="bg-[#121622]/40 border border-slate-900 p-4 rounded-xl space-y-3 font-mono text-xs">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider pb-2 border-b border-slate-900">Quick Spot Buy/Sells</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-bold text-slate-400">
                  <span className="uppercase">Margin Allocation:</span>
                  <span className="text-white">${tradeSize}</span>
                </div>
                <input 
                  type="range"
                  min={250}
                  max={5000}
                  step={250}
                  value={tradeSize}
                  onChange={(e) => setTradeSize(parseInt(e.target.value))}
                  className="w-full accent-indigo-505"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button 
                  onClick={() => executeDirectTrade('short')}
                  className="bg-rose-500/10 text-rose-450 border border-rose-500/20 py-2.5 rounded-lg text-[11px] font-bold cursor-pointer font-bold flex justify-center gap-1 items-center uppercase"
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  Direct Sell
                </button>
                <button 
                  onClick={() => executeDirectTrade('long')}
                  className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 py-2.5 rounded-lg text-[11px] font-bold cursor-pointer font-bold flex justify-center gap-1 items-center uppercase"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Direct Buy
                </button>
              </div>
            </div>

            {/* Mobile Active Position monitor */}
            <div className="bg-[#121622]/40 border border-slate-900 p-4 rounded-xl space-y-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider pb-1.5 border-b border-slate-900">Active Positions ({positions.length})</h3>
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {positions.map(pos => (
                  <div key={`m-pos-${pos.id}`} className="bg-slate-950 p-2.5 border border-slate-900 rounded-lg flex items-center justify-between font-mono text-[11px]">
                    <div>
                      <span className="font-bold text-slate-205 block">{pos.symbol}</span>
                      <span className="text-[9px] text-slate-500">Margin: ${pos.margin} • Sz: {pos.size}</span>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <span className={`font-bold block ${pos.pnl >= 0 ? 'text-emerald-400' : 'text-rose-455'}`}>${pos.pnl.toFixed(1)}</span>
                        <span className={`text-[8.5px] block ${pos.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(1)}%</span>
                      </div>
                      <button 
                        onClick={() => closePosition(pos.id)}
                        className="bg-slate-900 p-1 border border-slate-850 rounded text-slate-400 cursor-pointer text-[10px]"
                      >
                        <X className="w-3 h-3 text-rose-500" />
                      </button>
                    </div>
                  </div>
                ))}
                {positions.length === 0 && (
                  <p className="text-center py-6 text-slate-500 font-sans text-xs">No active open positions currently.</p>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
