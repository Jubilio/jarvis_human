import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, Send, Activity, Cpu, Globe2, AlertTriangle, 
  Wind, Droplets, CloudLightning, ShieldAlert, 
  Home, Map as MapIcon, Target, FileText, BarChart2, Settings,
  Radio, HardDrive, Wifi, Zap, Hexagon, Terminal, Volume2
} from 'lucide-react';

function App() {
  const [time, setTime] = useState(new Date());
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [input, setInput] = useState('');
  const [chatLog, setChatLog] = useState([
    { role: 'jarvis', msg: 'SISTEMAS ONLINE. UPLINK NEURAL ESTABELECIDO.' }
  ]);
  const chatEndRef = useRef(null);
  
  // Relógio
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    // Para carregar as vozes nativas corretamente no Windows/Mac
    window.speechSynthesis.getVoices(); 
    return () => clearInterval(timer);
  }, []);

  // Scroll automático
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog, isThinking]);

  // Função para fazer o Jarvis falar (Text-to-Speech)
  const speak = (text) => {
    // Interrompe qualquer fala atual
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configurando para parecer uma voz robótica/séria
    utterance.pitch = 0.5; // Mais grave
    utterance.rate = 1.15; // Um pouco mais acelerado
    utterance.volume = 1;
    
    // Tenta encontrar uma voz em Português
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang === 'pt-BR' && v.name.includes('Google')) || voices.find(v => v.lang.includes('pt-BR'));
    if(ptVoice) utterance.voice = ptVoice;
    
    window.speechSynthesis.speak(utterance);
  };

  // Função para ouvir o usuário (Speech-to-Text)
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta a API de voz. Tente usar o Google Chrome ou Edge.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    
    setIsListening(true);
    setInput('Ouvindo a diretriz do Mestre...');
    
    // Quando ele parar de ouvir
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      // Podemos enviar o comando automaticamente após falar
      handleCommand(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (input === 'Ouvindo a diretriz do Mestre...') setInput('');
    };

    recognition.start();
  };

  // Enviar comando para o backend
  const handleCommand = async (overrideInput = null) => {
    const cmd = typeof overrideInput === 'string' ? overrideInput : input;
    if (!cmd.trim() || isThinking || cmd === 'Ouvindo a diretriz do Mestre...') return;
    
    setInput('');
    setChatLog(prev => [...prev, { role: 'user', msg: cmd }]);
    setIsThinking(true);
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: cmd })
      });
      const data = await response.json();
      
      setChatLog(prev => [...prev, { role: 'jarvis', msg: data.reply }]);
      
      // Executa a fala
      speak(data.reply);
      
    } catch (e) {
      setChatLog(prev => [...prev, { role: 'jarvis', msg: 'CRITICAL ERROR: UPLINK FAILURE.' }]);
      speak("Atenção, falha crítica na conexão neural com os servidores.");
    } finally {
      setIsThinking(false);
    }
  };

  const formatTime = (date) => date.toLocaleTimeString('pt-BR', { hour12: false });
  const formatDate = (date) => date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  const renderPanelTitle = (title) => (
    <h2 className="text-[10px] font-bold tracking-[0.2em] text-cyan-500/80 mb-4 uppercase flex items-center gap-2">
      <div className="w-1 h-3 bg-cyan-500"></div>
      {title}
    </h2>
  );

  return (
    <div className="w-full h-screen bg-[#010308] text-cyan-400 font-mono flex flex-col relative overflow-hidden select-none">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none"></div>
      <div className="scanline"></div>
      
      {/* Central Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-900/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* HEADER */}
      <header className="absolute top-0 w-full px-8 py-6 flex justify-between items-start z-20 pointer-events-none">
        <div>
          <h1 className="text-4xl font-bold tracking-[0.2em] text-white drop-shadow-[0_0_15px_rgba(0,243,255,0.8)]">JARVIS</h1>
          <div className="flex gap-4 text-xs tracking-widest text-cyan-500 mt-1 font-bold">
            <span>UNIVERSAL AI OS</span>
            <span className="text-cyan-700">v3.0.0</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-light tracking-[0.1em] text-cyan-100">{formatTime(time)}</div>
          <div className="text-xs tracking-widest text-cyan-600 mt-1 font-bold">{formatDate(time)}</div>
        </div>
      </header>

      {/* MAIN CONTENT GRID */}
      <main className="flex-1 w-full h-full px-8 pt-28 pb-32 grid grid-cols-12 gap-8 z-10 relative">
        
        {/* LEFT COLUMN */}
        <div className="col-span-3 flex flex-col gap-6">
          
          <div className="panel p-5 flex-1">
            {renderPanelTitle("Status do Sistema")}
            <div className="flex flex-col items-center justify-center h-32 relative mt-2">
              <svg className="w-28 h-28 transform -rotate-90 drop-shadow-[0_0_10px_rgba(0,243,255,0.4)]">
                <circle cx="56" cy="56" r="46" stroke="rgba(0,243,255,0.1)" strokeWidth="6" fill="none" />
                <circle cx="56" cy="56" r="46" stroke="#00f3ff" strokeWidth="4" fill="none" strokeDasharray="289" strokeDashoffset={isThinking ? "50" : "0"} className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-bold text-white tracking-[0.2em]">ATIVO</span>
                <span className="text-[10px] text-cyan-500 font-bold mt-1">100%</span>
              </div>
            </div>
          </div>

          <div className="panel p-5 flex-1">
            {renderPanelTitle("Comunicação Neural")}
            <div className="h-16 flex items-center justify-center gap-[3px] mt-4">
              {[...Array(24)].map((_, i) => (
                <motion.div 
                  key={i}
                  animate={{ height: isThinking || isListening ? [10, Math.random() * 40 + 10, 10] : 12 }}
                  transition={{ repeat: Infinity, duration: 0.3 + Math.random() }}
                  className={`w-1 rounded-full ${isThinking || isListening ? 'bg-cyan-300 shadow-[0_0_8px_#00f3ff]' : 'bg-cyan-800'}`}
                />
              ))}
            </div>
            <div className={`text-center text-[10px] mt-4 tracking-widest font-bold drop-shadow-[0_0_5px_rgba(0,243,255,0.8)] ${isListening ? 'text-white' : 'text-green-400'}`}>
              {isListening ? 'CAPTURANDO ÁUDIO...' : isThinking ? 'PROCESSANDO SINAL...' : 'SINAL ESTÁVEL'}
            </div>
          </div>

          <div className="panel p-5 flex-[1.5]">
            {renderPanelTitle("Recursos de Hardware")}
            <div className="space-y-5 mt-6">
              {[
                { label: 'PROCESSAMENTO CORE', val: isThinking ? 89 : 32 },
                { label: 'MEMÓRIA QUÂNTICA', val: 72 },
                { label: 'RENDERIZAÇÃO GPU', val: isThinking ? 95 : 41 },
                { label: 'BANDA DE REDE', val: 99 }
              ].map(stat => (
                <div key={stat.label}>
                  <div className="flex justify-between text-[9px] font-bold tracking-widest mb-2 text-cyan-600">
                    <span>{stat.label}</span>
                    <span className="text-cyan-200">{stat.val}%</span>
                  </div>
                  <div className="h-1.5 bg-cyan-950/50 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.val}%` }}
                      transition={{ duration: 1 }}
                      className="h-full bg-cyan-400 shadow-[0_0_10px_#00f3ff]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* CENTER COLUMN (HOLOGRAM) */}
        <div className="col-span-6 relative flex flex-col items-center justify-center pointer-events-none">
          {/* Hologram Projector Base */}
          <div className="absolute bottom-[5%] w-80 h-20 rounded-[100%] border-2 border-cyan-500/30 shadow-[0_0_60px_rgba(0,243,255,0.3)] flex items-center justify-center">
            <div className="w-64 h-12 rounded-[100%] border border-cyan-400/50 shadow-[inset_0_0_30px_rgba(0,243,255,0.6)] flex items-center justify-center relative">
              <motion.div 
                 animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
                 className="absolute inset-0 rounded-[100%] border-2 border-dashed border-cyan-300/40"
              />
              <div className="w-24 h-4 bg-cyan-200 rounded-[100%] blur-[15px] shadow-[0_0_50px_#00f3ff]"></div>
            </div>
          </div>
          
          {/* Hologram Image Container */}
          <div className="absolute bottom-[10%] h-[85%] flex items-end justify-center pointer-events-auto z-10">
            <img 
              src="/hologram.png" 
              alt="Hologram AI" 
              className={`hologram-image max-h-full object-contain transition-all duration-700 ${isThinking || isListening ? 'brightness-[1.5] filter drop-shadow-[0_0_40px_rgba(0,243,255,1)] scale-[1.02]' : ''}`}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = `
                  <div class="text-cyan-500/80 text-center border border-cyan-500/40 p-6 rounded-2xl backdrop-blur-md bg-black/40 flex flex-col items-center gap-4">
                    <div class="w-16 h-16 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin"></div>
                    <div>
                      SALVE A IMAGEM FORNECIDA COMO<br/> 
                      <strong class="text-white text-lg tracking-widest">public/hologram.png</strong><br/>
                      PARA ATIVAR A PROJEÇÃO VISUAL.
                    </div>
                  </div>
                `;
              }}
            />
          </div>

          {/* AI Thoughts / Chat Overlay */}
          <div className="absolute top-10 w-full px-16 pointer-events-auto z-20">
             <div className="bg-black/40 backdrop-blur-md border-l-2 border-cyan-500 p-4 rounded-r-xl flex flex-col gap-3 max-h-[180px] overflow-y-auto custom-scrollbar shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                {chatLog.map((chat, idx) => (
                  <div key={idx} className={`text-xs tracking-wide leading-relaxed ${chat.role === 'user' ? 'text-cyan-200/70' : 'text-cyan-100 font-semibold drop-shadow-[0_0_5px_rgba(0,243,255,0.8)]'}`}>
                    <span className="opacity-50 mr-3 font-bold">{chat.role === 'user' ? 'CMD:' : 'SYS:'}</span>
                    {chat.msg}
                  </div>
                ))}
                {isThinking && (
                  <div className="text-xs text-cyan-400 font-bold animate-pulse flex items-center gap-2">
                     <span className="opacity-50 mr-3">SYS:</span> 
                     <Activity className="w-3 h-3" /> CALCULANDO VETORES DE RESPOSTA...
                  </div>
                )}
                <div ref={chatEndRef} />
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="col-span-3 flex flex-col gap-6 z-20">
          
          <div className="panel p-5 flex-1 relative overflow-hidden">
            {renderPanelTitle("Monitoramento Global")}
            <div className="absolute inset-0 top-12 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg')] bg-no-repeat bg-center bg-contain filter invert sepia hue-rotate-[180deg] saturate-[4] brightness-150"></div>
            <div className="absolute top-[45%] left-[55%] w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_15px_#00f3ff] animate-pulse"></div>
            <div className="absolute top-[30%] left-[25%] w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_15px_red] animate-ping"></div>
            <div className="absolute top-[60%] left-[75%] w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_10px_#4ade80]"></div>
          </div>

          <div className="panel p-5 flex-[1.5]">
            {renderPanelTitle("Eventos Críticos")}
            <div className="space-y-3 mt-4">
              {[
                { title: 'TENTATIVA DE INVASÃO', desc: 'SISTEMA DE SEGURANÇA', icon: ShieldAlert, color: 'text-red-500', border: 'border-red-500/40' },
                { title: 'ANOMALIA CLIMÁTICA', desc: 'SATÉLITE GEE', icon: Wind, color: 'text-orange-400', border: 'border-orange-400/40' },
                { title: 'SINCRONIZAÇÃO DE DADOS', desc: 'NUVEM OPERACIONAL', icon: HardDrive, color: 'text-cyan-400', border: 'border-cyan-400/40' }
              ].map((alert, i) => (
                <div key={i} className={`flex items-center justify-between p-3 rounded-lg border bg-black/40 ${alert.border} cursor-pointer hover:bg-white/5 transition-colors group`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-md border ${alert.border} bg-white/5 group-hover:scale-110 transition-transform`}>
                      <alert.icon className={`w-4 h-4 ${alert.color}`} />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-white tracking-wider">{alert.title}</div>
                      <div className={`text-[8px] tracking-widest mt-1 ${alert.color} opacity-80`}>{alert.desc}</div>
                    </div>
                  </div>
                  <span className="text-cyan-700 font-bold">&gt;</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-5 flex-1">
            {renderPanelTitle("Agentes IA Autônomos")}
            <div className="space-y-3 mt-4">
              {[
                'CYBERSECURITY AGENT', 'DEV AUTOPILOT', 'DATA ANALYST', 'GIS OPERATOR', 'RESEARCH AGENT'
              ].map((agent, idx) => (
                <div key={agent} className="flex justify-between items-center text-[9px] font-bold tracking-widest border-b border-cyan-900/50 pb-2">
                  <span className="flex items-center gap-3 text-cyan-100">
                    <span className={`w-1.5 h-1.5 rounded-full ${idx === 0 ? 'bg-red-500 shadow-[0_0_8px_red] animate-pulse' : 'bg-cyan-400 shadow-[0_0_8px_#00f3ff]'}`}></span>
                    {agent}
                  </span>
                  <span className={idx === 0 ? 'text-red-400' : 'text-cyan-500'}>{idx === 0 ? 'ALERTA' : 'ATIVO'}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* BOTTOM DOCK & INPUT */}
      <footer className="absolute bottom-0 w-full px-8 pb-8 flex flex-col items-center justify-center gap-8 z-30 pointer-events-none">
        
        {/* Command Input Area */}
        <div className="w-[800px] relative pointer-events-auto group">
          <div className="absolute inset-0 bg-cyan-900/30 blur-xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
          <div className={`relative flex items-center bg-black/80 border ${isListening ? 'border-white shadow-[0_0_40px_rgba(255,255,255,0.3)]' : 'border-cyan-500/50 shadow-[0_0_30px_rgba(0,243,255,0.15)]'} rounded-full overflow-hidden backdrop-blur-xl transition-all duration-300`}>
            <div className="pl-6 pr-4 text-cyan-600">
               <Terminal className="w-5 h-5" />
            </div>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCommand()}
              placeholder="INSERIR DIRETRIZ OU CLIQUE NO MICROFONE..."
              className="w-full bg-transparent py-4 text-cyan-100 placeholder-cyan-700 text-sm font-bold tracking-widest focus:outline-none"
              disabled={isThinking || isListening}
            />
            <div className="flex gap-2 pr-4">
              <button 
                onClick={startListening}
                className={`p-3 rounded-full transition-all ${isListening ? 'text-white bg-red-500/50 shadow-[0_0_15px_red]' : 'text-cyan-600 hover:text-cyan-300 hover:bg-cyan-900/30'}`}
              >
                <Mic className="w-5 h-5" />
              </button>
              <button onClick={handleCommand} disabled={isThinking || isListening} className="p-3 text-cyan-500 hover:text-white hover:bg-cyan-500/20 rounded-full transition-all disabled:opacity-50">
                <Send className="w-5 h-5 ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Holographic Navigation Dock */}
        <div className="flex gap-6 items-center pointer-events-auto">
          {[
            { icon: Home, label: 'INÍCIO' },
            { icon: MapIcon, label: 'SATÉLITE' },
            { icon: Target, label: 'OPERAÇÕES' },
            { icon: Hexagon, label: 'NÚCLEO', special: true },
            { icon: FileText, label: 'PROTOCOLOS' },
            { icon: BarChart2, label: 'ANALYTICS' },
            { icon: Settings, label: 'SISTEMA' },
          ].map((item, i) => (
            <button key={i} className={`flex flex-col items-center gap-3 group transition-all duration-300 hover:-translate-y-2 ${item.special ? 'scale-125 mx-6' : ''}`}>
              <div className={`p-4 rounded-xl border ${item.special ? 'bg-cyan-900/60 border-cyan-300 shadow-[0_0_25px_rgba(0,243,255,0.6)]' : 'bg-black/60 border-cyan-800/80 hover:border-cyan-400 hover:bg-cyan-900/40 hover:shadow-[0_0_15px_rgba(0,243,255,0.3)]'} backdrop-blur-md transition-all`}>
                <item.icon className={`w-5 h-5 ${item.special ? 'text-white' : 'text-cyan-600 group-hover:text-cyan-300'}`} />
              </div>
              <span className={`text-[9px] font-bold tracking-[0.2em] ${item.special ? 'text-cyan-200 drop-shadow-[0_0_5px_#00f3ff]' : 'text-cyan-800 group-hover:text-cyan-400'}`}>{item.label}</span>
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}

export default App;
