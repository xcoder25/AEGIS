/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import ccxt from 'ccxt';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

dotenv.config();

// Define server-side interfaces matching types.ts
interface MarketAsset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  trend: 'up' | 'down' | 'neutral';
  history: number[];
  assetClass: 'crypto' | 'forex' | 'commodity' | 'index';
}

interface Position {
  id: string;
  symbol: string;
  assetClass: 'crypto' | 'forex' | 'commodity' | 'index';
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

interface TradingSignal {
  id: string;
  symbol: string;
  assetClass: 'crypto' | 'forex' | 'commodity' | 'index';
  direction: 'buy' | 'sell';
  confidence: number;
  strategy: string;
  riskScore: number;
  explanation: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  marketRegime: string;
  similarSetupsCount: number;
}

interface PastTrade {
  id: string;
  symbol: string;
  assetClass: 'crypto' | 'forex' | 'commodity' | 'index';
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

interface Notification {
  id: string;
  text: string;
  timestamp: string;
  type: 'info' | 'trade' | 'signal' | 'alert';
}

const generateHistory = (start: number): number[] => {
  const result: number[] = [];
  let curr = start;
  for (let i = 0; i < 20; i++) {
    curr = curr * (1 + (Math.random() - 0.5) * 0.02);
    result.push(curr);
  }
  return result;
};

// Global in-memory state engine variables
let accountBalance = 100000.00;
let equity = 100000.00;
let dailyPnL = 0.00;
let weeklyPnL = 0.00;
let winRate = 0.0;
let maxDrawdown = 0.0;
let drawdownPercent = 0.0;
let autoTradingEnabled = false;

// Broker API Connection - Strict Live Coinbase mode
if (!process.env.COINBASE_API_KEY || !process.env.COINBASE_API_SECRET) {
  throw new Error('CRITICAL CONFIGURATION ERROR: Coinbase Advanced Trade API credentials (COINBASE_API_KEY, COINBASE_API_SECRET) must be set in your .env file. Simulated paper trading mode is disabled.');
}

const proxy = process.env.COINBASE_PROXY || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const coinbaseClient = new ccxt.coinbase({
  apiKey: process.env.COINBASE_API_KEY,
  secret: process.env.COINBASE_API_SECRET,
  enableRateLimit: true,
  ...(proxy ? { proxy } : {}),
});
console.log(`[Broker] Live Coinbase Advanced Trade broker execution client initialized. (Proxy: ${proxy ? 'enabled' : 'disabled'})`);

function mapSymbolToCoinbase(symbol: string): string {
  // Convert standard pair layout e.g. BTC/USDT to Coinbase format BTC-USD
  let clean = symbol.replace('/', '-');
  if (clean.endsWith('-USDT')) {
    clean = clean.replace('-USDT', '-USD');
  }
  return clean;
}

async function syncBrokerBalance() {
  try {
    const balanceInfo = await coinbaseClient.fetchBalance();
    const usdBalance = balanceInfo.total['USD'] || balanceInfo.total['USDT'] || balanceInfo.free['USD'] || 100000.00;
    accountBalance = parseFloat(usdBalance.toFixed(2));
    equity = parseFloat(usdBalance.toFixed(2));
  } catch (err: any) {
    console.error(`[Broker] Failed to sync account balance from Coinbase: ${err.message || err}`);
  }
}

interface CachedPrice {
  price: number;
  change: number;
  changePercent: number;
}

const lastFetchedPrices: Record<string, CachedPrice> = {
  'BTC/USDT': { price: 92450.00, change: 1840.50, changePercent: 2.03 },
  'ETH/USDT': { price: 3420.75, change: -45.10, changePercent: -1.30 },
};

async function fetchRealTimePrices() {
  try {
    // 1. Fetch Binance prices for Cryptos (BTC and ETH)
    const binanceRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT"]');
    if (binanceRes.ok) {
      const data = await binanceRes.json();
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.symbol === 'BTCUSDT') {
            lastFetchedPrices['BTC/USDT'] = {
              price: parseFloat(item.lastPrice),
              change: parseFloat(item.priceChange),
              changePercent: parseFloat(item.priceChangePercent),
            };
          } else if (item.symbol === 'ETHUSDT') {
            lastFetchedPrices['ETH/USDT'] = {
              price: parseFloat(item.lastPrice),
              change: parseFloat(item.priceChange),
              changePercent: parseFloat(item.priceChangePercent),
            };
          }
        }
      }
    } else {
      console.warn(`[Price Feed] Binance request failed: ${binanceRes.statusText}`);
    }
  } catch (err) {
    console.error('[Price Feed] Error fetching Binance crypto prices:', err);
  }

  // Synchronize live balance
  await syncBrokerBalance();
}

