import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Hologram from './Hologram';
import { 
  Mic, MicOff, Send, Activity, ShieldAlert, Wind, HardDrive,
  Home, Map as MapIcon, Target, FileText, BarChart2, Settings,
  Hexagon, Terminal, Droplets, Brain, Radio
} from 'lucide-react';

const API = 'http://127.0.0.1:8000';
const WAKE_WORDS = ['jarvis', 'jarvis,', 'ativado', 'ei jarvis', 'hey jarvis'];

function App() {
  const [time, setTime] = useState(new Date());
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);      // Ouvindo comando
  const [isWakeMode, setIsWakeMode] = useState(false);         // Aguardando wake word
  const [wakeDetected, setWakeDetected] = useState(false);    // Flash ao detectar "Jarvis"
  const [input, setInput] = useState('');
  const [chatLog, setChatLog] = useState([
    { role: 'jarvis', msg: 'SISTEMAS ONLINE. AGENTES ACTIVOS. Diga "JARVIS" para me activar por voz.', mode: 'system', tools: [] }
  ]);
  const [weather, setWeather] = useState(null);
  const [memoryCount, setMemoryCount] = useState(0);
  const [activeMode, setActiveMode] = useState('STANDBY');
  const chatEndRef = useRef(null);
  const wakeRecognitionRef = useRef(null);
  const commandRecognitionRef = useRef(null);

  // Relógio + iniciar wake word listener
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    window.speechSynthesis.getVoices();
    // Iniciar listener de wake word automaticamente
    startWakeWordListener();
    return () => {
      clearInterval(timer);
      stopWakeWordListener();
    };
  }, []);

  // Buscar dados reais ao iniciar
  useEffect(() => {
    const getPosAndFetch = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
          () => fetchWeather()
        );
      } else {
        fetchWeather();
      }
    };

    getPosAndFetch();
    fetchMemoryStats();
    // Atualiza clima a cada 15 minutos
    const weatherTimer = setInterval(getPosAndFetch, 15 * 60 * 1000);
    return () => clearInterval(weatherTimer);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog, isThinking]);

  const fetchWeather = async (lat = null, lon = null) => {
    try {
      const url = lat && lon ? `${API}/api/weather?lat=${lat}&lon=${lon}` : `${API}/api/weather`;
      const res = await fetch(url);
      const data = await res.json();
      setWeather({ ...data, lat, lon });
    } catch (e) { /* silencioso */ }
  };

  const fetchMemoryStats = async () => {
    try {
      const res = await fetch(`${API}/api/memory`);
      const data = await res.json();
      setMemoryCount(data.total_memories || 0);
    } catch (e) { /* silencioso */ }
  };

  const speak = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 0.5;
    utterance.rate = 1.15;
    utterance.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang === 'pt-BR' && v.name.includes('Google')) || voices.find(v => v.lang.includes('pt-BR'));
    if (ptVoice) utterance.voice = ptVoice;
    // Pausar wake word listener durante a fala para evitar eco
    utterance.onstart = () => stopWakeWordListener();
    utterance.onend = () => setTimeout(startWakeWordListener, 800);
    window.speechSynthesis.speak(utterance);
  };

  // === WAKE WORD LISTENER (Escuta contínua em background) ===
  const startWakeWordListener = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;
    wakeRecognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      const detected = WAKE_WORDS.some(w => transcript.includes(w));
      if (detected) {
        // Wake word detectada!
        setWakeDetected(true);
        setTimeout(() => setWakeDetected(false), 2000);
        speak("Sim, Mestre. Pode falar.");
        setTimeout(() => startCommandListening(), 1500);
      }
    };

    recognition.onend = () => {
      // Reiniciar automaticamente para escuta contínua
      if (wakeRecognitionRef.current === recognition) {
        try { recognition.start(); } catch(e) {}
      }
    };

    recognition.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') {
        try { recognition.start(); } catch(err) {}
      }
    };

    setIsWakeMode(true);
    try { recognition.start(); } catch(e) {}
  }, []);

  const stopWakeWordListener = () => {
    setIsWakeMode(false);
    if (wakeRecognitionRef.current) {
      const r = wakeRecognitionRef.current;
      wakeRecognitionRef.current = null;
      try { r.stop(); } catch(e) {}
    }
  };

  // === COMMAND LISTENER (Activa após wake word) ===
  const startCommandListening = () => {
    stopWakeWordListener();
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    commandRecognitionRef.current = recognition;
    setIsListening(true);
    setInput('Aguardando comando...');
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      handleCommand(transcript);
    };
    recognition.onend = () => {
      setIsListening(false);
      setInput('');
      // Volta ao modo de escuta de wake word
      setTimeout(startWakeWordListener, 1000);
    };
    recognition.start();
  };

  // === BOTÃO DO MICROFONE (manual) ===
  const startListening = () => {
    if (isListening) return;
    stopWakeWordListener();
    startCommandListening();
  };

  const handleCommand = async (overrideInput = null) => {
    const cmd = typeof overrideInput === 'string' ? overrideInput : input;
    if (!cmd.trim() || isThinking || cmd === 'Capturando diretriz...') return;
    setInput('');
    setChatLog(prev => [...prev, { role: 'user', msg: cmd }]);
    setIsThinking(true);
    try {
      let coords = { lat: null, lon: null };
      if (weather && weather.city !== 'Maputo') {
        // Se já temos clima carregado, usamos essas coordenadas (vêm da geolocalização inicial)
        // No entanto, para ser mais preciso, pegamos na hora
      }
      
      const response = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: cmd,
          lat: weather?.lat || null,
          lon: weather?.lon || null
        })
      });
      const data = await response.json();
      setActiveMode(data.mode === 'agent' ? 'AGENTE' : 'CHAT');
      setChatLog(prev => [...prev, {
        role: 'jarvis',
        msg: data.reply,
        mode: data.mode,
        tools: data.tools_used || []
      }]);
      speak(data.reply);
      setMemoryCount(prev => prev + 1);
    } catch (e) {
      const err = 'FALHA CRÍTICA: UPLINK NEURAL OFFLINE.';
      setChatLog(prev => [...prev, { role: 'jarvis', msg: err, mode: 'error', tools: [] }]);
      speak(err);
    } finally {
      setIsThinking(false);
      setTimeout(() => setActiveMode('STANDBY'), 3000);
    }
  };

  const formatTime = (d) => d.toLocaleTimeString('pt-BR', { hour12: false });
  const formatDate = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  const PanelTitle = ({ title }) => (
    <h2 className="text-[10px] font-bold tracking-[0.2em] text-cyan-500/80 mb-4 uppercase flex items-center gap-2">
      <div className="w-1 h-3 bg-cyan-500 flex-shrink-0"></div>
      {title}
    </h2>
  );

  const BarStat = ({ label, val }) => (
    <div>
      <div className="flex justify-between text-[9px] font-bold tracking-widest mb-2 text-cyan-600">
        <span>{label}</span>
        <span className="text-cyan-200">{val}%</span>
      </div>
      <div className="h-1.5 bg-cyan-950/50 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${val}%` }} transition={{ duration: 1.2 }}
          className="h-full bg-cyan-400 shadow-[0_0_10px_#00f3ff]"
        />
      </div>
    </div>
  );

  return (
    <div className="w-full h-screen bg-[#010308] text-cyan-400 font-mono flex flex-col relative overflow-hidden select-none">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none"></div>
      <div className="scanline"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-900/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* HEADER */}
      <header className="absolute top-0 w-full px-4 lg:px-8 py-4 lg:py-5 flex justify-between items-start z-20 pointer-events-none">
        <div>
          <h1 className="text-4xl font-bold tracking-[0.2em] text-white drop-shadow-[0_0_15px_rgba(0,243,255,0.8)]">JARVIS</h1>
          <div className="flex gap-4 text-xs tracking-widest text-cyan-500 mt-1 font-bold">
            <span>UNIVERSAL AI OS</span>
            <span className="text-cyan-700">v3.0.0</span>
            <span className={`${memoryCount > 0 ? 'text-green-400' : 'text-cyan-700'}`}>
              MEM: {memoryCount} REGISTOS
            </span>
          </div>
        </div>
        <div className="flex items-start gap-8">
          <div className="text-right">
            <div className="text-3xl font-light tracking-[0.1em] text-cyan-100">{formatTime(time)}</div>
            <div className="text-xs tracking-widest text-cyan-600 mt-1 font-bold">{formatDate(time)}</div>
          </div>
          {/* Controlos da janela Electron (só aparecem no desktop) */}
          {window.electronAPI && (
            <div className="flex gap-2 mt-1 pointer-events-auto" style={{ WebkitAppRegion: 'no-drag' }}>
              <button onClick={() => window.electronAPI.minimizeWindow()}
                className="w-4 h-4 rounded-full bg-yellow-400/80 hover:bg-yellow-300 transition-colors shadow-[0_0_6px_rgba(255,200,0,0.5)]" 
                title="Minimizar" />
              <button onClick={() => window.electronAPI.maximizeWindow()}
                className="w-4 h-4 rounded-full bg-green-400/80 hover:bg-green-300 transition-colors shadow-[0_0_6px_rgba(0,255,0,0.5)]"
                title="Maximizar" />
              <button onClick={() => window.electronAPI.closeWindow()}
                className="w-4 h-4 rounded-full bg-red-500/80 hover:bg-red-400 transition-colors shadow-[0_0_6px_rgba(255,0,0,0.5)]"
                title="Fechar" />
            </div>
          )}
        </div>
      </header>

      {/* MAIN GRID */}
      <main className="flex-1 w-full h-full px-4 lg:px-8 pt-24 lg:pt-28 pb-40 lg:pb-32 grid grid-cols-1 lg:grid-cols-12 gap-6 z-10 relative overflow-y-auto lg:overflow-hidden custom-scrollbar">
        
        {/* LEFT COLUMN (Status, Voz, Memória) */}
        <div className="order-2 lg:order-1 col-span-1 lg:col-span-3 flex flex-col gap-5">

          {/* Status */}
          <div className="panel p-5 flex-1 min-h-[160px]">
            <PanelTitle title="Status do Sistema" />
            <div className="flex flex-col items-center justify-center py-4 relative">
              <svg className="w-20 h-20 lg:w-24 lg:h-24 transform -rotate-90 drop-shadow-[0_0_10px_rgba(0,243,255,0.4)]">
                <circle cx="40" cy="40" r="35" className="lg:cx-[48] lg:cy-[48] lg:r-[40]" stroke="rgba(0,243,255,0.1)" strokeWidth="5" fill="none" />
                <motion.circle cx="48" cy="48" r="40" stroke="#00f3ff" strokeWidth="3" fill="none"
                  strokeDasharray="251" animate={{ strokeDashoffset: isThinking ? 30 : 0 }} transition={{ duration: 0.5 }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] lg:text-xs font-bold text-white tracking-[0.2em]">ATIVO</span>
                <span className="text-[8px] lg:text-[10px] text-cyan-500 font-bold mt-1">100%</span>
              </div>
            </div>
          </div>

          {/* Voz */}
          <div className="panel p-5 flex-1 min-h-[140px]">
            <PanelTitle title="Canal Neural" />
            <div className="h-10 lg:h-14 flex items-center justify-center gap-[2px] lg:gap-[3px] mt-2">
              {[...Array(16)].map((_, i) => (
                <motion.div key={i}
                  animate={{ height: isThinking || isListening ? [8, Math.random()*30+8, 8] : 8 }}
                  transition={{ repeat: Infinity, duration: 0.25 + Math.random()*0.3 }}
                  className={`w-0.5 lg:w-1 rounded-full ${isThinking||isListening ? 'bg-cyan-300 shadow-[0_0_8px_#00f3ff]' : 'bg-cyan-900'}`}
                />
              ))}
            </div>
            <div className={`text-center text-[8px] lg:text-[9px] mt-3 tracking-widest font-bold ${isListening ? 'text-white animate-pulse' : 'text-green-400'}`}>
              {isListening ? '● CAPTURANDO ÁUDIO...' : isThinking ? '● PROCESSANDO...' : '● SINAL ESTÁVEL'}
            </div>
          </div>

          {/* Memória */}
          <div className="panel p-5 flex-1 min-h-[160px]">
            <PanelTitle title="Memória Persistente" />
            <div className="flex flex-col items-center justify-center gap-3 lg:gap-4 mt-3">
              <div className="relative w-16 h-16 lg:w-20 lg:h-20 flex items-center justify-center">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border border-dashed border-cyan-700/50" />
                <Brain className="w-6 h-6 lg:w-8 lg:h-8 text-cyan-400 drop-shadow-[0_0_10px_#00f3ff]" />
              </div>
              <div className="text-center">
                <div className="text-xl lg:text-2xl font-bold text-white">{memoryCount}</div>
                <div className="text-[8px] lg:text-[9px] text-cyan-600 tracking-widest mt-1 uppercase font-bold">MEMÓRIAS</div>
              </div>
            </div>
          </div>

          {/* Hardware */}
          <div className="panel p-5 flex-[1.2] lg:flex-[1.5]">
            <PanelTitle title="Hardware" />
            <div className="space-y-3 lg:space-y-4 mt-3">
              <BarStat label="CPU" val={isThinking ? 89 : 32} />
              <BarStat label="MEMÓRIA" val={72} />
              <BarStat label="GPU" val={isThinking ? 95 : 41} />
            </div>
          </div>

        </div>

        {/* CENTER (HOLOGRAM) */}
        <div className="order-1 lg:order-2 col-span-1 lg:col-span-6 relative flex flex-col items-center justify-center h-[450px] lg:h-full pointer-events-none">
          {/* Projector base */}
          <div className="absolute bottom-[4%] w-72 h-16 rounded-[100%] border-2 border-cyan-500/30 shadow-[0_0_60px_rgba(0,243,255,0.25)] flex items-center justify-center">
            <div className="w-52 h-10 rounded-[100%] border border-cyan-400/40 flex items-center justify-center relative">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
                className="absolute inset-0 rounded-[100%] border-2 border-dashed border-cyan-300/30" />
              <div className="w-20 h-3 bg-cyan-200 rounded-[100%] blur-[12px]"></div>
            </div>
          </div>

          {/* Robot 3D Hologram */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-40">
            <Hologram isThinking={isThinking} isListening={isListening} />
          </div>

          {/* Chat overlay */}
          <div className="absolute top-6 w-full px-4 lg:px-14 pointer-events-auto z-20">
            <div className="bg-black/50 backdrop-blur-md border-l-2 border-cyan-500 p-4 rounded-r-xl flex flex-col gap-2.5 max-h-[190px] overflow-y-auto custom-scrollbar">
              {chatLog.map((chat, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className={`text-xs tracking-wide leading-relaxed ${chat.role === 'user' ? 'text-cyan-300/60' : 'text-cyan-50 font-semibold drop-shadow-[0_0_5px_rgba(0,243,255,0.6)]'}`}>
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="opacity-40 font-bold">{chat.role === 'user' ? 'CMD:' : 'SYS:'}</span>
                    {chat.mode === 'agent' && (
                      <span className="text-[8px] px-1.5 py-0.5 bg-purple-900/60 border border-purple-500/50 text-purple-300 rounded font-bold tracking-widest">AGENTE</span>
                    )}
                    {chat.tools && chat.tools.map(t => (
                      <span key={t} className="text-[8px] px-1.5 py-0.5 bg-cyan-900/50 border border-cyan-700/50 text-cyan-400 rounded tracking-widest">{t}</span>
                    ))}
                  </div>
                  {chat.msg}
                </motion.div>
              ))}
              {isThinking && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-xs text-cyan-400 font-bold animate-pulse flex items-center gap-2">
                  <span className="opacity-40 mr-3">SYS:</span>
                  <Activity className="w-3 h-3" /> PROCESSANDO VECTORES NEURAIS...
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (Monitoramento, Clima, Agentes) */}
        <div className="order-3 lg:order-3 col-span-1 lg:col-span-3 flex flex-col gap-5 z-20">

          {/* Mapa Global */}
          <div className="panel p-5 flex-1 relative overflow-hidden">
            <PanelTitle title="Monitoramento Global" />
            <div className="absolute inset-0 top-12 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg')] bg-no-repeat bg-center bg-contain filter invert sepia hue-rotate-[180deg] saturate-[4] brightness-150 pointer-events-none"></div>
            <div className="absolute top-[45%] left-[55%] w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_15px_#00f3ff] animate-pulse"></div>
            <div className="absolute top-[30%] left-[25%] w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></div>
            <div className="absolute top-[60%] left-[75%] w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_10px_#4ade80]"></div>
          </div>

          {/* Clima Real */}
          <div className="panel p-5 flex-1 min-h-[160px]">
            <PanelTitle title="Estação Meteorológica" />
            {weather ? (
              <div className="mt-2 space-y-3 lg:space-y-4">
                <div className="text-center">
                  <div className="text-2xl lg:text-3xl font-bold text-white">{weather.temperature}°C</div>
                  <div className="text-[9px] lg:text-[10px] text-cyan-500 tracking-widest mt-1 font-bold">{weather.condition?.toUpperCase() || 'N/A'}</div>
                  <div className="text-[8px] lg:text-[9px] text-cyan-700 tracking-widest uppercase">{weather.city}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 lg:gap-3 border-t border-cyan-900/50 pt-3">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-3 h-3 text-cyan-500 flex-shrink-0" />
                    <div>
                      <div className="text-[8px] text-cyan-700 tracking-widest uppercase">HUM</div>
                      <div className="text-xs font-bold text-white">{weather.humidity}%</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wind className="w-3 h-3 text-cyan-500 flex-shrink-0" />
                    <div>
                      <div className="text-[8px] text-cyan-700 tracking-widest uppercase">VENTO</div>
                      <div className="text-xs font-bold text-white">{weather.wind_speed}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-cyan-800 text-[10px] mt-4 animate-pulse tracking-widest uppercase">
                BUSCANDO SATÉLITE...
              </div>
            )}
          </div>

          {/* Alertas */}
          <div className="panel p-5 flex-[1.5]">
            <PanelTitle title="Eventos Críticos" />
            <div className="space-y-2 lg:space-y-3 mt-2">
              {[
                { title: 'TENTATIVA DE INVASÃO', desc: 'SISTEMA DE SEGURANÇA', icon: ShieldAlert, color: 'text-red-500', border: 'border-red-500/40' },
                { title: 'ANOMALIA CLIMÁTICA', desc: 'SATÉLITE GEE', icon: Wind, color: 'text-orange-400', border: 'border-orange-400/40' }
              ].map((alert, i) => (
                <div key={i} className={`flex items-center justify-between p-2 lg:p-3 rounded-lg border bg-black/40 ${alert.border} cursor-pointer hover:bg-white/5 transition-colors group`}>
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className={`p-1.5 lg:p-2 rounded-md border ${alert.border} bg-white/5 group-hover:scale-110 transition-transform`}>
                      <alert.icon className={`w-3.5 h-3.5 lg:w-4 h-4 ${alert.color}`} />
                    </div>
                    <div>
                      <div className="text-[9px] lg:text-[10px] font-bold text-white tracking-wider">{alert.title}</div>
                      <div className={`text-[7px] lg:text-[8px] tracking-widest mt-0.5 ${alert.color} opacity-80`}>{alert.desc}</div>
                    </div>
                  </div>
                  <span className="text-cyan-700 text-xs">&gt;</span>
                </div>
              ))}
            </div>
          </div>

          {/* Agentes */}
          <div className="panel p-5 flex-1 min-h-[140px]">
            <PanelTitle title="Agentes Activos" />
            <div className="space-y-2 lg:space-y-3 mt-2">
              {['CYBERSECURITY', 'DEV AUTOPILOT', 'DATA ANALYST', 'RESEARCH'].map((agent, idx) => (
                <div key={agent} className="flex justify-between items-center text-[8px] lg:text-[9px] font-bold tracking-widest border-b border-cyan-900/50 pb-2">
                  <span className="flex items-center gap-2 lg:gap-3 text-cyan-100">
                    <span className={`w-1 lg:w-1.5 h-1 lg:h-1.5 rounded-full flex-shrink-0 ${idx === 0 ? 'bg-red-500 shadow-[0_0_8px_red] animate-pulse' : 'bg-cyan-400 shadow-[0_0_8px_#00f3ff]'}`}></span>
                    {agent}
                  </span>
                  <span className={idx === 0 ? 'text-red-400' : 'text-cyan-500'}>{idx === 0 ? 'ALERTA' : 'ATIVO'}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="fixed lg:absolute bottom-0 w-full px-4 lg:px-8 pb-4 lg:pb-6 flex flex-col items-center gap-8 lg:gap-10 z-30 pointer-events-none bg-gradient-to-t from-black/80 to-transparent lg:from-transparent">
        {/* Wake Word Status */}
        <div className="h-6 flex items-center justify-center pointer-events-none">
          <AnimatePresence>
            {wakeDetected && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="text-xs lg:text-sm font-bold tracking-widest text-white drop-shadow-[0_0_15px_rgba(0,243,255,1)]">
                ⚡ PALAVRA-CHAVE DETECTADA — PODE FALAR
              </motion.div>
            )}
            {isWakeMode && !isListening && !wakeDetected && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-[8px] lg:text-[9px] text-cyan-700 tracking-widest font-bold">
                <Radio className="w-3 h-3 animate-pulse text-cyan-600" />
                AGUARDANDO PALAVRA DE ACTIVAÇÃO: <span className="text-cyan-500 ml-1">"JARVIS"</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Input */}
        <div className="w-full max-w-[800px] relative pointer-events-auto group px-2 lg:px-0">
          <div className="absolute inset-0 bg-cyan-900/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className={`relative flex items-center bg-black/90 border ${isListening ? 'border-white shadow-[0_0_30px_rgba(255,255,255,0.2)]' : 'border-cyan-500/40 shadow-[0_0_20px_rgba(0,243,255,0.1)]'} rounded-full overflow-hidden backdrop-blur-2xl transition-all duration-300`}>
            <div className="pl-4 lg:pl-5 pr-2 lg:pr-3 text-cyan-700 flex-shrink-0"><Terminal className="w-3.5 h-3.5 lg:w-4 h-4" /></div>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCommand()}
              placeholder="INSERIR DIRETRIZ..."
              className="w-full bg-transparent py-3.5 lg:py-4 text-cyan-100 placeholder-cyan-800 text-[11px] lg:text-sm font-bold tracking-[0.1em] lg:tracking-widest focus:outline-none"
              disabled={isThinking || isListening}
            />
            <div className="flex gap-1 pr-2 lg:pr-3">
              <button onClick={startListening}
                title={isWakeMode ? 'Escuta wake word activa' : 'Clicar para comandar'}
                className={`p-2 lg:p-2.5 rounded-full transition-all ${
                  isListening ? 'text-white bg-red-500/40 shadow-[0_0_12px_red] animate-pulse' 
                  : isWakeMode ? 'text-cyan-400 bg-cyan-900/30 shadow-[0_0_8px_rgba(0,243,255,0.4)] animate-pulse' 
                  : 'text-cyan-700 hover:text-cyan-300 hover:bg-cyan-900/30'
                }`}>
                {isWakeMode && !isListening ? <Radio className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button onClick={handleCommand} disabled={isThinking || isListening}
                className="p-2 lg:p-2.5 text-cyan-600 hover:text-white hover:bg-cyan-500/20 rounded-full transition-all disabled:opacity-30">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Nav Dock */}
        <div className="flex gap-2 lg:gap-5 items-center pointer-events-auto overflow-x-auto max-w-full no-scrollbar px-4">
          {[
            { icon: Home, label: 'INÍCIO' },
            { icon: MapIcon, label: 'SATÉLITE' },
            { icon: Target, label: 'OPERAÇÕES' },
            { icon: Hexagon, label: 'NÚCLEO', special: true },
            { icon: FileText, label: 'PROTOCOLOS' },
            { icon: BarChart2, label: 'ANALYTICS' },
            { icon: Settings, label: 'SISTEMA' },
          ].map((item, i) => (
            <button key={i} className={`flex flex-col items-center gap-1 lg:gap-2 group transition-all duration-300 hover:-translate-y-1 lg:hover:-translate-y-2 ${item.special ? 'scale-105 lg:scale-110 mx-2 lg:mx-4' : ''}`}>
              <div className={`p-2.5 lg:p-3.5 rounded-lg lg:rounded-xl border ${item.special ? 'bg-cyan-900/60 border-cyan-300 shadow-[0_0_25px_rgba(0,243,255,0.5)]' : 'bg-black/60 border-cyan-900 hover:border-cyan-500 hover:bg-cyan-900/30 hover:shadow-[0_0_15px_rgba(0,243,255,0.2)]'} backdrop-blur-md transition-all`}>
                <item.icon className={`w-3.5 h-3.5 lg:w-4 h-4 ${item.special ? 'text-white' : 'text-cyan-700 group-hover:text-cyan-300'}`} />
              </div>
              <span className={`text-[7px] lg:text-[8px] font-bold tracking-[0.2em] ${item.special ? 'text-cyan-300' : 'text-cyan-800 group-hover:text-cyan-500'}`}>{item.label}</span>
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}

export default App;
