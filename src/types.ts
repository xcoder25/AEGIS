/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AssetClass = 'forex' | 'crypto' | 'commodity' | 'index';

export type TrendDirection = 'up' | 'down' | 'neutral';

export interface MarketAsset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  trend: TrendDirection;
  history: number[]; // For mini sparrow sparklines
  assetClass: AssetClass;
}

export type SignalStatus = 'pending' | 'approved' | 'rejected' | 'executed';

export interface TradingSignal {
  id: string;
  symbol: string;
  assetClass: AssetClass;
  direction: 'buy' | 'sell';
  confidence: number; // 0 to 100
  strategy: string;
  riskScore: number; // 1 to 10
  explanation: string;
  timestamp: string;
  status: SignalStatus;
  marketRegime: string; // e.g. "Bullish Volatile", "Mean Reverting Bearish"
  similarSetupsCount: number;
}

export interface Position {
  id: string;
  symbol: string;
  assetClass: AssetClass;
  direction: 'long' | 'short';
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  margin: number;
  isAuto: boolean;
  timestamp: string;
}

export interface PastTrade {
  id: string;
  symbol: string;
  assetClass: AssetClass;
  direction: 'long' | 'short';
  size: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  strategy: string;
  status: 'profit' | 'loss';
  timestamp: string;
  execTime: string;
}

export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  winRate: number; // e.g. 68.2
  profitFactor: number; // e.g. 2.1
  sharpeRatio: number; // e.g. 1.85
  drawdown: number; // e.g. 4.3
  activeWeight: number; // Percentage, e.g. 20
  enabled: boolean;
}

export interface RiskLimits {
  dailyLossLimit: number;
  weeklyLossLimit: number;
  maxDrawdown: number;
  maxOpenTrades: number;
  riskPerTrade: number;
  currentExposure: number; // Actual dollar magnitude
  liquidValue: number;
}

export interface TradeMemory {
  id: string;
  symbol: string;
  strategy: string;
  regime: string;
  pnl: number;
  pnlPercent: number;
  type: 'win' | 'loss';
  details: string;
  timestamp: string;
  patternMatchScore: number; // e.g. 94
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  brokerApiKey?: string;
  brokerApiSecret?: string;
  registeredAt: string;
  role: string;
}

export interface SecurityLog {
  id: string;
  event: string;
  ip: string;
  timestamp: string;
}