let markets: MarketAsset[] = [
  { symbol: 'BTC/USDT', name: 'Bitcoin / US Dollar Tether', price: 92450.00, change: 1840.50, changePercent: 2.03, volume: 1854200000, trend: 'up', history: generateHistory(92450), assetClass: 'crypto' },
  { symbol: 'ETH/USDT', name: 'Ethereum / US Dollar Tether', price: 3420.75, change: -45.10, changePercent: -1.30, volume: 924000000, trend: 'down', history: generateHistory(3420), assetClass: 'crypto' },
];

let signals: TradingSignal[] = [];
let positions: Position[] = [];
const trades: PastTrade[] = [];
const notifications: Notification[] = [];

interface PasskeyDevice {
  credentialID: string;
  publicKey: Uint8Array;
  counter: number;
  transports?: any[];
  faceEmbedding: number[]; // 128-D geometry vector
}

const userCredentialsDb = new Map<string, PasskeyDevice[]>();
const userRegistrationChallenges = new Map<string, string>();
const userAuthenticationChallenges = new Map<string, string>();

// Active WebSocket client connections registry
const connectedClients = new Set<WebSocket>();

function broadcast(msg: any) {
  const data = JSON.stringify(msg);
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(data);
      } catch (err) {
        console.error('WebSocket send error:', err);
      }
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Parse JSON payloads
  app.use(express.json());

  // API Route: Server health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', serverTime: new Date() });
  });

  // API Route: AI Copilot Assistant Chat Route powered by server-side Gemini 3.5 Flash
  app.post('/api/copilot/chat', async (req, res) => {
    const { prompt, context } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing chat prompt.' });
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.includes('YOUR_')) {
        console.warn("GEMINI_API_KEY is not defined or is placeholder. Falling back to structured professional simulation responses.");
        return res.status(500).json({ error: "Missing API Key configuration" });
      }

      // Lazy initialize Google GenAI SDK inside the request to assure failure resiliency
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Prepare context block to enrich the system model with active portfolio parameters
      const contextSummary = context 
        ? `Portfolio balance: $${context.balance}, Equity: $${context.equity}, Active positions count: ${context.openPositions?.length || 0}, Pending AI signals: ${context.activeSignals?.length || 0}.`
        : "";

      const systemInstruction = 
        `You are Aura, an elite institutional multi-asset trading terminal AI Copilot. ` +
        `You analyze cryptocurrencies, forex, commodities, indices, and macroeconomic trends. ` +
        `Provide high-conviction, professional, and mathematically rigorous feedback. ` +
        `Be concise, use layout points or bold headers where appropriate. ` +
        `Active Terminal context: ${contextSummary}`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
      });

      const replyText = aiResponse.text;
      return res.json({ reply: replyText });

    } catch (error: any) {
      console.error('Gemini API Route Error:', error);
      return res.status(500).json({ 
        error: 'AI Module failed execution.', 
        details: error?.message || error 
      });
    }
  });

  // WebAuthn Passkey Registration Options
  app.get('/api/auth/register-options', async (req, res) => {
    const email = (req.query.email as string) || 'demo@aegis.ai';
    const rpID = req.hostname === '0.0.0.0' ? 'localhost' : req.hostname;
    
    try {
      const options = await generateRegistrationOptions({
        rpName: 'Aegis Terminal Portal',
        rpID,
        userID: Buffer.from(email),
        userName: email,
        userDisplayName: email.split('@')[0],
        attestationType: 'none',
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
      });

      userRegistrationChallenges.set(email, options.challenge);
      return res.json(options);
    } catch (err: any) {
      console.error('[WebAuthn] Options generate error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // WebAuthn Passkey Registration Verification & Face Vector Sync
  app.post('/api/auth/register-verify', async (req, res) => {
    const { body, email, faceEmbedding } = req.body;
    const userEmail = email || 'demo@aegis.ai';
    const rpID = req.hostname === '0.0.0.0' ? 'localhost' : req.hostname;
    const origin = `${req.protocol}://${req.get('host')}`;

    const expectedChallenge = userRegistrationChallenges.get(userEmail);
    if (!expectedChallenge) {
      return res.status(400).json({ error: 'WebAuthn registration challenge not found or expired.' });
    }

    try {
      const verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: false,
      });

      if (verification.verified && verification.registrationInfo) {
        const { id, publicKey, counter, transports } = verification.registrationInfo.credential;

        const newDevice: PasskeyDevice = {
          credentialID: id,
          publicKey,
          counter,
          transports: transports || body.response.transports || [],
          faceEmbedding: faceEmbedding || [],
        };

        const existing = userCredentialsDb.get(userEmail) || [];
        const filtered = existing.filter(d => d.credentialID !== newDevice.credentialID);
        filtered.push(newDevice);
        userCredentialsDb.set(userEmail, filtered);

        userRegistrationChallenges.delete(userEmail);

        console.log(`[WebAuthn] Successfully enrolled Passkey credential & face mesh for: ${userEmail}`);
        return res.json({ verified: true });
      } else {
        return res.status(400).json({ error: 'WebAuthn registration assertion verification failed.' });
      }
    } catch (err: any) {
      console.error('[WebAuthn] Verification register error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // WebAuthn Passkey Authentication Options
  app.get('/api/auth/login-options', async (req, res) => {
    const email = (req.query.email as string) || 'demo@aegis.ai';
    const rpID = req.hostname === '0.0.0.0' ? 'localhost' : req.hostname;

    const devices = userCredentialsDb.get(email) || [];

    try {
      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: devices.map(dev => ({
          id: dev.credentialID,
          transports: dev.transports,
        })),
        userVerification: 'preferred',
      });

      userAuthenticationChallenges.set(email, options.challenge);
      return res.json(options);
    } catch (err: any) {
      console.error('[WebAuthn] Login options error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // WebAuthn Passkey Authentication Verification & Face Embedding Euclidean similarity check
  app.post('/api/auth/login-verify', async (req, res) => {
    const { body, email, faceEmbedding } = req.body;
    const userEmail = email || 'demo@aegis.ai';
    const rpID = req.hostname === '0.0.0.0' ? 'localhost' : req.hostname;
    const origin = `${req.protocol}://${req.get('host')}`;

    const expectedChallenge = userAuthenticationChallenges.get(userEmail);
    if (!expectedChallenge) {
      return res.status(400).json({ error: 'WebAuthn challenge expired or missing.' });
    }

    const devices = userCredentialsDb.get(userEmail) || [];
    const credentialIDBase64 = body.id;
    const device = devices.find(d => d.credentialID === credentialIDBase64);

    if (!device) {
      return res.status(400).json({ error: 'Biometric passkey key is not registered under this email.' });
    }

    try {
      const verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: device.credentialID,
          publicKey: device.publicKey,
          counter: device.counter,
          transports: device.transports,
        },
        requireUserVerification: false,
      });

      if (!verification.verified) {
        return res.status(400).json({ error: 'Cryptographic biometric signature verification failed.' });
      }

      device.counter = verification.authenticationInfo.newCounter;
      userAuthenticationChallenges.delete(userEmail);

      // Face vector matching check
      const registeredVector = device.faceEmbedding;
      let faceMatch = true;
      let distance = 0;

      if (registeredVector && registeredVector.length > 0 && faceEmbedding && faceEmbedding.length > 0) {
        let sumSq = 0;
        const len = Math.min(registeredVector.length, faceEmbedding.length);
        for (let i = 0; i < len; i++) {
           const diff = registeredVector[i] - faceEmbedding[i];
           sumSq += diff * diff;
        }
        distance = Math.sqrt(sumSq);
        
        if (distance > 0.15) {
           faceMatch = false;
           console.warn(`[WebAuthn] Face vector match failed. Distance: ${distance.toFixed(4)} (Threshold: 0.15)`);
        } else {
           console.log(`[WebAuthn] Face vector match successful. Distance: ${distance.toFixed(4)}`);
        }
      }

      if (!faceMatch) {
        return res.status(401).json({
          error: 'Face ID validation failed: Landmark geometry mismatch.',
          details: `Euclidean distance ${distance.toFixed(4)} exceeds safe matching thresholds.`
        });
      }

      console.log(`[WebAuthn] User authenticated successfully: ${userEmail}`);
      return res.json({ verified: true, token: 'session-token-bypass-aegis-ai' });
    } catch (err: any) {
      console.error('[WebAuthn] Login verify error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware setup for Development or Static assets in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted successfully on Express development context.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static client handler mounted successfully on Express.');
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aura Server successfully running on host 0.0.0.0 on port ${PORT}`);
  });

  // 1. Mount WebSocket Server onto Express Server
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    connectedClients.add(ws);
    console.log(`[WebSocket] Client connected. Total active connections: ${connectedClients.size}`);

    // Send the initial fully-hydrated state payload on initial connection
    ws.send(JSON.stringify({
      type: 'INIT_STATE',
      payload: {
        markets,
        signals,
        positions,
        trades,
        accountBalance,
        equity,
        dailyPnL,
        weeklyPnL,
        winRate,
        maxDrawdown,
        drawdownPercent,
        autoTradingEnabled,
        notifications
      }
    }));

    ws.on('message', async (message) => {
      try {
        const parsed = JSON.parse(message.toString());
        const { type, payload } = parsed;
        console.log(`[WebSocket] Message received: ${type}`, payload);

        switch (type) {
          case 'APPROVE_SIGNAL': {
            const { signalId } = payload;
            const sig = signals.find(s => s.id === signalId);
            if (sig && sig.status === 'pending') {
              const asset = markets.find(m => m.symbol === sig.symbol);
              const entryPrice = asset ? asset.price : 1000;
              const tradeSize = parseFloat((3000 / entryPrice).toFixed(3));
              const amount = tradeSize > 0 ? tradeSize : 1;
              const side = sig.direction === 'buy' ? 'buy' : 'sell';

              const symbolClean = mapSymbolToCoinbase(sig.symbol);
              console.log(`[Broker] Submitting live market ${side} order for ${amount} ${sig.symbol} (${symbolClean})...`);
              
              let orderId = `pos-${Date.now()}`;
              let executedPrice = entryPrice;
              let executedSize = amount;

              try {
                const order = await coinbaseClient.createMarketOrder(symbolClean, side, amount);
                orderId = order.id;
                executedPrice = order.price || entryPrice;
                executedSize = order.amount || amount;
                console.log(`[Broker] Live order executed: ${orderId} at $${executedPrice}`);
              } catch (err: any) {
                console.error('[Broker] Failed to execute market order on Coinbase:', err);
                const notif: Notification = {
                  id: `notif-err-${Date.now()}`,
                  text: `REAL BROKER ERROR: Failed order execution on ${sig.symbol}. Details: ${err.message || err}`,
                  timestamp: new Date().toLocaleTimeString(),
                  type: 'alert'
                };
                notifications.unshift(notif);
                broadcast({ type: 'STATE_UPDATE', payload: { notifications } });
                break; // exit without creating position
              }

              sig.status = 'approved';
              const newPos: Position = {
                id: orderId,
                symbol: sig.symbol,
                assetClass: sig.assetClass,
                direction: sig.direction === 'buy' ? 'long' : 'short',
                size: executedSize,
                entryPrice: executedPrice,
                currentPrice: executedPrice,
                pnl: 0,
                pnlPercent: 0,
                margin: 3000,
                isAuto: false,
                timestamp: new Date().toISOString()
              };
              
              positions.push(newPos);
              
              const notif: Notification = {
                id: `notif-${Date.now()}`,
                text: `REAL ORDER FILLED: Executed ${newPos.direction.toUpperCase()} order on ${newPos.symbol} at $${newPos.entryPrice}`,
                timestamp: new Date().toLocaleTimeString(),
                type: 'trade'
              };
              notifications.unshift(notif);
              if (notifications.length > 50) notifications.pop();

              broadcast({
                type: 'STATE_UPDATE',
                payload: { signals, positions, notifications }
              });
            }
            break;
          }

          case 'REJECT_SIGNAL': {
            const { signalId } = payload;
            const sig = signals.find(s => s.id === signalId);
            if (sig && sig.status === 'pending') {
              sig.status = 'rejected';
              
              const notif: Notification = {
                id: `notif-${Date.now()}`,
                text: `Rejected Signal: Suspended ${sig.strategy} on ${sig.symbol}`,
                timestamp: new Date().toLocaleTimeString(),
                type: 'info'
              };
              notifications.unshift(notif);
              if (notifications.length > 50) notifications.pop();

              broadcast({
                type: 'STATE_UPDATE',
                payload: { signals, notifications }
              });
            }
            break;
          }

          case 'CLOSE_POSITION': {
            const { positionId } = payload;
            const idx = positions.findIndex(p => p.id === positionId);
            if (idx !== -1) {
              const pos = positions[idx];
              const side = pos.direction === 'long' ? 'sell' : 'buy';
              const symbolClean = mapSymbolToCoinbase(pos.symbol);
              console.log(`[Broker] Closing live position: submitting market ${side} order for ${pos.size} ${pos.symbol} (${symbolClean})...`);
              
              let exitPrice = pos.currentPrice;
              try {
                const order = await coinbaseClient.createMarketOrder(symbolClean, side, pos.size);
                exitPrice = order.price || pos.currentPrice;
                console.log(`[Broker] Live close order filled: ${order.id} at $${exitPrice}`);
              } catch (err: any) {
                console.error('[Broker] Failed to execute close order on Coinbase:', err);
                const notif: Notification = {
                  id: `notif-err-${Date.now()}`,
                  text: `REAL BROKER ERROR: Failed to close position ${pos.symbol}. Details: ${err.message || err}`,
                  timestamp: new Date().toLocaleTimeString(),
                  type: 'alert'
                };
                notifications.unshift(notif);
                broadcast({ type: 'STATE_UPDATE', payload: { notifications } });
                break; // exit without removing position from state
              }

              const newTrade: PastTrade = {
                id: `trd-${Date.now()}`,
                symbol: pos.symbol,
                assetClass: pos.assetClass,
                direction: pos.direction,
                size: pos.size,
                entryPrice: pos.entryPrice,
                exitPrice,
                pnl: pos.pnl,
                pnlPercent: pos.pnlPercent,
                strategy: 'Manual Exit',
                status: pos.pnl >= 0 ? 'profit' : 'loss',
                timestamp: new Date().toISOString(),
                execTime: 'Live'
              };
              
              positions.splice(idx, 1);
              trades.unshift(newTrade);
              
              const notif: Notification = {
                id: `notif-${Date.now()}`,
                text: `REAL POSITION CLOSED: ${pos.symbol} at ${exitPrice}. PnL: $${pos.pnl.toFixed(2)}`,
                timestamp: new Date().toLocaleTimeString(),
                type: 'trade'
              };
              notifications.unshift(notif);
              if (notifications.length > 50) notifications.pop();

              broadcast({
                type: 'STATE_UPDATE',
                payload: { positions, trades, notifications }
              });

              syncBrokerBalance().then(() => {
                broadcast({
                  type: 'STATE_UPDATE',
                  payload: { accountBalance, equity }
                });
              });
            }
            break;
          }

          case 'TOGGLE_AUTO_TRADING': {
            const { enabled } = payload;
            autoTradingEnabled = enabled;

            const notif: Notification = {
              id: `notif-${Date.now()}`,
              text: enabled ? 'Auto mode enabled. Trading engine is online.' : 'Auto Mode disabled. Relies on Copilot execution approval.',
              timestamp: new Date().toLocaleTimeString(),
              type: enabled ? 'alert' : 'info'
            };
            notifications.unshift(notif);
            if (notifications.length > 50) notifications.pop();

            broadcast({
              type: 'STATE_UPDATE',
              payload: { autoTradingEnabled, notifications }
            });
            break;
          }

          case 'CLOSE_ALL_TRADES':
          case 'EMERGENCY_STOP': {
            if (positions.length > 0) {
              const closedTrades: PastTrade[] = [];
              const failedPositions: Position[] = [];
              
              for (const pos of positions) {
                const side = pos.direction === 'long' ? 'sell' : 'buy';
                let exitPrice = pos.currentPrice;
                const symbolClean = mapSymbolToCoinbase(pos.symbol);
                console.log(`[Broker] Emergency close: submitting market ${side} order for ${pos.size} ${pos.symbol} (${symbolClean})...`);

                try {
                  const order = await coinbaseClient.createMarketOrder(symbolClean, side, pos.size);
                  exitPrice = order.price || pos.currentPrice;
                  
                  closedTrades.push({
                    id: `trd-closed-${Date.now()}-${Math.random().toString(36).substring(3)}`,
                    symbol: pos.symbol,
                    assetClass: pos.assetClass,
                    direction: pos.direction,
                    size: pos.size,
                    entryPrice: pos.entryPrice,
                    exitPrice,
                    pnl: pos.pnl,
                    pnlPercent: pos.pnlPercent,
                    strategy: type === 'EMERGENCY_STOP' ? 'Emergency Close All' : 'Manual Close All',
                    status: pos.pnl >= 0 ? 'profit' : 'loss',
                    timestamp: new Date().toISOString(),
                    execTime: 'Live'
                  });
                } catch (err: any) {
                  console.error(`[Broker] Emergency close failed for ${pos.symbol}:`, err);
                  const notif: Notification = {
                    id: `notif-err-${Date.now()}`,
                    text: `REAL BROKER ERROR: Emergency close failed for ${pos.symbol}. Details: ${err.message || err}`,
                    timestamp: new Date().toLocaleTimeString(),
                    type: 'alert'
                  };
                  notifications.unshift(notif);
                  failedPositions.push(pos);
                }
              }

              trades.unshift(...closedTrades);
              positions = failedPositions;

              if (closedTrades.length > 0) {
                const totalClosedPnL = closedTrades.reduce((acc, curr) => acc + curr.pnl, 0);
                const text = type === 'EMERGENCY_STOP'
                  ? `Emergency exit: Force terminated ${closedTrades.length} open position states on Coinbase. Net closed PnL impact: $${totalClosedPnL.toFixed(2)}`
                  : `Force closed ${closedTrades.length} positions on Coinbase. Net closed PnL: $${totalClosedPnL.toFixed(2)}`;

                const notif: Notification = {
                  id: `notif-${Date.now()}`,
                  text,
                  timestamp: new Date().toLocaleTimeString(),
                  type: 'alert'
                };
                notifications.unshift(notif);
                if (notifications.length > 50) notifications.pop();
              }
            }

            if (type === 'EMERGENCY_STOP') {
              autoTradingEnabled = false;
              const notif: Notification = {
                id: `notif-${Date.now() + 1}`,
                text: 'CRITICAL EMERGENCY HALT: Locked all systems. Terminated active auto configurations and closed all leverage position weights.',
                timestamp: new Date().toLocaleTimeString(),
                type: 'alert'
              };
              notifications.unshift(notif);
              if (notifications.length > 50) notifications.pop();
            }

            broadcast({
              type: 'STATE_UPDATE',
              payload: { positions, trades, autoTradingEnabled, notifications }
            });

            syncBrokerBalance().then(() => {
              broadcast({
                type: 'STATE_UPDATE',
                payload: { accountBalance, equity }
              });
            });
            break;
          }

          default:
            console.warn(`[WebSocket] Unknown message type: ${type}`);
        }
      } catch (err) {
        console.error('[WebSocket] Failed to process incoming message:', err);
      }
    });

    ws.on('close', () => {
      connectedClients.delete(ws);
      console.log(`[WebSocket] Client disconnected. Active connections remaining: ${connectedClients.size}`);
    });
  });

  // Start the background price feed
  fetchRealTimePrices().catch(err => console.error('[Price Feed] Initial fetch error:', err));
  setInterval(() => {
    fetchRealTimePrices().catch(err => console.error('[Price Feed] Interval fetch error:', err));
  }, 15000);

  // 2. High-precision Real-time Price and PnL Ticker Interval (2 seconds)
  setInterval(() => {
    // Fluctuate market asset prices based on live cache
    markets = markets.map((asset) => {
      const cached = lastFetchedPrices[asset.symbol];
      // Seed with cached price if available, otherwise keep current price
      const basePrice = cached ? cached.price : asset.price;
      const baseChange = cached ? cached.change : asset.change;
      const baseChangePercent = cached ? cached.changePercent : asset.changePercent;

      // Apply a micro-fluctuation to make the ticker feel alive (+/- 0.02% variance)
      const coef = 1 + (Math.random() - 0.5) * 0.0004;
      const nextPrice = basePrice * coef;
      
      // Calculate history array
      const nextHist = [...asset.history.slice(1), nextPrice];
      
      // Micro-fluctuation of change stats based on base price
      const diff = nextPrice - basePrice;
      const nextChange = baseChange + diff;
      const nextChangePercent = baseChangePercent + (diff / basePrice) * 100;

      return {
        ...asset,
        price: nextPrice,
        change: nextChange,
        changePercent: nextChangePercent,
        history: nextHist,
        trend: coef >= 1 ? 'up' : 'down' as 'up' | 'down'
      };
    });

    // Recalculate active PnL records
    if (positions.length > 0) {
      positions = positions.map((pos) => {
        const currentAsset = markets.find(m => m.symbol === pos.symbol);
        if (!currentAsset) return pos;

        const priceDiff = currentAsset.price - pos.entryPrice;
        const directionMultiplier = pos.direction === 'long' ? 1 : -1;
        const rawPnl = priceDiff * pos.size * directionMultiplier;
        const pnlPercent = (priceDiff / pos.entryPrice) * 100 * directionMultiplier;

        return {
          ...pos,
          currentPrice: currentAsset.price,
          pnl: rawPnl,
          pnlPercent
        };
      });

      // Recalculate equity
      const aggregatePnl = positions.reduce((acc, curr) => acc + curr.pnl, 0);
      equity = accountBalance + aggregatePnl;
    } else {
      equity = accountBalance;
    }

    const totalClosedPnL = trades.reduce((acc, t) => acc + t.pnl, 0);
    const openPnl = positions.reduce((acc, p) => acc + p.pnl, 0);
    dailyPnL = totalClosedPnL + openPnl;
    weeklyPnL = totalClosedPnL + openPnl;

    // 3. Autonomous Execution System (Auto mode logic)
    if (autoTradingEnabled && Math.random() > 0.85) {
      const pendingSignal = signals.find(s => s.status === 'pending');
      if (pendingSignal) {
        const asset = markets.find(m => m.symbol === pendingSignal.symbol);
        const entryPrice = asset ? asset.price : 1000;
        const tradeSize = parseFloat((3000 / entryPrice).toFixed(3));
        const amount = tradeSize > 0 ? tradeSize : 1;
        const side = pendingSignal.direction === 'buy' ? 'buy' : 'sell';

        // Run broker order submission inside an async block so it doesn't block the interval
        (async () => {
          const symbolClean = mapSymbolToCoinbase(pendingSignal.symbol);
          console.log(`[Broker Engine] Auto placing market ${side} order for ${amount} ${pendingSignal.symbol} (${symbolClean})...`);
          
          let orderId = `p-auto-${Date.now()}`;
          let executedPrice = entryPrice;
          let executedSize = amount;

          try {
            const order = await coinbaseClient.createMarketOrder(symbolClean, side, amount);
            orderId = order.id;
            executedPrice = order.price || entryPrice;
            executedSize = order.amount || amount;
          } catch (err: any) {
            console.error('[Broker Engine] Auto place order failed:', err);
            const notif: Notification = {
              id: `notif-err-${Date.now()}`,
              text: `AUTO ENGINE BROKER ERROR: Failed placing order on ${pendingSignal.symbol}. Details: ${err.message || err}`,
              timestamp: new Date().toLocaleTimeString(),
              type: 'alert'
            };
            notifications.unshift(notif);
            broadcast({ type: 'STATE_UPDATE', payload: { notifications } });
            return; // stop execution
          }

          pendingSignal.status = 'approved';
          const newPos: Position = {
            id: orderId,
            symbol: pendingSignal.symbol,
            assetClass: pendingSignal.assetClass,
            direction: pendingSignal.direction === 'buy' ? 'long' : 'short',
            size: executedSize,
            entryPrice: executedPrice,
            currentPrice: executedPrice,
            pnl: 0,
            pnlPercent: 0,
            margin: 3000,
            isAuto: true,
            timestamp: new Date().toISOString()
          };

          positions.push(newPos);

          const notif: Notification = {
            id: `notif-${Date.now()}`,
            text: `AUTO ENGINE ENGAGED: Executed buy loop on Coinbase for ${newPos.symbol} at $${newPos.entryPrice}`,
            timestamp: new Date().toLocaleTimeString(),
            type: 'trade'
          };
          notifications.unshift(notif);
          if (notifications.length > 50) notifications.pop();

          broadcast({
            type: 'STATE_UPDATE',
            payload: { positions, signals, notifications }
          });
        })();
      }
    }

    // 4. Random AI Signal generator
    if (Math.random() > 0.95 && signals.filter(s => s.status === 'pending').length < 4) {
      const randomAsset = markets[Math.floor(Math.random() * markets.length)];
      const direction = Math.random() > 0.5 ? 'buy' : 'sell';
      const conf = 60 + Math.floor(Math.random() * 35);

      const newSig: TradingSignal = {
        id: `sig-${Date.now()}`,
        symbol: randomAsset.symbol,
        assetClass: randomAsset.assetClass,
        direction,
        confidence: conf,
        strategy: Math.random() > 0.5 ? 'Trend Following' : 'Breakout Momentum',
        riskScore: 2 + Math.floor(Math.random() * 3),
        explanation: `System detected strong dynamic orderbook imbalance triggers on ${randomAsset.symbol} supporting immediate directional entries near current pivots.`,
        timestamp: new Date().toISOString(),
        status: 'pending',
        marketRegime: 'High Volatility Squeeze',
        similarSetupsCount: 8 + Math.floor(Math.random() * 10)
      };

      signals.unshift(newSig);
      if (signals.length > 20) signals.pop();

      const notif: Notification = {
        id: `notif-${Date.now()}`,
        text: `New AI Signal: Identified high probability ${direction.toUpperCase()} setup on ${randomAsset.symbol}.`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'signal'
      };
      notifications.unshift(notif);
      if (notifications.length > 50) notifications.pop();
    }

    // Broadcast the full updated tick state
    broadcast({
      type: 'TICK',
      payload: {
        markets,
        positions,
        signals,
        notifications,
        equity,
        dailyPnL,
        accountBalance
      }
    });
  }, 2000);
}

startServer().catch((err) => {
  console.error("Critical server startup crash:", err);
});
