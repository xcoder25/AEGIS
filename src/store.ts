/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { MarketAsset, TradingSignal, Position, PastTrade, TradingStrategy, RiskLimits, TradeMemory, ChatMessage, UserProfile, SecurityLog } from './types';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';


interface TradingStore {
  // Authentication & Session
  isAuthenticated: boolean;
  user: UserProfile | null;
  securityLogs: SecurityLog[];
  login: (email: string, pass: string) => Promise<boolean>;
  register: (name: string, email: string, pass: string, avatar: string, apiKey?: string, apiSecret?: string) => Promise<boolean>;
  logout: () => void;
  addSecurityLog: (event: string) => void;
  clearSecurityLogs: () => void;

  // Navigation & General UI
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  activeBroker: string;
  setActiveBroker: (broker: string) => void;
  autoTradingEnabled: boolean;
  toggleAutoTrading: () => void;
  setAutoTrading: (enabled: boolean) => void;
  
  // Account Performance Metrics
  accountBalance: number;
  equity: number;
  dailyPnL: number;
  weeklyPnL: number;
  winRate: number;
  maxDrawdown: number;
  drawdownPercent: number;

  // Domain Objects
  markets: MarketAsset[];
  signals: TradingSignal[];
  positions: Position[];
  trades: PastTrade[];
  strategies: TradingStrategy[];
  riskLimits: RiskLimits;
  memories: TradeMemory[];
  chatMessages: ChatMessage[];
  selectedSignal: TradingSignal | null;
  setSelectedSignal: (signal: TradingSignal | null) => void;
  notifications: Array<{ id: string; text: string; timestamp: string; type: 'info' | 'trade' | 'signal' | 'alert' }>;

  // Mutations
  addNotification: (text: string, type?: 'info' | 'trade' | 'signal' | 'alert') => void;
  clearNotifications: () => void;
  approveSignal: (signalId: string) => void;
  rejectSignal: (signalId: string) => void;
  closePosition: (positionId: string) => void;
  updateStrategy: (id: string, enabled: boolean, activeWeight?: number) => void;
  updateRiskLimits: (updates: Partial<RiskLimits>) => void;
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
  emergencyStop: () => void;
  closeAllTrades: () => void;
  
  // Real-time update utilities (used by WebSockets / Feeds)
  updateMarkets: (newAssets: MarketAsset[]) => void;
  addSignal: (signal: TradingSignal) => void;
  wsStatus: 'connected' | 'disconnected' | 'connecting';
  setWsStatus: (status: 'connected' | 'disconnected' | 'connecting') => void;

  // Custom Backend Settings
  backendMode: 'simulated' | 'custom';
  setBackendMode: (mode: 'simulated' | 'custom') => void;
  backendUrl: string;
  backendWsUrl: string;
  backendToken: string;
  backendConnectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  setBackendConfig: (url: string, wsUrl: string, token: string) => void;
  setBackendConnectionState: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void;

  // Biometric Enrollment Status
  touchIdEnrolled: boolean;
  faceIdEnrolled: boolean;
  setTouchIdEnrolled: (enrolled: boolean) => void;
  setFaceIdEnrolled: (enrolled: boolean) => void;

  // Screen Flexibility & Adjustment Settings
  layoutDensity: 'compact' | 'normal' | 'spacious';
  screenWidth: 'centered' | 'full';
  textScale: 'sm' | 'base' | 'lg';
  setLayoutDensity: (density: 'compact' | 'normal' | 'spacious') => void;
  setScreenWidth: (width: 'centered' | 'full') => void;
  setTextScale: (scale: 'sm' | 'base' | 'lg') => void;

  // Onboarding
  isOnboardingCompleted: boolean;
  setIsOnboardingCompleted: (completed: boolean) => void;
}

// Sparkline datasets
const generateHistory = (start: number): number[] => {
  const result = [];
  let curr = start;
  for (let i = 0; i < 20; i++) {
    curr = curr * (1 + (Math.random() - 0.5) * 0.02);
    result.push(curr);
  }
  return result;
};

