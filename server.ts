/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aura Server successfully running on host 0.0.0.0 on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical server startup crash:", err);
});
