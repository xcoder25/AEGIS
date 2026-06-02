/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Cpu, Lock, Compass, Sparkles } from 'lucide-react';
import logoUrl from '../assets/images/aegis_ai_logo_1780357203730.png';

interface SplashScreenProps {
  onComplete: () => void;
}

const LoadingSteps = [
  { time: 0, text: "INITIATING AEGIS SECURE KERNEL...", icon: Shield },
  { time: 1000, text: "CONNECTING TO DECENTRALIZED LEDGER GATEWAYS...", icon: Lock },
  { time: 2200, text: "ESTABLISHING WEBSOCKET QUOTES AND STREAMING FEEDS...", icon: Compass },
  { time: 3400, text: "LOADING AI REASONING MODELS AND RAG COGNITIVE CORE...", icon: Cpu },
  { time: 4200, text: "AEGIS PLATFORM ENCRYPTION SANITY PASS: SECURE", icon: Sparkles },
];

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Progress counter running over 5 seconds (5000ms)
    const intervalMs = 30;
    const totalMs = 5000;
    const stepIncrement = (intervalMs / totalMs) * 100;
    
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + stepIncrement;
        if (next >= 100) {
          clearInterval(progressTimer);
          setIsVisible(false);
          // Let the fade-out exit animation complete before triggering the callback
          setTimeout(() => {
            onComplete();
          }, 800);
          return 100;
        }
        return next;
      });
    }, intervalMs);

    // Dynamic loading messages trigger based on elapsed time
    const startTimestamp = Date.now();
    const messageTimer = setInterval(() => {
      const elapsed = Date.now() - startTimestamp;
      const index = LoadingSteps.reduce((acc, step, idx) => {
        if (elapsed >= step.time) return idx;
        return acc;
      }, 0);
      setCurrentStepIndex(index);
    }, 100);

    return () => {
      clearInterval(progressTimer);
      clearInterval(messageTimer);
    };
  }, [onComplete]);

  const StepIcon = LoadingSteps[currentStepIndex]?.icon || Shield;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="splash-screen-root"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 text-slate-100 select-none overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
        >
          {/* Cybernetic matrix grid pattern overlay inside splash */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(rgba(18,18,20,0.1)_2px,transparent_2px),linear-gradient(90deg,rgba(18,18,20,0.1)_2px,transparent_2px)] bg-[size:30px_30px]" />
          
          {/* Dynamic soft radial glowing spot */}
          <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[80px] pointer-events-none" />
          
          <div className="relative flex flex-col items-center max-w-xl px-6 text-center">
            {/* Pulsing Shield/Aegis Hologram Outline Wrapper */}
            <motion.div 
              className="relative w-44 h-44 mb-8"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            >
              {/* Spinning tech orbits */}
              <div className="absolute inset-x-[-12px] inset-y-[-12px] rounded-full border border-dashed border-indigo-500/20 animate-[spin_40s_linear_infinite]" />
              <div className="absolute inset-x-[-24px] inset-y-[-24px] rounded-full border border-dotted border-emerald-500/15 animate-[spin_60s_linear_infinite_reverse]" />
              
              {/* Outer soft shadow aura glow */}
              <div className="absolute inset-2 rounded-2xl bg-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.25)] blur-md" />

              {/* Real Generated Premium Shield Logo Asset */}
              <img
                src={logoUrl}
                alt="AegisAI Cryptographic Shield Logo"
                id="splash-logo-image"
                className="relative w-full h-full object-cover rounded-3xl border border-zinc-700/40 shadow-2xl scale-95"
                referrerPolicy="no-referrer"
              />
            </motion.div>

            {/* Brand Title Display with futuristic mono tracking */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="space-y-2 mb-10"
            >
              <h1 id="splash-title-brand" className="text-4xl md:text-5xl font-bold tracking-[0.25em] text-white font-display">
                AEGIS<span className="text-indigo-400 font-extrabold text-shadow">AI</span>
              </h1>
              <p id="splash-subtitle-mono" className="text-xs font-mono tracking-widest text-[#6366f1] select-none uppercase">
                Autonomous Intelligence Ledger Platform
              </p>
            </motion.div>

            {/* Glowing active loading status bar container */}
            <div className="w-80 md:w-96 space-y-3 relative">
              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
                <span className="flex items-center gap-1.5 uppercase font-medium">
                  <StepIcon className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  {LoadingSteps[currentStepIndex]?.text}
                </span>
                <span className="text-indigo-400 font-semibold">{Math.min(100, Math.round(progress))}%</span>
              </div>

              {/* Progress track */}
              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/60 p-[1px]">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>


            </div>

            {/* Skip Loading button for high productivity (fades in slightly after 2 seconds) */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              whileHover={{ opacity: 1, scale: 1.05 }}
              transition={{ delay: 2 }}
              onClick={() => {
                setIsVisible(false);
                setTimeout(onComplete, 500);
              }}
              id="splash-skip-button"
              className="mt-8 px-4 py-1.5 border border-zinc-850 bg-zinc-900/30 hover:bg-zinc-900 rounded-lg text-[10px] font-mono tracking-wider text-zinc-400 hover:text-white cursor-pointer"
            >
              BYPASS ENCRYPTION AUDIT &raquo;
            </motion.button>

            {/* Premium Powered by Nexora credential indication */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ delay: 0.5, duration: 1.2 }}
              className="mt-10 text-[9px] font-mono tracking-[0.35em] text-slate-500 uppercase select-none active:scale-95 transition-all text-center"
              id="splash-powered-by"
            >
              POWERED BY <span className="text-indigo-400 font-extrabold hover:text-indigo-300 transition-colors">NEXORA</span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
