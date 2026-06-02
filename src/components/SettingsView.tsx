/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Settings, Shield, Bell, Network, HelpCircle, Check, Key, Server, Wifi, Play, AlertCircle, History, Trash2, Fingerprint, ScanFace, Camera, CameraOff, Lock, Eye, Sliders, Maximize2 } from 'lucide-react';
import { useTradingStore } from '../store';

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

  // Face ID scan progression generator for enrollment
  React.useEffect(() => {
    if (enrollingType !== 'face') return;
    if (enrollProgress >= 100) {
      setFaceIdEnrolled(true);
      addSecurityLog(`In-App Face ID facial vertex mesh successfully enrolled`);
      addNotification(`Biometrics enrolled: Face ID visual signature is now configured.`, 'info');
      setEnrollingType('none');
      setEnrollProgress(0);
      return;
    }

    if (cameraStreamStatus === 'requesting') return;

    const interval = setInterval(() => {
      setEnrollProgress((prev) => {
        const next = prev + Math.floor(Math.random() * 6) + 4;
        return next >= 100 ? 100 : next;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [enrollingType, cameraStreamStatus, enrollProgress]);

  const handleTestBackendConnection = () => {
    setIsTestingBackend(true);
    setBackendConnectionState('connecting');
    setTerminalLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] CLUSTER [ping]: Initiating connection to API: ${tempUrl}...`,
      `[${new Date().toLocaleTimeString()}] HTTP [probe]: GET ${tempUrl}/api/health ...`
    ]);

    setTimeout(() => {
      setTerminalLogs(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] HTTP [200]: REST probe successful. Connection established.`,
        `[${new Date().toLocaleTimeString()}] SOCKET [handshake]: Initializing WS pipe on ${tempWsUrl}...`,
        `[${new Date().toLocaleTimeString()}] WS [auth]: Passing security credentials payload...`
      ]);

      setTimeout(() => {
        setTerminalLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] WS [active]: Protocol upgraded to RFC6455. Streaming live ticker feed channels!`,
          `[${new Date().toLocaleTimeString()}] CLUSTER [synchronized]: Custom backend endpoint is now completely online.`
        ]);
        setIsTestingBackend(false);
        setBackendConfig(tempUrl, tempWsUrl, tempToken);
        setBackendConnectionState('connected');
        addNotification(`Connected: Handshake completed with custom backend ${tempUrl}`, 'info');
      }, 1000);
    }, 1200);
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
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                              <div className="h-24 w-24 rounded-full border border-emerald-400/40 border-dashed animate-pulse" />
                              <span className="absolute text-[8px] font-mono text-emerald-400/80 uppercase">Active mesh</span>
                              {enrollProgress > 30 && (
                                <span className="absolute top-4 left-4 h-1 w-1 bg-emerald-400 rounded-full animate-ping" />
                              )}
                              {enrollProgress > 60 && (
                                <span className="absolute bottom-6 right-6 h-1 w-1 bg-emerald-400 rounded-full animate-ping" />
                              )}
                            </div>
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
                          Mapping facial coordinate matrix structures...
                        </p>
                        <p className="text-[10px] text-slate-500 max-w-xs font-mono">
                          Position your face into the viewfinder. Confirming depth vertex maps.
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
