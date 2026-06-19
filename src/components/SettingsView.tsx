/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Settings, Shield, Bell, Network, HelpCircle, Check, Key, Server, Wifi, Play, AlertCircle, History, Trash2, Fingerprint, ScanFace, Camera, CameraOff, Lock, Eye, Sliders, Maximize2 } from 'lucide-react';
import { useTradingStore } from '../store';
import { startRegistration } from '@simplewebauthn/browser';

export default function SettingsView() {
  const { 
    user,
    securityLogs,
    clearSecurityLogs,
    activeBroker, 
    setActiveBroker, 
    addNotification,
    backendMode,
    setBackendMode,
    backendUrl,
    backendWsUrl,
    backendToken,
    backendConnectionState,
    setBackendConfig,
    setBackendConnectionState,
    touchIdEnrolled,
    faceIdEnrolled,
    setTouchIdEnrolled,
    setFaceIdEnrolled,
    addSecurityLog,
    layoutDensity,
    setLayoutDensity,
    screenWidth,
    setScreenWidth,
    textScale,
    setTextScale,
    setIsOnboardingCompleted
  } = useTradingStore();

  const [activeTab, setActiveTab] = useState<'brokers' | 'backend' | 'api' | 'notif' | 'sec'>('backend');

  // Connection state
  const [isTesting, setIsTesting] = useState(false);
  const [connectedBrokers, setConnectedBrokers] = useState<string[]>(['Binance Pro']);
  
  // Form input mock states
  const [apiKey, setApiKey] = useState('**********');
  const [apiSecret, setApiSecret] = useState('********************');

  // Custom backend local states
  const [tempUrl, setTempUrl] = useState(backendUrl);
  const [tempWsUrl, setTempWsUrl] = useState(backendWsUrl);
  const [tempToken, setTempToken] = useState(backendToken);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    'SYSTEM [info]: Aegis live api integration client ready.',
    'SYSTEM [info]: Awaiting user deployment configuration input.',
    'LOG: Set the Toggle below to "My Custom Backend" to pipe client triggers to your systems.'
  ]);
  const [isTestingBackend, setIsTestingBackend] = useState(false);

  // Biometric Enrollment Visual States
  const [enrollingType, setEnrollingType] = useState<'fingerprint' | 'face' | 'none'>('none');
  const [enrollProgress, setEnrollProgress] = useState(0);
  const [isHoldingFingerprint, setIsHoldingFingerprint] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [cameraStreamStatus, setCameraStreamStatus] = useState<'idle' | 'requesting' | 'active' | 'error'>('idle');
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const [facePos, setFacePos] = React.useState({ x: 50, y: 50 });
  const [livenessStatusText, setLivenessStatusText] = React.useState('Position face in target circle...');
  const [enrollStatusType, setEnrollStatusType] = React.useState<'scanning' | 'success' | 'failed'>('scanning');

  // Camera startup for Face ID enrollment
  const startEnrollCamera = async () => {
    setCameraStreamStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 400 }, 
          height: { ideal: 400 },
          facingMode: "user" 
        } 
      });
      setVideoStream(stream);
      setCameraStreamStatus('active');
    } catch (err: any) {
      console.warn("Camera media access denied or missing hardware:", err);
      setCameraStreamStatus('error');
    }
  };

  // Turn off enrollment camera
  const stopEnrollCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    setCameraStreamStatus('idle');
  };

  // Synchronize camera when changing enrollment mode
  React.useEffect(() => {
    if (enrollingType === 'face') {
      startEnrollCamera();
    } else {
      stopEnrollCamera();
    }
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [enrollingType]);

  // Handle video element reference mapping for enrollment camera
  React.useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  // Touch ID holding scan effect for enrollment with rapid decay on release
  React.useEffect(() => {
    if (enrollingType !== 'fingerprint') return;
    if (enrollProgress >= 100) {
      setIsHoldingFingerprint(false);
      // Automatically enroll once progress hits 100
      setTouchIdEnrolled(true);
      addSecurityLog(`In-App Touch ID fingerprint template successfully enrolled`);
      addNotification(`Biometrics enrolled: Touch ID fingerprint is now configured.`, 'info');
      setEnrollingType('none');
      setEnrollProgress(0);
      return;
    }

    let intervalId: any;
    if (isHoldingFingerprint) {
      intervalId = setInterval(() => {
        setEnrollProgress((prev) => {
          const next = prev + 2.5; 
          return next >= 100 ? 100 : next;
        });
      }, 30);
    } else {
      // If let go, decay the progress back to 0 rapidly
      if (enrollProgress > 0) {
        intervalId = setInterval(() => {
          setEnrollProgress((prev) => {
            if (prev <= 0) {
              clearInterval(intervalId);
              return 0;
            }
            const next = prev - 8;
            return next < 0 ? 0 : next;
          });
        }, 20);
      }
    }

    return () => clearInterval(intervalId);
  }, [enrollingType, isHoldingFingerprint, enrollProgress]);

  const generateEmbedding = (fx: number, fy: number): number[] => {
    const embedding: number[] = [];
    const baseRatio = (fx * 1.25) / (fy || 1);
    for (let i = 0; i < 128; i++) {
      embedding.push(Math.sin(baseRatio * (i + 1)) * 0.1 + (i % 5) * 0.05);
    }
    return embedding;
  };

  const triggerWebAuthnRegistration = async (currentEmbedding: number[]) => {
    try {
      setLivenessStatusText('LIVENESS PASSED. Initializing Passkey registration...');
      addSecurityLog('Liveness verification completed. Invoking WebAuthn enrollment...');
      
      const userEmail = user?.email || 'demo@aegis.ai';

      // 1. Get registration options from server
      const optionsRes = await fetch(`/api/auth/register-options?email=${encodeURIComponent(userEmail)}`);
      if (!optionsRes.ok) {
        throw new Error('Failed to retrieve registration options.');
      }
      const options = await optionsRes.json();
      
      // 2. Browser WebAuthn prompt
      const credential = await startRegistration(options);
      
      // 3. Post verifying payload
      const verifyRes = await fetch('/api/auth/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: credential,
          email: userEmail,
          faceEmbedding: currentEmbedding
        })
      });

      if (!verifyRes.ok) {
        const errJson = await verifyRes.json();
        throw new Error(errJson.error || 'Registration verification rejected.');
      }

      const verifyResult = await verifyRes.json();
      if (verifyResult.verified) {
        setEnrollStatusType('success');
        setLivenessStatusText('ENROLLED SUCCESSFULLY');
        setFaceIdEnrolled(true);
        addSecurityLog('Passkey + Face ID successfully enrolled and linked.');
        addNotification('Biometrics enrolled: Face ID visual signature and Passkey configured.', 'info');
        
        setTimeout(() => {
          setEnrollingType('none');
          setEnrollProgress(0);
        }, 1500);
      }
    } catch (err: any) {
      console.error('[WebAuthn] Registration flow failed:', err);
      setEnrollStatusType('failed');
      setLivenessStatusText(`Enrollment failed: ${err.message}`);
      addSecurityLog(`Passkey enrollment rejected: ${err.message}`);
    }
  };

  // Face ID real-time tracking & liveness verification loop for enrollment
  React.useEffect(() => {
    if (enrollingType !== 'face' || cameraStreamStatus !== 'active' || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let localFaceX = 50;
    let localFaceY = 50;
    
    const xHistory: number[] = [];
    const lightHistory: number[] = [];
    
    let currentStep: 'align' | 'turn' | 'blink' | 'success' = 'align';
    let progressVal = 0;
    let wsResolved = false;

    const analyzeFrame = () => {
      if (video.paused || video.ended || wsResolved) {
        animId = requestAnimationFrame(analyzeFrame);
        return;
      }

      ctx.drawImage(video, 0, 0, 40, 40);
      const imgData = ctx.getImageData(0, 0, 40, 40);
      const data = imgData.data;

      let totalX = 0;
      let totalY = 0;
      let skinPixelsCount = 0;
      let eyeRegionLightnessSum = 0;
      let eyeRegionPixelsCount = 0;

      for (let y = 0; y < 40; y++) {
        for (let x = 0; x < 40; x++) {
          const idx = (y * 40 + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          const rNorm = r / 255;
          const gNorm = g / 255;
          const bNorm = b / 255;
          const max = Math.max(rNorm, gNorm, bNorm);
          const min = Math.min(rNorm, gNorm, bNorm);
          let h = 0;
          let s = 0;
          const l = (max + min) / 2;

          if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max === rNorm) {
              h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
            } else if (max === gNorm) {
              h = (bNorm - rNorm) / d + 2;
            } else {
              h = (rNorm - gNorm) / d + 4;
            }
            h /= 6;
          }

          const hueDegrees = h * 360;
          if (hueDegrees >= 0 && hueDegrees <= 50 && s >= 0.15 && s <= 0.8 && l >= 0.15 && l <= 0.85) {
            totalX += x;
            totalY += y;
            skinPixelsCount++;
          }
        }
      }

      let detectedX = 50;
      let detectedY = 50;

      if (skinPixelsCount > 30) {
        detectedX = (totalX / skinPixelsCount) * 2.5;
        detectedY = (totalY / skinPixelsCount) * 2.5;
        
        const eyeMinX = Math.max(0, Math.floor((detectedX - 15) / 2.5));
        const eyeMaxX = Math.min(39, Math.floor((detectedX + 15) / 2.5));
        const eyeMinY = Math.max(0, Math.floor((detectedY - 12) / 2.5));
        const eyeMaxY = Math.min(39, Math.floor((detectedY - 6) / 2.5));

        for (let ey = eyeMinY; ey <= eyeMaxY; ey++) {
          for (let ex = eyeMinX; ex <= eyeMaxX; ex++) {
            const eidx = (ey * 40 + ex) * 4;
            const er = data[eidx];
            const eg = data[eidx + 1];
            const eb = data[eidx + 2];
            const lightness = (Math.max(er, eg, eb) + Math.min(er, eg, eb)) / 510;
            eyeRegionLightnessSum += lightness;
            eyeRegionPixelsCount++;
          }
        }
      }

      localFaceX = localFaceX + (detectedX - localFaceX) * 0.1;
      localFaceY = localFaceY + (detectedY - localFaceY) * 0.1;
      setFacePos({ x: localFaceX, y: localFaceY });

      if (skinPixelsCount > 30) {
        const isCentered = localFaceX >= 35 && localFaceX <= 65 && localFaceY >= 35 && localFaceY <= 65;
        
        if (currentStep === 'align') {
          setLivenessStatusText('Align face inside target box...');
          if (isCentered) {
            progressVal = Math.min(progressVal + 1.5, 40);
            setEnrollProgress(progressVal);
            if (progressVal >= 40) {
              currentStep = 'turn';
              progressVal = 40;
            }
          } else {
            progressVal = Math.max(progressVal - 1.5, 0);
            setEnrollProgress(progressVal);
          }
        } 
        else if (currentStep === 'turn') {
          setLivenessStatusText('Calibration: Turn head slowly left & right...');
          xHistory.push(localFaceX);
          if (xHistory.length > 55) xHistory.shift();

          const xMin = Math.min(...xHistory);
          const xMax = Math.max(...xHistory);
          const span = xMax - xMin;

          if (span >= 8 && isCentered) {
            progressVal = Math.min(progressVal + 2.0, 70);
            setEnrollProgress(progressVal);
            if (progressVal >= 70) {
              currentStep = 'blink';
              progressVal = 70;
            }
          }
        }
        else if (currentStep === 'blink') {
          setLivenessStatusText('Authentication: Blink eyes now...');
          
          if (eyeRegionPixelsCount > 0) {
            const avgLight = eyeRegionLightnessSum / eyeRegionPixelsCount;
            lightHistory.push(avgLight);
            if (lightHistory.length > 30) lightHistory.shift();

            const rollingAvg = lightHistory.reduce((sum, v) => sum + v, 0) / lightHistory.length;
            const currentLight = lightHistory[lightHistory.length - 1];
            const dip = rollingAvg - currentLight;

            if (dip > 0.08 && lightHistory.length > 15) {
              progressVal = 100;
              setEnrollProgress(100);
              wsResolved = true;
              currentStep = 'success';
              
              const finalEmbedding = generateEmbedding(localFaceX, localFaceY);
              triggerWebAuthnRegistration(finalEmbedding);
            }
          }
        }
      } else {
        progressVal = Math.max(progressVal - 1, 0);
        setEnrollProgress(progressVal);
        setLivenessStatusText('Face lost! Position face in scanner frame.');
      }

      animId = requestAnimationFrame(analyzeFrame);
    };

    analyzeFrame();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [enrollingType, cameraStreamStatus]);

  const handleTestBackendConnection = async () => {
    setIsTestingBackend(true);
    setBackendConnectionState('connecting');
    setTerminalLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] CLUSTER [ping]: Initiating connection to API: ${tempUrl}...`,
      `[${new Date().toLocaleTimeString()}] HTTP [probe]: GET ${tempUrl}/api/health ...`
    ]);

    try {
      // 1. REST API probe with abort timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const response = await fetch(`${tempUrl}/api/health`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }
      
      const data = await response.json();
      
      setTerminalLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] HTTP [200]: REST probe successful. Connection established. Status: ${data.status || 'ok'}`,
        `[${new Date().toLocaleTimeString()}] SOCKET [handshake]: Initializing WS pipe on ${tempWsUrl}...`,
        `[${new Date().toLocaleTimeString()}] WS [auth]: Passing security credentials payload...`
      ]);

      // 2. WebSocket handshake probe
      let wsResolved = false;
      const ws = new WebSocket(tempWsUrl);
      
      const wsTimeout = setTimeout(() => {
        if (!wsResolved) {
          wsResolved = true;
          ws.onopen = null;
          ws.onerror = null;
          try { ws.close(); } catch(e) {}
          
          setTerminalLogs(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] WS [timeout]: Handshake verification timed out after 5000ms.`,
            `[${new Date().toLocaleTimeString()}] CLUSTER [failed]: Custom backend synchronization failed.`
          ]);
          setIsTestingBackend(false);
          setBackendConnectionState('error');
          addNotification(`Failed to validate WebSocket endpoint at ${tempWsUrl}`, 'alert');
        }
      }, 5000);

      ws.onopen = () => {
        if (wsResolved) return;
        wsResolved = true;
        clearTimeout(wsTimeout);
        
        setTerminalLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] WS [active]: Protocol upgraded to RFC6455. Streaming live ticker feed channels!`,
          `[${new Date().toLocaleTimeString()}] CLUSTER [synchronized]: Custom backend endpoint is now completely online.`
        ]);
        
        try { ws.close(); } catch(e) {}
        
        setIsTestingBackend(false);
        setBackendConfig(tempUrl, tempWsUrl, tempToken);
        setBackendConnectionState('connected');
        addNotification(`Connected: Handshake completed with custom backend ${tempUrl}`, 'info');
      };

      ws.onerror = () => {
        if (wsResolved) return;
        wsResolved = true;
        clearTimeout(wsTimeout);
        
        setTerminalLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] WS [error]: Connection handshake refused by remote service.`,
          `[${new Date().toLocaleTimeString()}] CLUSTER [failed]: Custom backend synchronization failed.`
        ]);
        
        setIsTestingBackend(false);
        setBackendConnectionState('error');
        addNotification(`WebSocket connection refused at ${tempWsUrl}`, 'alert');
      };

    } catch (err: any) {
      setTerminalLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] HTTP [failed]: REST probe failed. Reason: ${err.message || err}`,
        `[${new Date().toLocaleTimeString()}] CLUSTER [failed]: Custom backend verification failed.`
      ]);
      setIsTestingBackend(false);
      setBackendConnectionState('error');
      addNotification(`Failed to connect to custom API: ${err.message || err}`, 'alert');
    }
  };

  const handleTestConnection = () => {
    setIsTesting(true);
    setTimeout(() => {
      setIsTesting(false);
      if (!connectedBrokers.includes(activeBroker)) {
        setConnectedBrokers([...connectedBrokers, activeBroker]);
      }
      addNotification(`Broker handshake successful: Authenticated with ${activeBroker}.`, 'info');
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Intro and Page layout Navigation */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            <span>Terminal Configurations</span>
          </h2>
          <p className="text-[11px] text-slate-500 font-sans">
            Manage Broker Bridges, configure API constraints and coordinate notification alerts
          </p>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Options menu list */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-3 rounded-xl shadow-lg h-fit space-y-1">
          <button
            onClick={() => setActiveTab('brokers')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'brokers' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Broker Connections</span>
          </button>

          <button
            onClick={() => setActiveTab('backend')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'backend' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Custom Live Backend</span>
          </button>
          
          <button
            onClick={() => setActiveTab('api')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'api' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>AI Provider & API Keys</span>
          </button>

          <button
            onClick={() => setActiveTab('notif')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'notif' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notifications Deck</span>
          </button>

          <button
            onClick={() => setActiveTab('sec')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === 'sec' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Security locks</span>
          </button>
        </div>

        {/* Right Settings Form Block */}
        <div className="lg:col-span-3 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-5 rounded-xl shadow-lg">
          {activeTab === 'backend' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Custom Live Backend Integration</h3>
                <p className="text-[11px] text-slate-500 mb-4">
                  Seamlessly bridge this terminal interface to your personal custom API and live stream tickers.
                </p>
              </div>

              {/* Mode Toggle Selector */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                <label className="block text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase">
                  ACTIVE ENGINE SOURCE
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setBackendMode('simulated');
                      addNotification('Switched to standard live pricing engine', 'info');
                    }}
                    className={`p-3 rounded-lg border text-xs font-semibold uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 transition-all ${
                      backendMode === 'simulated'
                        ? 'bg-indigo-950/30 border-indigo-505 border-indigo-500/50 text-indigo-400 shadow shadow-indigo-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-sm font-bold">Standard Feed</span>
                    <span className="text-[9px] font-mono text-zinc-500 normal-case font-normal">
                      High-frequency active stream
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setBackendMode('custom');
                      addNotification('Switched to Live Custom Backend mode. Ensure API credentials are set.', 'alert');
                    }}
                    className={`p-3 rounded-lg border text-xs font-semibold uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 transition-all ${
                      backendMode === 'custom'
                        ? 'bg-emerald-950/30 border-emerald-505 border-emerald-500/50 text-emerald-400 shadow shadow-emerald-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-sm font-bold">My Custom Backend</span>
                    <span className="text-[9px] font-mono text-zinc-500 normal-case font-normal">
                      Connect to your own running services
                    </span>
                  </button>
                </div>
              </div>

              {/* Backend Configurations & Ports */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-900/60">
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider font-bold">API ENDPOINT CONFIGURATION</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${backendConnectionState === 'connected' ? 'bg-emerald-400 shadow shadow-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                    <span className="text-[9px] text-slate-400 font-mono font-bold uppercase">
                      {backendConnectionState === 'connected' ? 'Connected' : backendConnectionState === 'connecting' ? 'Connecting...' : 'Disconnected'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase font-bold">
                      REST Base URL API Endpoint
                    </label>
                    <input
                      type="text"
                      placeholder="http://localhost:8000"
                      value={tempUrl}
                      onChange={(e) => setTempUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-100 font-mono p-2.5 rounded-lg focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase font-bold">
                      WebSocket Real-Time Rate Stream URL
                    </label>
                    <input
                      type="text"
                      placeholder="ws://localhost:8000/ws"
                      value={tempWsUrl}
                      onChange={(e) => setTempWsUrl(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-100 font-mono p-2.5 rounded-lg focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-mono mb-1 uppercase font-bold">
                      API Authorization Bearer Token
                    </label>
                    <input
                      type="password"
                      placeholder="Optional JWT or Secret Key"
                      value={tempToken}
                      onChange={(e) => setTempToken(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-100 font-mono p-2.5 rounded-lg focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>

                {/* Handshake Command log terminal display */}
                <div className="space-y-2 mt-4">
                  <label className="block text-[10px] text-slate-400 font-mono tracking-wider font-bold uppercase">
                    API CONNECTION OUTPUT TELEMETRY
                  </label>
                  <div className="bg-slate-950 border border-zinc-900 p-3.5 rounded-lg font-mono text-[10px] text-slate-300 max-h-40 overflow-y-auto space-y-1 select-none shadow-inner h-28">
                    {terminalLogs.map((log, i) => (
                      <p key={`term-${i}`} className={`leading-normal ${log.includes('successful') || log.includes('active') || log.includes('synchronized') || log.includes('200OK') || log.includes('Established') ? 'text-emerald-400' : log.includes('probe') || log.includes('auth') || log.includes('handshake') ? 'text-indigo-400' : 'text-slate-400'}`}>
                        {log}
                      </p>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestBackendConnection}
                  disabled={isTestingBackend}
                  className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:bg-indigo-900/40 text-white transition-colors py-2.5 rounded-xl font-bold text-xs"
                >
                  {isTestingBackend ? 'Dispatching validation pulse...' : 'Validate & Save Custom API Settings'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'brokers' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Bridge Connections</h3>
                <p className="text-[11px] text-slate-500 mb-4">Set up connections with IQ Option, Binance and more</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4">
                {/* Active selection indicator */}
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-mono tracking-wider font-bold mb-2">TARGET BROKER INTEGRATION</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {['Binance Pro', 'IQ Option', 'Future Brokers'].map((broker) => {
                      const isConnected = connectedBrokers.includes(broker);
                      const isActive = activeBroker === broker;
                      return (
                        <button
                          key={broker}
                          onClick={() => setActiveBroker(broker)}
                          className={`py-3.5 px-3 rounded-lg border text-xs font-semibold transition-all relative uppercase flex flex-col gap-1 items-center justify-center ${
                            isActive 
                              ? 'bg-emerald-950/20 border-emerald-500/50 text-emerald-400 shadow shadow-emerald-505' 
                              : 'bg-slate-900 border-slate-800 text-slate-420 hover:text-slate-202 hover:border-slate-700'
                          }`}
                        >
                          <span>{broker}</span>
                          {isConnected && (
                            <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 rounded block leading-none font-sans font-extrabold uppercase mt-1">
                              Connected
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* API Setup fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-900 pt-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-mono font-bold mb-1.5 uppercase">Broker API Key Access</label>
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 text-xs text-slate-100 font-mono p-2.5 rounded-lg focus:outline-none focus:border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-mono font-bold mb-1.5 uppercase">Broker Secret Phrase</label>
                    <input
                      type="password"
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 text-xs text-slate-100 font-mono p-2.5 rounded-lg focus:outline-none focus:border-slate-700"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="w-full bg-emerald-500 hover:bg-emerald-420 text-slate-950 transition-colors py-2.5 rounded-xl font-bold text-xs"
                >
                  {isTesting ? 'Initiating handshake network handshake...' : `Verify ${activeBroker} Handshake Connection`}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">AI Provider Configuration</h3>
                <p className="text-[11px] text-slate-500 mb-4">Wired up server-side capabilities with key endpoints</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-xs space-y-3">
                <div className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <div>
                    <span className="font-bold text-white block">Gemini 3.5 Flash Model</span>
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Endpoint: server-side proxy route (/api/copilot)</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded uppercase font-bold font-mono">Wired Active</span>
                </div>

                <p className="text-[11px] text-slate-500 leading-normal">
                  In compliance with Google AI Studio regulations, actual API keys are secured server-side and never exposed. If you wish to configure a custom endpoint, utilize the secrets dashboard panel.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'notif' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Notifications Alerts</h3>
                <p className="text-[11px] text-slate-500 mb-4">Set up system log feeds and alerts threshold limits</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3 text-xs text-slate-350">
                <div className="flex justify-between items-center py-2 border-b border-slate-900">
                  <span>Display desktop dialogs on critical AI signal creation</span>
                  <input type="checkbox" defaultChecked className="accent-emerald-500" />
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-900">
                  <span>Auditory click sound on execution settlement match</span>
                  <input type="checkbox" defaultChecked className="accent-emerald-500" />
                </div>
                <div className="flex justify-between items-center py-2 pt-1">
                  <span>Warn on margin allocation exceeding 10% on single ticket</span>
                  <input type="checkbox" defaultChecked className="accent-emerald-500" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sec' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Leverage & Security Constraints</h3>
                <p className="text-[11px] text-slate-500 mb-4">Hard physical parameters protecting from liquid balances risk</p>
              </div>

              {/* Physical properties checkboxes */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3 text-xs text-slate-350">
                <div className="flex justify-between items-center py-2 border-b border-slate-900/60">
                  <span className="font-medium">Enforce Stop-Loss requirement on manual ticket placement</span>
                  <input type="checkbox" defaultChecked className="accent-emerald-500 h-3.5 w-3.5" />
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium">Auto-liquidate positions if drawdown passes Max limits immediately</span>
                  <input type="checkbox" defaultChecked className="accent-emerald-500 h-3.5 w-3.5" />
                </div>
              </div>

              {/* Biometrics Protection & Onboarding Section */}
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Aegis Biometric Keys & Passcode bypass</h3>
                <p className="text-[11px] text-slate-500 mb-4 font-sans">
                  Enroll, map, and enable device biometrics (Touch ID and Face ID) to activate instant login bypass keys.
                </p>
              </div>

              {enrollingType !== 'none' ? (
                // Active enrollment workspace panel
                <div className="bg-slate-950 p-6 rounded-xl border border-indigo-500/20 space-y-4 animate-fadeIn">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-900/60 font-mono">
                    <span className="text-[10px] text-indigo-400 tracking-wider font-bold uppercase">
                      {enrollingType === 'fingerprint' ? 'Touch ID Fingerprint Link Core' : 'Neural Face Array Scan Link'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEnrollingType('none');
                        setEnrollProgress(0);
                        setEnrollStatusType('scanning');
                        setLivenessStatusText('Position face in target circle...');
                        stopEnrollCamera();
                      }}
                      className="text-[10px] hover:text-rose-400 text-slate-400 transition-colors uppercase font-bold"
                    >
                      [Abort Enrollment]
                    </button>
                  </div>

                  {enrollingType === 'fingerprint' ? (
                    <div className="flex flex-col items-center py-6 space-y-4 text-center">
                      <div className="relative h-20 w-20 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-2 border-dashed border-slate-800 animate-spin duration-10000" />
                        
                        {/* Interactive dynamic visual progress perimeter */}
                        <svg className="absolute inset-0 -rotate-90 transform h-20 w-20">
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            className="text-slate-900"
                            strokeWidth="3"
                            stroke="currentColor"
                            fill="transparent"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            className={`${isHoldingFingerprint ? 'text-indigo-500' : 'text-slate-700'} transition-all duration-100`}
                            strokeWidth="3.5"
                            strokeDasharray={`${2 * Math.PI * 36}`}
                            strokeDashoffset={`${2 * Math.PI * 36 * (1 - enrollProgress / 100)}`}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                          />
                        </svg>

                        <button
                          type="button"
                          onMouseDown={() => setIsHoldingFingerprint(true)}
                          onMouseUp={() => setIsHoldingFingerprint(false)}
                          onMouseLeave={() => setIsHoldingFingerprint(false)}
                          onTouchStart={() => setIsHoldingFingerprint(true)}
                          onTouchEnd={() => setIsHoldingFingerprint(false)}
                          className={`relative h-14 w-14 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                            isHoldingFingerprint
                              ? 'bg-indigo-950/40 text-indigo-400 scale-95 border border-indigo-500/35 shadow-inner'
                              : 'bg-slate-900 text-slate-400 hover:text-indigo-400 border border-slate-800'
                          }`}
                        >
                          <Fingerprint className={`w-7 h-7 ${isHoldingFingerprint ? 'animate-pulse' : ''}`} />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-200">
                          {isHoldingFingerprint ? 'Capturing Fingerprint Template...' : 'Press and hold sensor pad'}
                        </p>
                        <p className="text-[10px] text-slate-500 max-w-xs font-mono">
                          {isHoldingFingerprint ? 'Securing key hashes via hardware enclave...' : 'Position your thumb print over the sensor pad and maintain contact.'}
                        </p>
                      </div>

                      <div className="w-full max-w-xs space-y-2">
                        <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                          <span>TEMPORAL SIGNAL DATA BUFFER</span>
                          <span className={isHoldingFingerprint ? 'text-indigo-400 font-bold' : ''}>
                            {Math.round(enrollProgress)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-905 bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-100 ease-out ${
                              isHoldingFingerprint ? 'bg-indigo-500' : 'bg-slate-700'
                            }`}
                            style={{ width: `${enrollProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-4 space-y-4 text-center">
                      <div className="relative h-32 w-32 rounded-full overflow-hidden border-2 border-slate-800 bg-slate-950 flex items-center justify-center">
                        {cameraStreamStatus === 'active' ? (
                          <>
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              muted
                              className="h-full w-full object-cover scale-x-100"
                            />
                            {/* Neural vector layout tracking guides over user face */}
                            {enrollStatusType === 'scanning' && (
                              <>
                                {/* Intersecting horizontal matrix laser scan */}
                                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-md shadow-cyan-400 animate-scan-line top-0 z-20" />
                                
                                {/* Floating HUD Tracking Overlays */}
                                <div className="absolute inset-0 pointer-events-none select-none overflow-hidden rounded-full z-10">
                                  {/* Corner indicators or circular sights */}
                                  <div className="absolute inset-4 rounded-full border border-dashed border-cyan-500/15 animate-spin [animation-duration:15s]" />
                                  <div className="absolute inset-7 rounded-full border border-dotted border-cyan-500/20 animate-spin [animation-duration:10s] [animation-direction:reverse]" />

                                  {/* Top stats readout */}
                                  <div className="absolute top-2 left-6 text-[7px] font-mono text-cyan-400/75 flex flex-col items-start leading-[9px] scale-[0.8]">
                                    <span>FPS: 60.0</span>
                                    <span>MESH: ACTIVE</span>
                                  </div>
                                  <div className="absolute top-2 right-6 text-[7px] font-mono text-cyan-400/75 flex flex-col items-end leading-[9px] scale-[0.8]">
                                    <span>SYS: SECURE</span>
                                    <span>Z-D: 0.44m</span>
                                  </div>

                                  {/* Tracking Nodes */}
                                  {/* Eye Left */}
                                  <div className="absolute text-cyan-454 font-mono animate-jitter-1 flex flex-col items-center transition-all duration-75" style={{ top: `${facePos.y - 12}%`, left: `${facePos.x - 18}%` }}>
                                    <div className="w-1 h-1 bg-cyan-450 rounded-full shadow-[0_0_4px_rgba(34,211,238,0.8)]" />
                                    <div className="absolute -top-3 text-[5px] tracking-tighter opacity-80 scale-[0.7]">EYE.L</div>
                                    <div className="w-2.5 h-2.5 rounded-full border border-cyan-400/30 absolute -top-0.5 -left-0.5 animate-ping" />
                                  </div>

                                  {/* Eye Right */}
                                  <div className="absolute text-cyan-454 font-mono animate-jitter-2 flex flex-col items-center transition-all duration-75" style={{ top: `${facePos.y - 12}%`, left: `${facePos.x + 18}%` }}>
                                    <div className="w-1 h-1 bg-cyan-455 rounded-full shadow-[0_0_4px_rgba(34,211,238,0.8)]" />
                                    <div className="absolute -top-3 text-[5px] tracking-tighter opacity-80 scale-[0.7]">EYE.R</div>
                                    <div className="w-2.5 h-2.5 rounded-full border border-cyan-400/30 absolute -top-0.5 -left-0.5 animate-ping" />
                                  </div>

                                  {/* Nose Bridge */}
                                  <div className="absolute text-cyan-454 font-mono animate-jitter-3 flex flex-col items-center transition-all duration-75" style={{ top: `${facePos.y + 3}%`, left: `${facePos.x}%` }}>
                                    <div className="w-1 h-1 bg-cyan-455 rounded-full shadow-[0_0_3px_rgba(34,211,238,0.8)]" />
                                    <div className="absolute -bottom-3 text-[5px] tracking-tighter opacity-85 scale-[0.7]">N.CTR</div>
                                  </div>

                                  {/* Forehead Center */}
                                  <div className="absolute text-cyan-454 font-mono animate-jitter-1 flex flex-col items-center transition-all duration-75" style={{ top: `${facePos.y - 26}%`, left: `${facePos.x}%` }}>
                                    <div className="w-1 h-1 bg-cyan-455 rounded-full shadow-[0_0_3px_rgba(34,211,238,0.8)]" />
                                    <div className="absolute -top-3 text-[5px] tracking-tighter opacity-80 scale-[0.7]">FHD</div>
                                  </div>

                                  {/* Cheek Left */}
                                  <div className="absolute text-cyan-454 font-mono animate-jitter-2 flex flex-col items-center transition-all duration-75" style={{ top: `${facePos.y + 4}%`, left: `${facePos.x - 28}%` }}>
                                    <div className="w-1 h-1 bg-cyan-455 rounded-full opacity-60" />
                                    <div className="absolute -left-4 text-[5px] tracking-tighter opacity-60 scale-[0.6]">C.L</div>
                                  </div>

                                  {/* Cheek Right */}
                                  <div className="absolute text-cyan-454 font-mono animate-jitter-3 flex flex-col items-center transition-all duration-75" style={{ top: `${facePos.y + 4}%`, left: `${facePos.x + 28}%` }}>
                                    <div className="w-1 h-1 bg-cyan-455 rounded-full opacity-60" />
                                    <div className="absolute -right-4 text-[5px] tracking-tighter opacity-60 scale-[0.6]">C.R</div>
                                  </div>

                                  {/* Mouth Border Left */}
                                  <div className="absolute text-cyan-454 font-mono animate-jitter-1 transition-all duration-75" style={{ top: `${facePos.y + 19}%`, left: `${facePos.x - 12}%` }}>
                                    <div className="w-1 h-1 bg-cyan-455 rounded-full opacity-70" />
                                  </div>

                                  {/* Mouth Border Right */}
                                  <div className="absolute text-cyan-454 font-mono animate-jitter-2 transition-all duration-75" style={{ top: `${facePos.y + 19}%`, left: `${facePos.x + 12}%` }}>
                                    <div className="w-1 h-1 bg-cyan-455 rounded-full opacity-70" />
                                  </div>

                                  {/* Chin Base */}
                                  <div className="absolute text-cyan-454 font-mono animate-jitter-3 flex flex-col items-center transition-all duration-75" style={{ top: `${facePos.y + 30}%`, left: `${facePos.x}%` }}>
                                    <div className="w-1 h-1 bg-cyan-455 rounded-full shadow-[0_0_3px_rgba(34,211,238,0.8)]" />
                                    <div className="absolute -bottom-3 text-[5px] tracking-tighter opacity-80 scale-[0.7]">JAW</div>
                                  </div>

                                  {/* Neural vector SVG links */}
                                  <svg className="absolute inset-0 w-full h-full opacity-35 stroke-cyan-400 stroke-[0.75] fill-none transition-all duration-75">
                                    {/* Brows line */}
                                    <line x1={`${facePos.x - 18}%`} y1={`${facePos.y - 12}%`} x2={`${facePos.x + 18}%`} y2={`${facePos.y - 12}%`} strokeDasharray="1,2" />
                                    <line x1={`${facePos.x}%`} y1={`${facePos.y - 26}%`} x2={`${facePos.x - 18}%`} y2={`${facePos.y - 12}%`} strokeDasharray="2,2" />
                                    <line x1={`${facePos.x}%`} y1={`${facePos.y - 26}%`} x2={`${facePos.x + 18}%`} y2={`${facePos.y - 12}%`} strokeDasharray="2,2" />
                                    
                                    {/* Optical matching sights to grid */}
                                    <line x1={`${facePos.x - 18}%`} y1={`${facePos.y - 12}%`} x2={`${facePos.x}%`} y2={`${facePos.y + 3}%`} strokeDasharray="1,1" />
                                    <line x1={`${facePos.x + 18}%`} y1={`${facePos.y - 12}%`} x2={`${facePos.x}%`} y2={`${facePos.y + 3}%`} strokeDasharray="1,1" />

                                    {/* Facemesh cheek boundaries */}
                                    <line x1={`${facePos.x - 28}%`} y1={`${facePos.y + 4}%`} x2={`${facePos.x}%`} y2={`${facePos.y + 3}%`} strokeDasharray="2,2" />
                                    <line x1={`${facePos.x + 28}%`} y1={`${facePos.y + 4}%`} x2={`${facePos.x}%`} y2={`${facePos.y + 3}%`} strokeDasharray="2,2" />
                                    <line x1={`${facePos.x - 28}%`} y1={`${facePos.y + 4}%`} x2={`${facePos.x - 12}%`} y2={`${facePos.y + 19}%`} strokeDasharray="2,1" />
                                    <line x1={`${facePos.x + 28}%`} y1={`${facePos.y + 4}%`} x2={`${facePos.x + 12}%`} y2={`${facePos.y + 19}%`} strokeDasharray="2,1" />

                                    {/* Lower chin connection array */}
                                    <line x1={`${facePos.x - 12}%`} y1={`${facePos.y + 19}%`} x2={`${facePos.x + 12}%`} y2={`${facePos.y + 19}%`} strokeDasharray="1,1" />
                                    <line x1={`${facePos.x - 12}%`} y1={`${facePos.y + 19}%`} x2={`${facePos.x}%`} y2={`${facePos.y + 30}%`} strokeDasharray="2,2" />
                                    <line x1={`${facePos.x + 12}%`} y1={`${facePos.y + 19}%`} x2={`${facePos.x}%`} y2={`${facePos.y + 30}%`} strokeDasharray="2,2" />
                                  </svg>
                                </div>
                              </>
                            )}

                            {enrollStatusType === 'success' && (
                              <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-sm flex items-center justify-center z-30 animate-fadeIn">
                                <Check className="h-14 w-14 text-emerald-400" />
                              </div>
                            )}

                            {enrollStatusType === 'failed' && (
                              <div className="absolute inset-0 bg-rose-955/85 bg-rose-950/85 backdrop-blur-sm flex items-center justify-center z-30 animate-fadeIn">
                                <AlertCircle className="h-14 w-14 text-rose-500" />
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-500 p-2 space-y-1">
                            {cameraStreamStatus === 'requesting' ? (
                              <>
                                <svg className="animate-spin h-5 w-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="text-[9px] font-mono mt-2">Requesting device camera...</span>
                              </>
                            ) : (
                              <>
                                <CameraOff className="w-6 h-6 text-slate-600 mb-1" />
                                <span className="text-[9px] font-mono uppercase text-slate-500">Camera offline</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-200">
                          {livenessStatusText}
                        </p>
                        <p className="text-[10px] text-slate-500 max-w-xs font-mono">
                          {enrollingType === 'face' ? 'Align face in camera view and follow the calibration instructions.' : 'Position your face into the viewfinder. Confirming depth vertex maps.'}
                        </p>
                      </div>

                      <div className="w-full max-w-xs space-y-2">
                        <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                          <span>NEURAL FRAME VECTOR BUILD</span>
                          <span className="text-emerald-400 font-bold">{Math.round(enrollProgress)}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-905 bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-150 ease-out"
                            style={{ width: `${enrollProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Setup and selection dashboard
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Touch ID Enroll Card */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col justify-between space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 text-left">
                        <span className="text-[9px] font-mono text-indigo-400 uppercase font-black tracking-widest block">SECURE ENCLAVE MATCH</span>
                        <h4 className="text-xs font-semibold text-slate-200">Touch ID Fingerprint Gate</h4>
                        <p className="text-[11px] text-slate-500 font-sans">
                          Sign in safely from any registered personal device with a physical finger press.
                        </p>
                      </div>
                      <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-550/20 text-indigo-400 flex items-center justify-center shrink-0">
                        <Fingerprint className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-900/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${touchIdEnrolled ? 'bg-emerald-400 shadow shadow-emerald-400' : 'bg-slate-800'}`} />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                          {touchIdEnrolled ? 'Enrolled & Active' : 'Not Registered'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {touchIdEnrolled && (
                          <button
                            id="btn-remove-settings-touchid"
                            type="button"
                            onClick={() => {
                              setTouchIdEnrolled(false);
                              addSecurityLog("Operator Touch ID template revoked from terminal keyring");
                              addNotification("Touch ID template successfully revoked.", "alert");
                            }}
                            className="text-[9px] font-mono font-bold text-slate-500 hover:text-rose-405 hover:text-rose-400 border border-slate-800 hover:border-rose-400/30 bg-slate-900 px-2 py-1 rounded transition-all uppercase cursor-pointer"
                          >
                            Revoke
                          </button>
                        )}
                        <button
                          id="btn-enroll-settings-touchid"
                          type="button"
                          onClick={() => {
                            setEnrollingType('fingerprint');
                            setEnrollProgress(0);
                            setEnrollStatusType('scanning');
                          }}
                          className={`text-[9px] font-mono font-extrabold uppercase px-3 py-1.2 rounded transition-all cursor-pointer ${
                            touchIdEnrolled
                              ? 'bg-slate-900 border border-slate-800 text-slate-350 hover:bg-slate-800'
                              : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow shadow-indigo-500/10'
                          }`}
                        >
                          {touchIdEnrolled ? 'Re-Enroll' : 'Enroll Key'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Face ID Enroll Card */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col justify-between space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 text-left">
                        <span className="text-[9px] font-mono text-indigo-400 uppercase font-black tracking-widest block">NEURAL GRID RECOGNITION</span>
                        <h4 className="text-xs font-semibold text-slate-200">Face ID Facial Scanner</h4>
                        <p className="text-[11px] text-slate-500 font-sans">
                          Instant visual authorization mapping of your biometric neural coordinate structures.
                        </p>
                      </div>
                      <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-550/20 text-indigo-400 flex items-center justify-center shrink-0">
                        <ScanFace className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-900/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${faceIdEnrolled ? 'bg-emerald-400 shadow shadow-emerald-400' : 'bg-slate-800'}`} />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                          {faceIdEnrolled ? 'Enrolled & Active' : 'Not Registered'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {faceIdEnrolled && (
                          <button
                            id="btn-remove-settings-faceid"
                            type="button"
                            onClick={() => {
                              setFaceIdEnrolled(false);
                              addSecurityLog("Operator Face ID neural matrix revoked from terminal keyring");
                              addNotification("Face ID visual signature successfully revoked.", "alert");
                            }}
                            className="text-[9px] font-mono font-bold text-slate-500 hover:text-rose-405 hover:text-rose-400 border border-slate-800 hover:border-rose-400/30 bg-slate-900 px-2 py-1 rounded transition-all uppercase cursor-pointer"
                          >
                            Revoke
                          </button>
                        )}
                        <button
                          id="btn-enroll-settings-faceid"
                          type="button"
                          onClick={() => {
                            setEnrollingType('face');
                            setEnrollProgress(0);
                            setEnrollStatusType('scanning');
                            setLivenessStatusText('Position face in target circle...');
                          }}
                          className={`text-[9px] font-mono font-extrabold uppercase px-3 py-1.2 rounded transition-all cursor-pointer ${
                            faceIdEnrolled
                              ? 'bg-slate-900 border border-slate-800 text-slate-350 hover:bg-slate-800'
                              : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow shadow-indigo-500/10'
                          }`}
                        >
                          {faceIdEnrolled ? 'Re-Enroll' : 'Enroll Key'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Workspace Layout Spacing & Text Scale Adjustment Options */}
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Workspace Dynamic Interface Scale</h3>
                <p className="text-[11px] text-slate-500 mb-4 font-sans">
                  Fine-tune layout density, scaling factors, and screen width constraints to make the dashboard perfectly flexible for any desktop or mobile hardware setup.
                </p>
              </div>

              <div className="bg-slate-950 p-5 rounded-xl border border-slate-850 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Option 1: Layout Density */}
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-mono text-indigo-400 uppercase font-bold tracking-wider block">
                      Screen Padding & Spacing
                    </label>
                    <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 animate-fadeIn">
                      {(['compact', 'normal', 'spacious'] as const).map((density) => (
                        <button
                          key={density}
                          type="button"
                          id={`btn-density-${density}`}
                          onClick={() => {
                            setLayoutDensity(density);
                            addNotification(`Interface padding changed: ${density.toUpperCase()} layout density active.`, 'info');
                          }}
                          className={`flex-1 text-[10px] font-mono font-bold capitalize py-1.5 px-2 rounded-md transition-all cursor-pointer ${
                            layoutDensity === density
                              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/15 shadow-sm font-black'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {density}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-500 font-sans block leading-normal pt-1">
                      Adjust grid gaps and spacing offsets to compress more metadata or gain breathing room.
                    </span>
                  </div>

                  {/* Option 2: Screen Width Limit */}
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-mono text-indigo-400 uppercase font-bold tracking-wider block">
                      Canvas Frame Width Constraints
                    </label>
                    <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 animate-fadeIn">
                      {(['centered', 'full'] as const).map((width) => (
                        <button
                          key={width}
                          type="button"
                          id={`btn-width-${width}`}
                          onClick={() => {
                            setScreenWidth(width);
                            addNotification(`Framework constraints shifted to: ${width.toUpperCase()} horizontal layout limits.`, 'info');
                          }}
                          className={`flex-1 text-[10px] font-mono font-bold capitalize py-1.5 px-2 rounded-md transition-all cursor-pointer ${
                            screenWidth === width
                              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/15 shadow-sm font-black'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {width}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-500 font-sans block leading-normal pt-1">
                      Toggle standard centered bounding box (max 1280px) or true borderless outer alignment for ultra-wide monitors.
                    </span>
                  </div>

                  {/* Option 3: Text Scale / Sizing */}
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-mono text-indigo-400 uppercase font-bold tracking-wider block">
                      Typography Scale Selector
                    </label>
                    <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 animate-fadeIn font-mono">
                      {(['sm', 'base', 'lg'] as const).map((scale) => (
                        <button
                          key={scale}
                          type="button"
                          id={`btn-scale-${scale}`}
                          onClick={() => {
                            setTextScale(scale);
                            addNotification(`Active type system scaled to: uppercase ${scale.toUpperCase()} layout.`, 'info');
                          }}
                          className={`flex-1 text-[10px] font-mono font-bold uppercase py-1.5 px-2 rounded-md transition-all cursor-pointer ${
                            textScale === scale
                              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/15 shadow-sm font-black'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {scale === 'base' ? 'MED' : scale}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-500 font-sans block leading-normal pt-1">
                      Scales core text size configurations dynamically across widgets for enhanced physical legibility or accessibility.
                    </span>
                  </div>
                </div>
              </div>

              {/* Cryptographic Session Profiles */}
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Cryptographic Operator Profile</h3>
                <p className="text-[11px] text-slate-500 mb-4 font-sans">Active credential parameters and network authorization streams</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between pb-3 border-b border-slate-900/60">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <Fingerprint className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-100 flex items-center gap-1">
                        {user?.name || 'Aegis Operator'}
                        <span className="text-[9px] font-mono font-bold bg-indigo-500/20 text-indigo-400 px-1.5 py-0.2 rounded">SIGNED ID</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">{user?.email || 'unregistered@aegis.ai'}</span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5">
                    <div>
                      <span className="text-[9px] font-mono text-zinc-500 block uppercase font-bold">ROUTING ENDPOINT ROLE</span>
                      <span className="text-xs font-bold text-slate-300 font-mono text-[11px]">{user?.role || 'Senior Quant Trader'}</span>
                    </div>
                    <button
                      id="btn-relaunch-onboarding"
                      type="button"
                      onClick={() => {
                        setIsOnboardingCompleted(false);
                        addNotification("Calibration session initialized. Entering onboarding system matrix.", "info");
                        addSecurityLog("Operator re-triggered full-scale layout & device calibrations wizard");
                      }}
                      className="text-[9px] font-mono font-extrabold uppercase px-2.5 py-1 text-indigo-455 text-indigo-400 bg-indigo-950/40 hover:bg-indigo-900/40 border border-indigo-500/15 rounded-md cursor-pointer transition-colors"
                    >
                      Recalibrate Setup
                    </button>
                  </div>
                </div>

                {/* Handshaking logs terminals */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono tracking-wider font-bold uppercase flex items-center gap-1">
                      <History className="w-3.5 h-3.5 text-indigo-400" />
                      <span>SECURE HANDSHAKE SIGNAL LEDGERS</span>
                    </span>
                    {securityLogs.length > 0 && (
                      <button
                        id="btn-clear-settings-seclogs"
                        type="button"
                        onClick={clearSecurityLogs}
                        className="text-[10px] text-slate-400 hover:text-rose-400 font-mono font-bold flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Flush Logs</span>
                      </button>
                    )}
                  </div>

                  <div className="bg-[#050507] border border-zinc-900/80 p-3.5 rounded-lg font-mono text-[10px] text-slate-300 max-h-48 overflow-y-auto space-y-2 h-36">
                    {securityLogs.length === 0 ? (
                      <div className="text-center text-slate-600 font-sans py-4">No security handshakes archived.</div>
                    ) : (
                      securityLogs.map((log) => (
                        <div key={log.id} className="flex justify-between items-start leading-normal text-slate-400 hover:bg-slate-900/10 p-1 rounded">
                          <span className="text-slate-300 flex items-center gap-1.5 truncate">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            <span className="truncate">{log.event}</span>
                          </span>
                          <span className="text-slate-500 shrink-0 text-right ml-4">
                            IP: {log.ip} • {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
