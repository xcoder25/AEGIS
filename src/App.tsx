/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useTradingStore } from './store';
import { initWebSocket } from './lib/socketClient';

// Importing Viewports
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import DashboardView from './components/DashboardView';
import MarketsView from './components/MarketsView';
import SignalsView from './components/SignalsView';
import PortfolioView from './components/PortfolioView';
import TradesView from './components/TradesView';
import StrategiesView from './components/StrategiesView';
import CopilotView from './components/CopilotView';
import RiskManagerView from './components/RiskManagerView';
import MemoryView from './components/MemoryView';
import AnalyticsView from './components/AnalyticsView';
import SettingsView from './components/SettingsView';
import SplashScreen from './components/SplashScreen';
import AuthView from './components/AuthView';
import OnboardingView from './components/OnboardingView';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const { 
    isAuthenticated,
    activeTab, 
    markets, 
    updateMarkets, 
    positions, 
    addNotification, 
    wsStatus,
    setWsStatus,
    autoTradingEnabled,
    signals,
    addSignal,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    layoutDensity,
    screenWidth,
    textScale,
    isOnboardingCompleted
  } = useTradingStore();

  // 1. Live WebSocket connection manager
  useEffect(() => {
    let url = '';
    const state = useTradingStore.getState();
    if (state.backendMode === 'simulated') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      url = `${protocol}//${window.location.host}`;
    } else {
      url = state.backendWsUrl;
    }

    const socketManager = initWebSocket(url);

    return () => {
      socketManager.close();
    };
  }, [useTradingStore((state) => state.backendMode), useTradingStore((state) => state.backendWsUrl)]);

  // 2. High-precision Real-time Price and PnL ticker updates (Resilient Offline Fallback)
  useEffect(() => {
    // Only run simulated ticks if WebSocket is disconnected
    if (wsStatus === 'connected') {
      return;
    }

    const ticker = setInterval(() => {
      // Fluctuate market index prices slightly
      const updatedMarkets = markets.map((asset) => {
        const coef = 1 + (Math.random() - 0.5) * 0.003; // +/- 0.15% change
        const nextPrice = asset.price * coef;
        const nextHist = [...asset.history.slice(1), nextPrice];
        const nextChange = asset.change + (nextPrice - asset.price);
        const nextChangePercent = (nextChange / (asset.price - asset.change)) * 100;
        
        return {
          ...asset,
          price: nextPrice,
          change: nextChange,
          changePercent: nextChangePercent,
          history: nextHist,
          trend: coef >= 1 ? 'up' : 'down' as 'up' | 'down'
        };
      });

      updateMarkets(updatedMarkets);

      // Fluctuate active PnL records
      if (positions.length > 0) {
        useTradingStore.setState((state) => {
          const nextPositions = state.positions.map((pos) => {
            const currentAsset = updatedMarkets.find(m => m.symbol === pos.symbol);
            if (!currentAsset) return pos;

            const priceDiff = currentAsset.price - pos.entryPrice;
            const directionMultiplier = pos.direction === 'long' ? 1 : -1;
            const rawPnl = priceDiff * pos.size * directionMultiplier * 10; // multiplier simulation
            const pnlPercent = (priceDiff / pos.entryPrice) * 100 * directionMultiplier;

            return {
              ...pos,
              currentPrice: currentAsset.price,
              pnl: rawPnl,
              pnlPercent
            };
          });

          // Recalculate account equity summary based on changing PnL
          const aggregatePnl = nextPositions.reduce((acc, curr) => acc + curr.pnl, 0);
          return {
            positions: nextPositions,
            equity: state.accountBalance + aggregatePnl,
            dailyPnL: state.dailyPnL + (Math.random() - 0.5) * 45 // light noise
          };
        });
      }

      // 3. Autonomous Execution System (Simulated loop matching Auto mode)
      if (autoTradingEnabled && Math.random() > 0.85) {
        // Automatically approve a pending signal if one exists
        const pendingSignal = signals.find(s => s.status === 'pending');
        if (pendingSignal) {
          const asset = updatedMarkets.find(m => m.symbol === pendingSignal.symbol);
          const entryPrice = asset ? asset.price : 1000;
          const tradeSize = parseFloat((3000 / entryPrice).toFixed(3));

          const newPos = {
            id: `p-auto-${Date.now()}`,
            symbol: pendingSignal.symbol,
            assetClass: pendingSignal.assetClass,
            direction: pendingSignal.direction === 'buy' ? 'long' : 'short' as 'long' | 'short',
            size: tradeSize > 0 ? tradeSize : 1,
            entryPrice,
            currentPrice: entryPrice,
            pnl: 0,
            pnlPercent: 0,
            margin: 3000,
            isAuto: true,
            timestamp: new Date().toISOString()
          };

          useTradingStore.setState((state) => ({
            positions: [...state.positions, newPos],
            signals: state.signals.map(s => s.id === pendingSignal.id ? { ...s, status: 'approved' } : s)
          }));

          addNotification(`AUTO ENGINE ENGAGED: Executed derivative buy loop on ${newPos.symbol} at $${newPos.entryPrice}`, 'trade');
        }
      }

      // 4. Randomly launch a new AI Signal of interest occasionally (simulating live backend feed)
      if (Math.random() > 0.95 && signals.filter(s => s.status === 'pending').length < 4) {
        const randomAsset = markets[Math.floor(Math.random() * markets.length)];
        const direction = Math.random() > 0.5 ? 'buy' : 'sell' as 'buy' | 'sell';
        const conf = 60 + Math.floor(Math.random() * 35);
        
        const newSig = {
          id: `sig-${Date.now()}`,
          symbol: randomAsset.symbol,
          assetClass: randomAsset.assetClass,
          direction,
          confidence: conf,
          strategy: Math.random() > 0.5 ? 'Trend Following' : 'Breakout Momentum',
          riskScore: 2 + Math.floor(Math.random() * 3),
          explanation: `System detected strong dynamic orderbook imbalance triggers on ${randomAsset.symbol} supporting immediate directional entries near current pivots.`,
          timestamp: new Date().toISOString(),
          status: 'pending' as const,
          marketRegime: 'High Volatility Squeeze',
          similarSetupsCount: 8 + Math.floor(Math.random() * 10)
        };
        addSignal(newSig);
        addNotification(`New AI Signal: Identified high probability ${direction.toUpperCase()} setup on ${randomAsset.symbol}.`, 'signal');
      }

    }, 3000);

    return () => clearInterval(ticker);
  }, [markets, positions, autoTradingEnabled, signals, wsStatus]);

  // Main viewport router mapping
  const renderViewport = () => {
    switch (activeTab) {
      case 'Dashboard':
        return <DashboardView />;
      case 'Markets':
        return <MarketsView />;
      case 'Signals':
        return <SignalsView />;
      case 'Portfolio':
        return <PortfolioView />;
      case 'Trades':
        return <TradesView />;
      case 'Strategies':
        return <StrategiesView />;
      case 'AI Copilot':
        return <CopilotView />;
      case 'Risk Manager':
        return <RiskManagerView />;
      case 'Memory (RAG)':
        return <MemoryView />;
      case 'Analytics':
        return <AnalyticsView />;
      case 'Settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <>
      <SplashScreen onComplete={() => setShowSplash(false)} />
      
      {!showSplash && (
        !isAuthenticated ? (
          <AuthView />
        ) : !isOnboardingCompleted ? (
          <OnboardingView />
        ) : (
          <div className="min-h-screen text-slate-100 bg-[#090b11] font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-400">
            {/* Sidebar Frame wrapper */}
            <Sidebar />

            {/* Mobile sidebar backdrop overlay */}
            {isMobileSidebarOpen && (
              <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-35 md:hidden transition-opacity duration-300"
                onClick={() => setIsMobileSidebarOpen(false)}
                id="sidebar-mobile-overlay"
              />
            )}

            {/* Top Navbar */}
            <TopNav />

            {/* Content pane with responsive padded offset */}
            <main className="md:pl-64 pt-16 transition-all duration-300">
              <div 
                id="main-content-layout-wrapper"
                className={`transition-all duration-300 ${
                  screenWidth === 'full' 
                    ? 'w-full px-4 md:px-6 lg:px-8' 
                    : 'max-w-7xl mx-auto'
                } ${
                  layoutDensity === 'compact' 
                    ? 'space-y-3 p-2 md:p-4' 
                    : layoutDensity === 'spacious' 
                    ? 'space-y-10 p-6 md:p-10 lg:p-12' 
                    : 'space-y-6 p-4 md:p-6 lg:p-8'
                } ${
                  textScale === 'sm' 
                    ? 'text-[11px] [&_h2]:text-base [&_h3]:text-xs [&_p]:text-[10px] [&_td]:text-[10px]' 
                    : textScale === 'lg' 
                    ? 'text-[14px] md:text-sm lg:text-base [&_h1]:text-3xl [&_h2]:text-2xl [&_h3]:text-lg [&_p]:text-sm [&_td]:text-[13px]' 
                    : ''
                }`}
              >
                {renderViewport()}
              </div>
            </main>
          </div>
        )
      )}
    </>
  );
}