// Persisted auth session helper
const getSavedAuth = () => {
  if (typeof window === 'undefined') return { user: null, isAuthenticated: false, logs: [] };
  try {
    const savedUser = localStorage.getItem('aegis_user');
    const user = savedUser ? JSON.parse(savedUser) : null;
    const savedLogs = localStorage.getItem('aegis_security_logs');
    const logs = savedLogs ? JSON.parse(savedLogs) : [];
    return { user, isAuthenticated: !!user, logs };
  } catch (e) {
    return { user: null, isAuthenticated: false, logs: [] };
  }
};

const initialAuth = getSavedAuth();

export const useTradingStore = create<TradingStore>((set, get) => ({
  // Auth state initial inputs
  isAuthenticated: initialAuth.isAuthenticated,
  user: initialAuth.user,
  securityLogs: initialAuth.logs.length > 0 ? initialAuth.logs : [
    { id: 'log-0', event: 'Cryptographic system state verified', ip: '127.0.0.1', timestamp: new Date().toISOString() }
  ],

  login: async (email, pass) => {
    try {
      // 1. Try Firebase Authentication First
      let firebaseUserCred;
      try {
        firebaseUserCred = await signInWithEmailAndPassword(auth, email, pass);
      } catch (fbErr: any) {
        console.warn('[Firebase] Auth signin error, checking fallback:', fbErr.message);
        
        // Auto-Register Demo operator in Firebase if they login for the first time
        if (email === 'demo@aegis.ai' && pass === 'password') {
          try {
            firebaseUserCred = await createUserWithEmailAndPassword(auth, email, pass);
            const demoDoc = {
              name: 'Demo Trader',
              email: 'demo@aegis.ai',
              avatar: 'indigo',
              registeredAt: new Date().toISOString(),
              role: 'Senior Portfolio Analyst',
              brokerApiKey: 'ak_live_aegis_sec_519a',
              brokerApiSecret: '••••••••••••••••••••••••••••',
              touchIdEnrolled: false,
              faceIdEnrolled: false
            };
            await setDoc(doc(db, 'users', firebaseUserCred.user.uid), demoDoc);
            console.log('[Firebase] Automatically enrolled Demo operator credentials.');
          } catch (createErr) {
            // Already created or error, proceed to fallback lookup or error
          }
        }
      }

      // 2. Fetch User Profile from Firestore if authenticated
      if (firebaseUserCred) {
        const uid = firebaseUserCred.user.uid;
        try {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const activeUser: UserProfile = {
              name: data.name,
              email: data.email,
              avatar: data.avatar,
              registeredAt: data.registeredAt,
              role: data.role || 'Senior Portfolio Analyst',
              brokerApiKey: data.brokerApiKey || '',
              brokerApiSecret: data.brokerApiSecret || ''
            };
            
            // Sync status variables to Zustand and local cache
            localStorage.setItem('aegis_user', JSON.stringify(activeUser));
            localStorage.setItem('aegis_touch_id_enrolled', String(!!data.touchIdEnrolled));
            localStorage.setItem('aegis_face_id_enrolled', String(!!data.faceIdEnrolled));
            
            set({ 
              isAuthenticated: true, 
              user: activeUser,
              touchIdEnrolled: !!data.touchIdEnrolled,
              faceIdEnrolled: !!data.faceIdEnrolled
            });
            
            get().addSecurityLog(`User session authorized in Cloud Enclave: ${activeUser.email}`);
            get().addNotification(`Authorized cloud profile for ${activeUser.name}. Secure bridge is open.`, 'info');
            return true;
          }
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.GET, `users/${uid}`);
        }
      }

      // 3. Absolute Fallback to local storage matching
      const registeredUsersStr = localStorage.getItem('aegis_registered_users');
      const users = registeredUsersStr ? JSON.parse(registeredUsersStr) : [];
      let userMatch = users.find((u: any) => u.email === email && u.password === pass);

      if (!userMatch && email === 'demo@aegis.ai' && pass === 'password') {
        userMatch = {
          name: 'Demo Trader',
          email: 'demo@aegis.ai',
          avatar: 'indigo',
          registeredAt: new Date().toISOString(),
          role: 'Senior Portfolio Analyst',
          brokerApiKey: 'ak_live_aegis_sec_519a',
          brokerApiSecret: '••••••••••••••••••••••••••••'
        };
      }

      if (userMatch) {
        const activeUser: UserProfile = {
          name: userMatch.name,
          email: userMatch.email,
          avatar: userMatch.avatar,
          registeredAt: userMatch.registeredAt,
          role: userMatch.role || 'Senior Portfolio Analyst',
          brokerApiKey: userMatch.brokerApiKey || '',
          brokerApiSecret: userMatch.brokerApiSecret || ''
        };
        localStorage.setItem('aegis_user', JSON.stringify(activeUser));
        set({ isAuthenticated: true, user: activeUser });
        get().addSecurityLog(`User session authorized: ${activeUser.email}`);
        get().addNotification(`Authorized user ${activeUser.name}. Secure bridge is open.`, 'info');
        return true;
      }
    } catch (e) {
      console.error('[Auth] Login sequence failed:', e);
    }
    return false;
  },

  register: async (name, email, pass, avatar, apiKey = '', apiSecret = '') => {
    try {
      // 1. Register with Firebase Authentication
      let firebaseUserCred;
      try {
        firebaseUserCred = await createUserWithEmailAndPassword(auth, email, pass);
      } catch (fbErr: any) {
        console.warn('[Firebase] Auth register error, proceeding with local fallback:', fbErr.message);
      }

      const activeUser: UserProfile = {
        name,
        email,
        avatar,
        registeredAt: new Date().toISOString(),
        role: 'Senior Portfolio Analyst',
        brokerApiKey: apiKey,
        brokerApiSecret: apiSecret
      };

      // 2. Save User Profile to Firebase Firestore if registered successfully
      if (firebaseUserCred) {
        const uid = firebaseUserCred.user.uid;
        try {
          await setDoc(doc(db, 'users', uid), {
            ...activeUser,
            touchIdEnrolled: false,
            faceIdEnrolled: false
          });
          console.log('[Firebase] Successfully written cloud security operator profile.');
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.CREATE, `users/${uid}`);
        }
      }

      // 3. Fallback register/backup in Local Storage
      const registeredUsersStr = localStorage.getItem('aegis_registered_users');
      const users = registeredUsersStr ? JSON.parse(registeredUsersStr) : [];

      if (!users.some((u: any) => u.email === email)) {
        const newUser = {
          ...activeUser,
          password: pass
        };
        users.push(newUser);
        localStorage.setItem('aegis_registered_users', JSON.stringify(users));
      }

      localStorage.setItem('aegis_user', JSON.stringify(activeUser));
      localStorage.setItem('aegis_onboarding_completed', 'false');
      set({ 
        isAuthenticated: true, 
        user: activeUser,
        touchIdEnrolled: false,
        faceIdEnrolled: false,
        isOnboardingCompleted: false
      });
      get().addSecurityLog(`New cryptographic trading profile created: ${email}`);
      get().addNotification(`Successfully created trading profile for ${name}.`, 'info');
      return true;
    } catch (e) {
      console.error('[Auth] Registration sequence failed:', e);
    }
    return false;
  },

  logout: () => {
    try {
      signOut(auth).catch(err => console.warn('[Firebase] Logout connection warning:', err));
    } catch (e) {
      console.warn('[Firebase] Sign out failed:', e);
    }
    localStorage.removeItem('aegis_user');
    set({ isAuthenticated: false, user: null });
    get().addNotification('Authentication session terminated.', 'info');
  },

  addSecurityLog: (event) => {
    const newLog: SecurityLog = {
      id: `log-${Date.now()}`,
      event,
      ip: `192.168.1.${Math.floor(100 + Math.random() * 154)}`,
      timestamp: new Date().toISOString()
    };
    set((state) => {
      const updated = [newLog, ...state.securityLogs].slice(0, 50);
      localStorage.setItem('aegis_security_logs', JSON.stringify(updated));
      return { securityLogs: updated };
    });
  },

  clearSecurityLogs: () => {
    localStorage.removeItem('aegis_security_logs');
    set({ securityLogs: [] });
  },

  activeTab: 'Dashboard',
  setActiveTab: (tab) => set({ activeTab: tab, isMobileSidebarOpen: false }), // Auto-close sidebar on mobile navigation
  isMobileSidebarOpen: false,
  setIsMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),
  activeBroker: 'Binance Pro',
  setActiveBroker: (broker) => set({ activeBroker: broker }),
  autoTradingEnabled: false,
  toggleAutoTrading: () => {
    const nextState = !get().autoTradingEnabled;
    set({ autoTradingEnabled: nextState });
    get().addNotification(
      nextState ? 'Auto mode enabled. Trading engine is online.' : 'Auto Mode disabled. Relies on Copilot execution approval.',
      nextState ? 'alert' : 'info'
    );
  },
  setAutoTrading: (enabled) => set({ autoTradingEnabled: enabled }),

  // Account stats matching premium dashboard targets
  accountBalance: 124750.00,
  equity: 127812.45,
  dailyPnL: 2145.80,
  weeklyPnL: 8940.12,
  winRate: 64.8,
  maxDrawdown: 3.2,
  drawdownPercent: 1.15,

  // Initial Markets Set
  markets: [
    { symbol: 'BTC/USDT', name: 'Bitcoin / US Dollar Tether', price: 92450.00, change: 1840.50, changePercent: 2.03, volume: 1854200000, trend: 'up', history: generateHistory(92450), assetClass: 'crypto' },
    { symbol: 'ETH/USDT', name: 'Ethereum / US Dollar Tether', price: 3420.75, change: -45.10, changePercent: -1.30, volume: 924000000, trend: 'down', history: generateHistory(3420), assetClass: 'crypto' },
    { symbol: 'EUR/USD', name: 'Euro / US Dollar', price: 1.08450, change: 0.00210, changePercent: 0.19, volume: 4500000000, trend: 'up', history: generateHistory(1.0845), assetClass: 'forex' },
    { symbol: 'GBP/USD', name: 'British Pound / US Dollar', price: 1.26420, change: -0.00140, changePercent: -0.11, volume: 3820000000, trend: 'down', history: generateHistory(1.2642), assetClass: 'forex' },
    { symbol: 'XAU/USD', name: 'Gold / US Dollar', price: 2342.10, change: 18.30, changePercent: 0.79, volume: 1250000000, trend: 'up', history: generateHistory(2342), assetClass: 'commodity' },
    { symbol: 'USO/USD', name: 'Crude Oil', price: 78.45, change: -1.20, changePercent: -1.51, volume: 640000000, trend: 'down', history: generateHistory(78.45), assetClass: 'commodity' },
    { symbol: 'SPX500', name: 'S&P 500 Index', price: 5432.50, change: 34.20, changePercent: 0.63, volume: 8200000000, trend: 'up', history: generateHistory(5432), assetClass: 'index' },
    { symbol: 'NAS100', name: 'Nasdaq 100 Index', price: 18540.20, change: 154.60, changePercent: 0.84, volume: 9800000000, trend: 'up', history: generateHistory(18540), assetClass: 'index' },
  ],

  // AI Signals with explanations, reasoning metrics, regimes
  signals: [
    {
      id: 'sig-001',
      symbol: 'BTC/USDT',
      assetClass: 'crypto',
      direction: 'buy',
      confidence: 88,
      strategy: 'Breakout Momentum',
      riskScore: 3,
      explanation: 'Bitcoin displays high volumes breaking out above the $92,000 key daily structural resistance. Supported by strong on-chain network activity and dynamic buy orders clustering on the order-book depth margins.',
      timestamp: '2026-06-01T23:15:00Z',
      status: 'pending',
      marketRegime: 'Bullish Volatile Coherence',
      similarSetupsCount: 14,
    },
    {
      id: 'sig-002',
      symbol: 'XAU/USD',
      assetClass: 'commodity',
      direction: 'buy',
      confidence: 76,
      strategy: 'Mean Reversion',
      riskScore: 2,
      explanation: 'Gold is trading -2.4 standard deviations from its 20-period moving average on the 4-hour chart. The 14-period RSI shows positive divergence near oversold thresholds signaling high-probability relief rebound.',
      timestamp: '2026-06-01T23:08:00Z',
      status: 'pending',
      marketRegime: 'Mean-Reverting Oversold Congestion',
      similarSetupsCount: 22,
    },
    {
      id: 'sig-003',
      symbol: 'EUR/USD',
      assetClass: 'forex',
      direction: 'sell',
      confidence: 65,
      strategy: 'Trend Following',
      riskScore: 4,
      explanation: 'The EUR/USD trend is displaying structural fatigue near the multi-week descending supply channel. Momentum indices are flattening while short-duration moving-averages reflect a bearish crossing setup.',
      timestamp: '2026-06-01T22:50:00Z',
      status: 'approved',
      marketRegime: 'Bearish Ordered Flow',
      similarSetupsCount: 9,
    },
  ],

  // Positions
  positions: [
    {
      id: 'pos-101',
      symbol: 'BTC/USDT',
      assetClass: 'crypto',
      direction: 'long',
      size: 0.85,
      entryPrice: 91600.00,
      currentPrice: 92450.00,
      pnl: 722.50,
      pnlPercent: 0.93,
      margin: 3910.00,
      isAuto: true,
      timestamp: '2026-06-01T20:10:00Z'
    },
    {
      id: 'pos-102',
      symbol: 'SPX500',
      assetClass: 'index',
      direction: 'long',
      size: 15,
      entryPrice: 5412.00,
      currentPrice: 5432.50,
      pnl: 307.50,
      pnlPercent: 0.38,
      margin: 1623.60,
      isAuto: false,
      timestamp: '2026-06-01T21:44:00Z'
    }
  ],

  // Past executed trades
  trades: [
    { id: 'trd-091', symbol: 'NAS100', assetClass: 'index', direction: 'long', size: 10, entryPrice: 18420.00, exitPrice: 18540.20, pnl: 1202.00, pnlPercent: 0.65, strategy: 'Breakout Momentum', status: 'profit', timestamp: '2026-06-01T19:30:00Z', execTime: '02h 45m' },
    { id: 'trd-092', symbol: 'GBP/USD', assetClass: 'forex', direction: 'short', size: 250000, entryPrice: 1.26850, exitPrice: 1.26420, pnl: 1075.00, pnlPercent: 0.34, strategy: 'Trend Following', status: 'profit', timestamp: '2026-06-01T17:15:00Z', execTime: '05h 10m' },
    { id: 'trd-093', symbol: 'USO/USD', assetClass: 'commodity', direction: 'long', size: 500, entryPrice: 79.80, exitPrice: 78.45, pnl: -675.00, pnlPercent: -1.69, strategy: 'Volatility Expansion', status: 'loss', timestamp: '2026-06-01T15:05:00Z', execTime: '01h 20m' },
    { id: 'trd-094', symbol: 'ETH/USDT', assetClass: 'crypto', direction: 'long', size: 4.5, entryPrice: 3380.00, exitPrice: 3420.75, pnl: 183.38, pnlPercent: 1.21, strategy: 'Mean Reversion', status: 'profit', timestamp: '2026-06-01T11:40:00Z', execTime: '03h 05m' }
  ],

  // 5 Trading strategies with rich settings
  strategies: [
    { id: 'strat-01', name: 'Trend Following', description: 'Leverages EMA-ribbons and MACD convergence across higher order intervals to execute entries in low-variance trend corridors.', winRate: 61.2, profitFactor: 1.95, sharpeRatio: 1.62, drawdown: 5.2, activeWeight: 30, enabled: true },
    { id: 'strat-02', name: 'Breakout Momentum', description: 'Deploys Bollinger Bands & Volume-Weighted Average Price (VWAP) limits to dynamic breakout entry signals.', winRate: 54.8, profitFactor: 2.30, sharpeRatio: 1.88, drawdown: 8.5, activeWeight: 25, enabled: true },
    { id: 'strat-03', name: 'Mean Reversion', description: 'Measures standard deviations from linear regression models to catch extended pullbacks and structural corrections.', winRate: 72.4, profitFactor: 1.80, sharpeRatio: 1.74, drawdown: 4.1, activeWeight: 20, enabled: true },
    { id: 'strat-04', name: 'Volatility Expansion', description: 'Detects ATR (Average True Range) squeeze structures and trades swift expansion direction before equilibrium shift.', winRate: 48.5, profitFactor: 2.45, sharpeRatio: 1.55, drawdown: 12.4, activeWeight: 15, enabled: false },
    { id: 'strat-05', name: 'Orderbook Liquidity', description: 'Monitors real-time institutional exchange volume order book depth gaps and high-frequency delta imbalances.', winRate: 68.2, profitFactor: 1.90, sharpeRatio: 2.10, drawdown: 3.5, activeWeight: 10, enabled: false }
  ],

  // Risk configurations
  riskLimits: {
    dailyLossLimit: 5000,
    weeklyLossLimit: 15000,
    maxDrawdown: 5,
    maxOpenTrades: 5,
    riskPerTrade: 1.5,
    currentExposure: 5533.60, // sum of current margin
    liquidValue: 127812.45
  },

  // Trade Memories (RAG DB)
  memories: [
    { id: 'mem-01', symbol: 'BTC/USDT', strategy: 'Breakout Momentum', regime: 'Bullish Volatile Trend', pnl: 4850.00, pnlPercent: 5.28, type: 'win', details: 'Perfect entry when volume exceeds 2.5x 20-period VWAP average. Handled standard deviation slippage by buffering limit orders in deep margin spreads.', timestamp: '2026-05-28', patternMatchScore: 96 },
    { id: 'mem-02', symbol: 'ETH/USDT', strategy: 'Mean Reversion', regime: 'Low Volatility Squeeze', pnl: -1450.00, pnlPercent: -1.78, type: 'loss', details: 'Failed setup. RSI showed overbought but broader asset class correlation forced a continuation breach through standard deviation margins.', timestamp: '2026-05-25', patternMatchScore: 92 },
    { id: 'mem-03', symbol: 'GBP/USD', strategy: 'Trend Following', regime: 'Bearish Ordered Expansion', pnl: 2840.00, pnlPercent: 2.14, type: 'win', details: 'Highly secure directional flow during NY session opening. Moving average alignment correlated with macroeconomic debt parameters.', timestamp: '2026-05-20', patternMatchScore: 89 },
    { id: 'mem-04', symbol: 'XAU/USD', strategy: 'Mean Reversion', regime: 'Bullish Counter-Trend Squeeze', pnl: -970.00, pnlPercent: -1.25, type: 'loss', details: 'Premature mean-reversion counter entry. Gold stayed oversold for multiple sessions because of extreme safety bond allocation flows.', timestamp: '2026-05-18', patternMatchScore: 87 }
  ],

  // Chat-style interface messages
  chatMessages: [
    { id: 'chat-01', sender: 'assistant', content: 'Terminal AI Copilot initialized. I have examined market regimes, active risk profiles, and historical RAG databases. Ask me anything about current signals, asset setups, or risk parameters.', timestamp: '23:20:00' }
  ],

  selectedSignal: null,
  setSelectedSignal: (sig) => set({ selectedSignal: sig }),

  // Notification lists
  notifications: [
    { id: 'notif-01', text: 'AI Signal generated: BTC/USDT Breakout buy setup with 88% confidence.', timestamp: '23:15:20', type: 'signal' },
    { id: 'notif-02', text: 'Portfolio Risk is healthy. Net exposure is within safe limits (4.33%).', timestamp: '23:05:00', type: 'info' }
  ],

  // Mutation executors
  addNotification: (text, type = 'info') => {
    const newNotif = {
      id: `notif-${Date.now()}`,
      text,
      timestamp: new Date().toLocaleTimeString(),
      type
    };
    set((state) => ({ notifications: [newNotif, ...state.notifications].slice(0, 50) })); // Cap at 50
  },
  
  clearNotifications: () => set({ notifications: [] }),

  approveSignal: (signalId) => {
    const state = get();
    const signal = state.signals.find(s => s.id === signalId);
    if (!signal) return;

    // Check if symbol is already traded to prevent limits
    if (state.positions.length >= state.riskLimits.maxOpenTrades) {
      state.addNotification(`Risk alert: Max open positions count reached (${state.riskLimits.maxOpenTrades}). Close active items first.`, 'alert');
      return;
    }

    // Convert signal state to Position
    const asset = state.markets.find(m => m.symbol === signal.symbol);
    const entryPrice = asset ? asset.price : 1000;
    
    // Calculate simulated margin size
    const tradeSize = parseFloat((3000 / entryPrice).toFixed(4));
    
    const newPosition: Position = {
      id: `pos-${Date.now()}`,
      symbol: signal.symbol,
      assetClass: signal.assetClass,
      direction: signal.direction === 'buy' ? 'long' : 'short',
      size: tradeSize > 0 ? tradeSize : 1,
      entryPrice,
      currentPrice: entryPrice,
      pnl: 0,
      pnlPercent: 0,
      margin: 3000,
      isAuto: false, // Manual approval
      timestamp: new Date().toISOString()
    };

    // Update state
    set((state) => ({
      signals: state.signals.map(s => s.id === signalId ? { ...s, status: 'approved' } : s),
      positions: [...state.positions, newPosition]
    }));

    state.addNotification(`Approved AI Signal: Executed ${newPosition.direction.toUpperCase()} order on ${newPosition.symbol} at ${newPosition.entryPrice}`, 'trade');
  },

  rejectSignal: (signalId) => {
    const signal = get().signals.find(s => s.id === signalId);
    set((state) => ({
      signals: state.signals.map(s => s.id === signalId ? { ...s, status: 'rejected' } : s)
    }));
    if (signal) {
      get().addNotification(`Rejected Signal: Suspended ${signal.strategy} on ${signal.symbol}`, 'info');
    }
  },

  closePosition: (positionId) => {
    const state = get();
    const pos = state.positions.find(p => p.id === positionId);
    if (!pos) return;

    // Convert to PastTrade history entry
    const newTrade: PastTrade = {
      id: `trd-${Date.now()}`,
      symbol: pos.symbol,
      assetClass: pos.assetClass,
      direction: pos.direction,
      size: pos.size,
      entryPrice: pos.entryPrice,
      exitPrice: pos.currentPrice,
      pnl: pos.pnl,
      pnlPercent: pos.pnlPercent,
      strategy: 'Manual Exit',
      status: pos.pnl >= 0 ? 'profit' : 'loss',
      timestamp: new Date().toISOString(),
      execTime: 'Live'
    };

    // Calculate balance updates
    const netBalance = state.accountBalance + pos.pnl;
    const netEquity = state.equity + pos.pnl;

    set((state) => ({
      accountBalance: netBalance,
      equity: netEquity,
      dailyPnL: state.dailyPnL + pos.pnl,
      positions: state.positions.filter(p => p.id !== positionId),
      trades: [newTrade, ...state.trades]
    }));

    state.addNotification(`Closed position: ${pos.symbol} at ${pos.currentPrice}. PnL: $${pos.pnl.toFixed(2)}`, 'trade');
  },

  updateStrategy: (id, enabled, activeWeight) => set((state) => ({
    strategies: state.strategies.map(s => {
      if (s.id === id) {
        const nextEnabled = enabled;
        const nextWeight = activeWeight !== undefined ? activeWeight : s.activeWeight;
        return { ...s, enabled: nextEnabled, activeWeight: nextWeight };
      }
      return s;
    })
  })),

  updateRiskLimits: (updates) => set((state) => ({
    riskLimits: { ...state.riskLimits, ...updates }
  })),

  addChatMessage: (msg) => set((state) => ({
    chatMessages: [...state.chatMessages, msg]
  })),

  clearChat: () => set({
    chatMessages: [{ id: 'chat-01', sender: 'assistant', content: 'Terminal AI Copilot initialized. How can I help you analyze assets or strategies today?', timestamp: '23:20:00' }]
  }),

  emergencyStop: () => {
    const state = get();
    if (state.positions.length === 0 && !state.autoTradingEnabled) {
      state.addNotification('Emergency protocol active: All systems already fully halted.', 'alert');
      return;
    }
    
    // Close everything
    state.closeAllTrades();
    set({ autoTradingEnabled: false });
    state.addNotification('CRITICAL EMERGENCY HALT: Locked all systems. Terminated active auto configurations and closed all leverage position weights.', 'alert');
  },

  closeAllTrades: () => {
    const state = get();
    if (state.positions.length === 0) return;

    // Convert everything to past trade logs
    const closedTrades: PastTrade[] = state.positions.map(pos => ({
      id: `trd-closed-${Date.now()}-${Math.random().toString(36).substring(3)}`,
      symbol: pos.symbol,
      assetClass: pos.assetClass,
      direction: pos.direction,
      size: pos.size,
      entryPrice: pos.entryPrice,
      exitPrice: pos.currentPrice,
      pnl: pos.pnl,
      pnlPercent: pos.pnlPercent,
      strategy: 'Emergency Close All',
      status: pos.pnl >= 0 ? 'profit' : 'loss',
      timestamp: new Date().toISOString(),
      execTime: '0.1s'
    }));

    const totalPnL = state.positions.reduce((acc, curr) => acc + curr.pnl, 0);

    set((state) => ({
      accountBalance: state.accountBalance + totalPnL,
      equity: state.equity + totalPnL,
      dailyPnL: state.dailyPnL + totalPnL,
      positions: [],
      trades: [...closedTrades, ...state.trades]
    }));

    state.addNotification(`Emergency exit: Force terminated all ${closedTrades.length} open position states. Net closed PnL impact: $${totalPnL.toFixed(2)}`, 'alert');
  },

  updateMarkets: (newAssets) => set({ markets: newAssets }),
  addSignal: (signal) => set((state) => ({ signals: [signal, ...state.signals.slice(0, 19)] })),
  
  wsStatus: 'connecting',
  setWsStatus: (status) => set({ wsStatus: status }),

  // Custom Backend Defaults & Handlers
  backendMode: 'simulated',
  setBackendMode: (mode) => set({ backendMode: mode }),
  backendUrl: 'http://localhost:8000',
  backendWsUrl: 'ws://localhost:8000/ws',
  backendToken: '',
  backendConnectionState: 'disconnected',
  setBackendConfig: (url, wsUrl, token) => set({ backendUrl: url, backendWsUrl: wsUrl, backendToken: token }),
  setBackendConnectionState: (status) => set({ backendConnectionState: status }),

  // Biometric Enrollment State and Mutators
  touchIdEnrolled: typeof window !== 'undefined' ? localStorage.getItem('aegis_touch_id_enrolled') === 'true' : false,
  faceIdEnrolled: typeof window !== 'undefined' ? localStorage.getItem('aegis_face_id_enrolled') === 'true' : false,
  setTouchIdEnrolled: (enrolled) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('aegis_touch_id_enrolled', String(enrolled));
    }
    set({ touchIdEnrolled: enrolled });

    const currentUid = auth.currentUser?.uid;
    if (currentUid) {
      updateDoc(doc(db, 'users', currentUid), { touchIdEnrolled: enrolled })
        .then(() => {
          console.log('[Firebase] Synchronized Touch ID enrollment state to Cloud.');
        })
        .catch(dbErr => {
          handleFirestoreError(dbErr, OperationType.UPDATE, `users/${currentUid}`);
        });
    }
  },
  setFaceIdEnrolled: (enrolled) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('aegis_face_id_enrolled', String(enrolled));
    }
    set({ faceIdEnrolled: enrolled });

    const currentUid = auth.currentUser?.uid;
    if (currentUid) {
      updateDoc(doc(db, 'users', currentUid), { faceIdEnrolled: enrolled })
        .then(() => {
          console.log('[Firebase] Synchronized Face ID enrollment state to Cloud.');
        })
        .catch(dbErr => {
          handleFirestoreError(dbErr, OperationType.UPDATE, `users/${currentUid}`);
        });
    }
  },

  // Screen Flexibility states and implementations
  layoutDensity: (typeof window !== 'undefined' ? (localStorage.getItem('aegis_layout_density') as 'compact' | 'normal' | 'spacious') || 'normal' : 'normal'),
  screenWidth: (typeof window !== 'undefined' ? (localStorage.getItem('aegis_screen_width') as 'centered' | 'full') || 'centered' : 'centered'),
  textScale: (typeof window !== 'undefined' ? (localStorage.getItem('aegis_text_scale') as 'sm' | 'base' | 'lg') || 'base' : 'base'),
  setLayoutDensity: (density) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('aegis_layout_density', density);
    }
    set({ layoutDensity: density });
  },
  setScreenWidth: (width) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('aegis_screen_width', width);
    }
    set({ screenWidth: width });
  },
  setTextScale: (scale) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('aegis_text_scale', scale);
    }
    set({ textScale: scale });
  },

  // Onboarding implementation
  isOnboardingCompleted: (typeof window !== 'undefined' ? (localStorage.getItem('aegis_onboarding_completed') === 'true') : true),
  setIsOnboardingCompleted: (completed) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('aegis_onboarding_completed', String(completed));
    }
    set({ isOnboardingCompleted: completed });
  },
}));
