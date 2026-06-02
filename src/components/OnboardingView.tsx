import React, { useState, useEffect } from 'react';
import { useTradingStore } from '../store';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Rocket, 
  Cpu, 
  ShieldCheck, 
  SlidersHorizontal,
  Fingerprint, 
  ScanFace, 
  Key, 
  Play, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Zap, 
  Terminal, 
  Lock, 
  LineChart,
  CheckCircle2,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';
import logoUrl from '../assets/images/aegis_ai_logo_1780357203730.png';

export default function OnboardingView() {
  const { 
    user,
    setIsOnboardingCompleted,
    layoutDensity,
    setLayoutDensity,
    screenWidth,
    setScreenWidth,
    textScale,
    setTextScale,
    touchIdEnrolled,
    setTouchIdEnrolled,
    faceIdEnrolled,
    setFaceIdEnrolled,
    addSecurityLog,
    addNotification
  } = useTradingStore();

  const [step, setStep] = useState(1);
  const [riskProfile, setRiskProfile] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  
  // Custom API configuration inputs (pre-populating simulated Demo Credentials optionally)
  const [apiKey, setApiKey] = useState(user?.brokerApiKey || '');
  const [apiSecret, setApiSecret] = useState(user?.brokerApiSecret || '');
  
  // Scanners and progression loaders for Biometrics
  const [isBioScanning, setIsBioScanning] = useState<'none' | 'fingerprint' | 'face'>('none');
  const [bioProgress, setBioProgress] = useState(0);

  // Neural weights training / platform alignment progress
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);

  // Simulation step timings
  useEffect(() => {
    if (isBioScanning !== 'none') {
      const interval = setInterval(() => {
        setBioProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 80);
      return () => clearInterval(interval);
    }
  }, [isBioScanning]);

  useEffect(() => {
    if (bioProgress >= 100 && isBioScanning !== 'none') {
      if (isBioScanning === 'fingerprint') {
        setTouchIdEnrolled(true);
        addSecurityLog('Touch ID biometric encryption sequence compiled and bound');
        addNotification('Biometric Touch ID key registered inside hardware enclave.', 'info');
      } else {
        setFaceIdEnrolled(true);
        addSecurityLog('Face ID facial mesh signature certified & enrolled');
        addNotification('Biometric Face ID facial identity matrix locked.', 'info');
      }
      setIsBioScanning('none');
      setBioProgress(0);
    }
  }, [bioProgress, isBioScanning]);

  const toggleSimulatedKeys = () => {
    if (apiKey === '') {
      setApiKey('ak_live_aegis_sec_519a');
      setApiSecret('••••••••••••••••••••••••••••');
      addNotification('Simulated exchange keys aligned for sandboxed pipeline routing.', 'info');
    } else {
      setApiKey('');
      setApiSecret('');
    }
  };

  // Launch simulated neural weights synchronizer on Step 5
  const startSystemSync = () => {
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncLogs([
      '[SYS] Initializing Aegis quantitative core module...',
      '[SEC] Allocating secure isolated sandbox enclave buffers...'
    ]);

    const logStates = [
      { prg: 20, log: '[NET] Establishing WebSocket feedback bridge to standard exchange feeds... [OK]' },
      { prg: 35, log: `[SEC] Hardening local cipher limits with standard risk thresholds: ${riskProfile.toUpperCase()} MODE... [OK]` },
      { prg: 50, log: '[MEM] Loading historical price vectors and neural matching RAG databases... [OK]' },
      { prg: 70, log: `[INT] Calibrating workspace elasticity configurations: layout: ${layoutDensity}, width: ${screenWidth}, text: ${textScale}... [OK]` },
      { prg: 85, log: '[SYS] Compiling trading execution routers and deploying fallback telemetry... [OK]' },
      { prg: 95, log: '[SEC] Core system sync verified. All channels green. Primed.' }
    ];

    const interval = setInterval(() => {
      setSyncProgress((prev) => {
        const next = prev + 1;
        
        // Find if we need to append any specific logs
        const matchingLog = logStates.find(item => item.prg === next);
        if (matchingLog) {
          setSyncLogs((current) => [...current, matchingLog.log]);
        }

        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsOnboardingCompleted(true);
            addSecurityLog(`Calibrated system initialized by authorized operator: ${user?.email}`);
            addNotification('Aegis Platform calibrated. Ready for trading execution.', 'info');
          }, 800);
          return 100;
        }
        return next;
      });
    }, 45);
  };

  const nextStep = () => {
    if (step < 5) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-[#060608] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      
      {/* Decorative Matrix Grid Backdrop */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none select-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <pattern id="onb-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#onb-grid)" />
        </svg>
      </div>

      {/* Futuristic Blurs */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-indigo-505/5 rounded-full blur-[100px] pointer-events-none select-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-emerald-505/5 rounded-full blur-[100px] pointer-events-none select-none" />

      {/* Onboarding Box */}
      <div className="w-full max-w-xl z-10 space-y-6">
        
        {/* Header branding */}
        <div className="text-center space-y-1.5 animate-fadeIn">
          <div className="inline-flex items-center gap-2">
            <img 
              src={logoUrl} 
              alt="Aegis AI Quant Logo" 
              className="w-10 h-10 rounded-xl border border-white/10 shadow-xl object-cover p-0.5"
              referrerPolicy="no-referrer"
            />
            <div className="text-left">
              <h1 className="font-display font-black text-lg tracking-tight text-white flex items-center gap-1">
                AEGIS <span className="text-indigo-400">AI</span>
              </h1>
              <p className="font-mono text-[8px] text-slate-500 tracking-wider">SECURE SYSTEM INTEGRATION</p>
            </div>
          </div>
        </div>

        {/* Content Panel Frame */}
        <div className="bg-[#0b0c10]/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl relative">
          
          {/* Top Progress Bar indicator */}
          <div className="bg-[#07080a] py-3.5 px-6 border-b border-slate-900 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-indigo-400 uppercase font-black tracking-widest bg-indigo-950/40 border border-indigo-500/15 px-2 py-0.5 rounded-md">
                STEP {step} OF 5
              </span>
              <span className="text-[11px] font-bold text-slate-300">
                {step === 1 && "Mission Briefing"}
                {step === 2 && "Interface Elasticity Settings"}
                {step === 3 && "Biometric Enclave Registration"}
                {step === 4 && "Exchange Bridge API Keys"}
                {step === 5 && "Neural Alignment Sync"}
              </span>
            </div>
            {/* Visual tiny step indicators */}
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <div 
                  key={s} 
                  className={`h-1.5 w-6 rounded-full transition-all duration-300 ${
                    s <= step ? 'bg-indigo-500' : 'bg-slate-850'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="p-6 md:p-8 min-h-[380px] flex flex-col justify-between">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                
                {/* STEP 1: WELCOME & PLATFORM DIRECTIVES */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Rocket className="w-5 h-5 text-indigo-400" />
                        Welcome to Aegis AI, {user?.name || "Operator"}!
                      </h2>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">
                        You have successfully initialized your secure local profile. The Aegis system operates directly in sandboxed memory clusters on your physical device and connects to secure cloud-enclaves to safeguard performance data.
                      </p>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-900/80 space-y-3">
                      <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-wider block">
                        Platform System Directives
                      </span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-start gap-2 text-left">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-bold text-slate-300 block">Responsive Grid Elasticity</span>
                            <span className="text-[10px] text-slate-500 font-sans leading-normal">
                              Workspace expands fluidly to leverage multiple screen widths, tablet monitors, and ultra-wide devices.
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 text-left">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-bold text-slate-300 block">Cloud API Fallbacks</span>
                            <span className="text-[10px] text-slate-500 font-sans leading-normal">
                              Integrates optional fallback modes to test strategy weights and pricing tickers without losing performance stats.
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 text-left">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-bold text-slate-300 block">Biometric Shielding</span>
                            <span className="text-[10px] text-slate-500 font-sans leading-normal">
                              Instantly link physical Touch & Face ID biometric systems to secure transaction and setting state variables.
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 text-left">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-bold text-slate-300 block">ECC Key Verification</span>
                            <span className="text-[10px] text-slate-500 font-sans leading-normal">
                              Utilizes elliptic curve cryptography to sign and execute ledger activities for absolute performance verifiability.
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 font-mono text-center pt-2">
                      Click NEXT to configure your physical desktop screen adjustment parameters.
                    </p>
                  </div>
                )}

                {/* STEP 2: FLEXIBLE SCREEN ADJUSTMENTS */}
                {step === 2 && (
                  <div className="space-y-5">
                    <div className="space-y-1">
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
                        Dynamic Screen Calibrations
                      </h2>
                      <p className="text-xs text-slate-400 font-sans leading-relaxed">
                        Test and calibrate your interface parameters below. Changes execute in real-time, allowing you to instantly preview responsiveness, spacing, and font flexibility on your current browser.
                      </p>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 space-y-4">
                      {/* Density Selector */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest">
                            Padding & Spacing Density
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 font-mono uppercase bg-slate-900 px-1.5 py-0.2 rounded border border-slate-850">
                            {layoutDensity.toUpperCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 rounded-lg border border-slate-850">
                          {(['compact', 'normal', 'spacious'] as const).map((density) => (
                            <button
                              key={density}
                              type="button"
                              onClick={() => {
                                setLayoutDensity(density);
                                addNotification(`Onboarding Adjust: padding changed to ${density.toUpperCase()}`, 'info');
                              }}
                              className={`text-[10.5px] font-mono font-bold capitalize py-1.5 px-2 rounded-md transition-colors cursor-pointer ${
                                layoutDensity === density 
                                  ? 'bg-slate-800 text-emerald-400 border border-emerald-500/15'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {density}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Screen Width mode */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest">
                            Outer Frame Horizontal Width
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 font-mono uppercase bg-slate-900 px-1.5 py-0.2 rounded border border-slate-850">
                            {screenWidth === 'centered' ? 'MAX BOXED (1280px)' : 'BORDERLESS FULL'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 rounded-lg border border-slate-850">
                          <button
                            type="button"
                            onClick={() => {
                              setScreenWidth('centered');
                              addNotification('Onboarding Adjust: Frame width set to centered standard', 'info');
                            }}
                            className={`text-[10.5px] font-mono font-bold capitalize py-1.5 px-2 rounded-md transition-colors cursor-pointer ${
                              screenWidth === 'centered' 
                                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/15'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Centered Content
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setScreenWidth('full');
                              addNotification('Onboarding Adjust: Frame width expanded to Borderless Full', 'info');
                            }}
                            className={`text-[10.5px] font-mono font-bold capitalize py-1.5 px-2 rounded-md transition-colors cursor-pointer ${
                              screenWidth === 'full' 
                                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/15'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            Full Wide Screen
                          </button>
                        </div>
                      </div>

                      {/* Text scale / font size */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest">
                            Typography Scale
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 font-mono uppercase bg-slate-900 px-1.5 py-0.2 rounded border border-slate-850">
                            {textScale === 'sm' ? 'SMALL' : textScale === 'base' ? 'MEDIUM (BASE)' : 'LARGE'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 rounded-lg border border-slate-850">
                          {(['sm', 'base', 'lg'] as const).map((scale) => (
                            <button
                              key={scale}
                              type="button"
                              onClick={() => {
                                setTextScale(scale);
                                addNotification(`Onboarding Adjust: Type system scaled to ${scale.toUpperCase()}`, 'info');
                              }}
                              className={`text-[10.5px] font-mono font-bold uppercase py-1.5 px-2 rounded-md transition-colors cursor-pointer ${
                                textScale === scale 
                                  ? 'bg-slate-800 text-emerald-400 border border-emerald-500/15'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {scale === 'base' ? 'MED' : scale}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 leading-normal text-center">
                      Feel free to click around! Spacing and font alignments adjust immediately on the fly to fit mobile, tablet, or large screen displays gracefully.
                    </p>
                  </div>
                )}

                {/* STEP 3: BIOMETRIC SHIELD ENCLAVE */}
                {step === 3 && (
                  <div className="space-y-5">
                    <div className="space-y-1">
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Lock className="w-5 h-5 text-indigo-400" />
                        Aegis Biometric Shield Gates
                      </h2>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">
                        Fast-track credentials bypass. Syncing your physical device biometrics protects active transaction modules and settings screens. Disabling requires manual SHA double signatures.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Touch ID Panel */}
                      <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl relative overflow-hidden flex flex-col justify-between space-y-3">
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-mono text-indigo-405 text-indigo-400 font-bold uppercase tracking-wider block">
                            Enclave Port 1
                          </span>
                          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <Fingerprint className="w-4 h-4 text-emerald-400" />
                            Secure Touch ID Enrol
                          </h3>
                          <p className="text-[10px] text-slate-500 leading-normal font-sans">
                            Scans physical biometric ridge structures for quick unlock.
                          </p>
                        </div>

                        {touchIdEnrolled ? (
                          <div className="bg-emerald-500/10 border border-emerald-500/15 p-2 rounded-lg flex items-center justify-center gap-1.5 text-emerald-400 text-[10.5px] font-mono font-bold uppercase">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Touch ID Active
                          </div>
                        ) : isBioScanning === 'fingerprint' ? (
                          <div className="space-y-2">
                            <div className="h-5 w-full bg-slate-900 rounded overflow-hidden relative border border-slate-800 flex items-center justify-center">
                              <div className="absolute top-0 bottom-0 left-0 bg-indigo-505 bg-indigo-500" style={{ width: `${bioProgress}%` }} />
                              <span className="text-[9px] font-mono text-indigo-200 z-10 font-bold animate-pulse">
                                SCANNING TOUCH SENSOR [{bioProgress}%]
                              </span>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setIsBioScanning('fingerprint');
                              setBioProgress(0);
                            }}
                            className="w-full bg-slate-900 border border-slate-800 hover:border-indigo-500/35 hover:bg-slate-850/50 py-2 rounded-lg text-[10px] font-bold font-mono text-slate-350 cursor-pointer text-center"
                          >
                            TEST SCAN & ENROL TOUCH ID
                          </button>
                        )}
                      </div>

                      {/* Face ID Panel */}
                      <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl relative overflow-hidden flex flex-col justify-between space-y-3">
                        <div className="space-y-1.5">
                          <span className="text-[9px] font-mono text-indigo-405 text-indigo-400 font-bold uppercase tracking-wider block">
                            Enclave Port 2
                          </span>
                          <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <ScanFace className="w-4 h-4 text-emerald-400" />
                            Facial Matrix Scanner
                          </h3>
                          <p className="text-[10px] text-slate-500 leading-normal font-sans">
                            Maps 3D neural depth nodes for instant workspace unlock.
                          </p>
                        </div>

                        {faceIdEnrolled ? (
                          <div className="bg-emerald-500/10 border border-emerald-500/15 p-2 rounded-lg flex items-center justify-center gap-1.5 text-emerald-400 text-[10.5px] font-mono font-bold uppercase">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Face ID Active
                          </div>
                        ) : isBioScanning === 'face' ? (
                          <div className="space-y-2">
                            <div className="h-5 w-full bg-slate-900 rounded overflow-hidden relative border border-slate-800 flex items-center justify-center">
                              <div className="absolute top-0 bottom-0 left-0 bg-indigo-505 bg-indigo-500" style={{ width: `${bioProgress}%` }} />
                              <span className="text-[9px] font-mono text-indigo-200 z-10 font-bold animate-pulse">
                                RENDERING FACE GRID [{bioProgress}%]
                              </span>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setIsBioScanning('face');
                              setBioProgress(0);
                            }}
                            className="w-full bg-slate-900 border border-slate-800 hover:border-indigo-500/35 hover:bg-slate-850/50 py-2 rounded-lg text-[10px] font-bold font-mono text-slate-350 cursor-pointer text-center"
                          >
                            TEST SCAN & ENROL FACE ID
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-950/40 p-3 border border-slate-900 rounded-lg flex items-start gap-2">
                      <HelpCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-slate-400 leading-normal font-sans">
                        Don't worry! Touch ID / Face ID states are fully simulated in offline web sandboxes when absolute physical platform biometric permissions aren't granted. You can bypass them at any time.
                      </p>
                    </div>
                  </div>
                )}

                {/* STEP 4: BROKER/EXCHANGE BRIDGES */}
                {step === 4 && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Key className="w-5 h-5 text-indigo-400" />
                        Establish Exchange API Keyway
                      </h2>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">
                        Provide a read/write restricted exchange credential to run automated executions. Aegis utilizes locally encrypted isolated variables that never leave your device memory client constraints.
                      </p>
                    </div>

                    <div className="bg-slate-950 p-4 border border-slate-900 rounded-xl space-y-4">
                      
                      {/* API Keys toggle load simulated */}
                      <div className="flex items-center justify-between border-b border-slate-900 pb-2.5">
                        <div className="text-left">
                          <span className="text-xs font-bold text-slate-200 block">Autofill Mock Credentials</span>
                          <span className="text-[9.5px] font-sans text-slate-500 leading-normal block">
                            Load restricted mock keys to preview full trade mechanics without financial setups.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={toggleSimulatedKeys}
                          className={`text-[9.5px] font-mono font-black uppercase py-1 px-3.5 border rounded-lg transition-all cursor-pointer ${
                            apiKey !== '' 
                              ? 'bg-indigo-950/40 border-indigo-500/35 text-indigo-400' 
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                          }`}
                        >
                          {apiKey !== '' ? "CREDENTIALS ALIGNED" : "LOAD SIMULATED"}
                        </button>
                      </div>

                      {/* Manual Credentials */}
                      <div className="grid grid-cols-1 gap-3.5 text-left">
                        <div className="space-y-1.5">
                          <label className="text-[9.5px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">
                            Exchange Public Routing Key
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. ak_live_aegis_sec_••••••••"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="w-full bg-slate-900/40 text-[10.5px] font-mono py-2 px-3 rounded-lg border border-slate-800 text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9.5px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">
                            Cryptographic HMAC Secret Signature
                          </label>
                          <input
                            type="password"
                            placeholder="HMAC Secret Signature Phrase"
                            value={apiSecret}
                            onChange={(e) => setApiSecret(e.target.value)}
                            className="w-full bg-slate-900/40 text-[10.5px] font-mono py-2 px-3 rounded-lg border border-slate-800 text-slate-100 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50"
                          />
                        </div>
                      </div>

                    </div>

                    <div className="bg-slate-950/30 p-3 border border-slate-900 rounded-lg flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <p className="text-[9.5px] text-slate-500 leading-none font-mono tracking-tight uppercase">
                        End-to-End Local Client Encryption Shield Activated
                      </p>
                    </div>

                  </div>
                )}

                {/* STEP 5: MODEL TRAINING & ACCOUNT SYNCHRONIZATION */}
                {step === 5 && (
                  <div className="space-y-4">
                    <div className="space-y-1 text-center">
                      <h2 className="text-lg font-bold text-white justify-center flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-indigo-405 text-indigo-400" />
                        Align Neural Quantum Limits
                      </h2>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto font-sans leading-relaxed">
                        Select a starting risk alignment setting. The local Aegis engine will sync database schema pipelines, spin up Websocket ticker nodes, and train initial weights.
                      </p>
                    </div>

                    {!isSyncing ? (
                      <div className="space-y-5">
                        
                        {/* Risk Choices Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          
                          {/* Conservative */}
                          <button
                            type="button"
                            onClick={() => {
                              setRiskProfile('conservative');
                              addNotification('Onboarding risk: Conservative alignment selected.', 'info');
                            }}
                            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between space-y-2 ${
                              riskProfile === 'conservative'
                                ? 'bg-[#0f1712] border-emerald-555 border-emerald-500/40 text-white'
                                : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800'
                            }`}
                          >
                            <div className="space-y-1">
                              <span className={`text-[8px] font-mono font-bold uppercase py-0.5 px-1.5 rounded-md ${
                                riskProfile === 'conservative' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-900 text-slate-500'
                              }`}>
                                Safe Preserve
                              </span>
                              <h3 className="text-xs font-black pt-1">Conservative</h3>
                            </div>
                            <span className="text-[10px] text-slate-550 leading-relaxed font-sans">
                              Focus is strictly on capital preservation. Tight loss limits, low lever scaling, index benchmarks.
                            </span>
                          </button>

                          {/* Balanced */}
                          <button
                            type="button"
                            onClick={() => {
                              setRiskProfile('balanced');
                              addNotification('Onboarding risk: Balanced alignment selected.', 'info');
                            }}
                            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between space-y-2 ${
                              riskProfile === 'balanced'
                                ? 'bg-[#10141f] border-indigo-555 border-indigo-400/40 text-white animate-pulse'
                                : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800'
                            }`}
                          >
                            <div className="space-y-1">
                              <span className={`text-[8px] font-mono font-bold uppercase py-0.5 px-1.5 rounded-md ${
                                riskProfile === 'balanced' ? 'bg-indigo-950 text-indigo-455 text-indigo-400' : 'bg-slate-900 text-slate-500'
                              }`}>
                                Optimized Auto
                              </span>
                              <h3 className="text-xs font-black pt-1">Balanced</h3>
                            </div>
                            <span className="text-[10px] text-slate-550 leading-relaxed font-sans">
                              Optimum performance allocation. Adaptive daily drawdowns, hybrid trend, balanced AI leverage.
                            </span>
                          </button>

                          {/* Aggressive */}
                          <button
                            type="button"
                            onClick={() => {
                              setRiskProfile('aggressive');
                              addNotification('Onboarding risk: Aggressive alignment selected. Fasten seatbelts.', 'alert');
                            }}
                            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between space-y-2 ${
                              riskProfile === 'aggressive'
                                ? 'bg-[#1b1214] border-rose-555 border-rose-500/40 text-white'
                                : 'bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-800'
                            }`}
                          >
                            <div className="space-y-1">
                              <span className={`text-[8px] font-mono font-bold uppercase py-0.5 px-1.5 rounded-md ${
                                riskProfile === 'aggressive' ? 'bg-rose-950 text-rose-400' : 'bg-slate-900 text-slate-500'
                              }`}>
                                Max Velocity
                              </span>
                              <h3 className="text-xs font-black pt-1">Aggressive</h3>
                            </div>
                            <span className="text-[10px] text-slate-550 leading-relaxed font-sans">
                              Aims for rapid compounding. Leveraged momentum triggers, wider risk grids, high risk, high reward.
                            </span>
                          </button>

                        </div>

                        {/* Start synchronizer */}
                        <div className="flex justify-center pt-2">
                          <button
                            id="btn-trigger-calibration-sync"
                            type="button"
                            onClick={startSystemSync}
                            className="bg-indigo-600 hover:bg-indigo-550 text-white font-bold py-3 px-10 text-xs tracking-wider rounded-xl shadow-xl shadow-indigo-550/25 border border-indigo-500/20 uppercase flex items-center gap-2 cursor-pointer group transition-all"
                          >
                            <Zap className="w-4 h-4 text-emerald-400 group-hover:scale-125 transition-transform" />
                            DEPLOY SYSTEM CALIBRATION
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Real sync progress visualizer (absolutely spectacular!)
                      <div className="space-y-5 py-2">
                        
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[10px] font-mono uppercase text-slate-405 font-bold">
                            <span>Securing Quantum Framework Matrix</span>
                            <span className="text-indigo-400 font-extrabold">[{syncProgress}%]</span>
                          </div>
                          
                          {/* Animated bar tracker glow */}
                          <div className="h-3 w-full bg-slate-950 border border-slate-900 rounded-full overflow-hidden p-0.5 flex relative">
                            <motion.div 
                              className="h-full bg-gradient-to-r from-indigo-505 via-indigo-400 to-emerald-400 rounded-full"
                              style={{ width: `${syncProgress}%` }}
                              layoutId="sync-slider-progress"
                            />
                            {/* Scanning overlay glow */}
                            <div className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-transparent via-white/10 to-transparent w-2/3 animate-[scan-line_2s_infinite]" />
                          </div>
                        </div>

                        {/* Terminal Logs monitor readout */}
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 text-left space-y-1 min-h-[140px] max-h-[140px] overflow-y-auto font-mono text-[9px] leading-relaxed text-slate-400 select-none shadow-inner">
                          <div className="flex items-center gap-1.5 text-indigo-400 border-b border-slate-900 pb-1.5 mb-2">
                            <Terminal className="w-3.5 h-3.5 animate-pulse" />
                            <span className="font-bold uppercase tracking-wider">Aegis Secure Matrix Stream</span>
                          </div>
                          {syncLogs.map((log, index) => (
                            <div key={index} className="animate-fadeIn truncate">
                              <span className="text-emerald-500 mr-1.5">»</span> {log}
                            </div>
                          ))}
                          <div className="animate-pulse flex gap-0.5 pt-1 text-slate-600">
                            <span>_</span>
                          </div>
                        </div>

                        <p className="text-[9.5px] text-slate-500 font-mono text-center animate-pulse tracking-wide">
                          KEEP WINDOW FOCUS ACTIVE ● COMPILING SCHEMA SCHEDULERS
                        </p>
                      </div>
                    )}

                  </div>
                )}

              </motion.div>
            </AnimatePresence>

            {/* Bottom Actions Router Navigation (Hidden during actual synchronizing compiling) */}
            {!isSyncing && (
              <div className="flex justify-between items-center pt-8 border-t border-slate-900 mt-8">
                
                {/* Back button */}
                <button
                  id="btn-onboarding-back"
                  type="button"
                  onClick={prevStep}
                  disabled={step === 1}
                  className={`flex items-center gap-1 text-[10.5px] font-mono tracking-wider font-bold uppercase transition-colors cursor-pointer ${
                    step === 1 
                      ? 'text-slate-700 cursor-not-allowed' 
                      : 'text-slate-450 hover:text-white'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                {/* Secure Skip option */}
                {step < 5 && (
                  <button
                    id="btn-onboard-skip-all"
                    type="button"
                    onClick={() => {
                      setIsOnboardingCompleted(true);
                      addSecurityLog(`Bypassed initial wizard calibrations: default risk thresholds assumed.`);
                      addNotification('Onboarding setup bypassed. Loaded standard workspace presets.', 'info');
                    }}
                    className="text-[9.5px] font-mono text-slate-500 hover:text-indigo-400 uppercase tracking-widest transition-colors font-bold cursor-pointer"
                  >
                    Skip Calibrations &raquo;
                  </button>
                )}

                {/* Continue / Next button */}
                {step < 5 ? (
                  <button
                    id="btn-onboarding-next"
                    type="button"
                    onClick={nextStep}
                    className="bg-slate-900 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/35 text-slate-200 hover:text-indigo-400 font-mono font-bold py-1.5 px-4 rounded-xl text-[10.5px] tracking-wider uppercase flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="w-2" /> // layout spacing bumper
                )}

              </div>
            )}

          </div>

        </div>

        {/* Security markings */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-3">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            Enclave Sandboxed Verification Active
          </span>
          <span className="font-mono text-[9.5px] uppercase text-emerald-500 tracking-wider">
            ● SSL PORT 3000 BRIDGED
          </span>
        </div>

      </div>

    </div>
  );
}
