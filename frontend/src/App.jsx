import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Send, Globe2, Activity, Cpu } from 'lucide-react';

function App() {
  const [messages, setMessages] = useState([
    { role: 'jarvis', text: 'Sistemas online. Bem-vindo de volta. O que vamos analisar hoje?' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', text: input }]);
    const currentInput = input;
    setInput('');

    try {
      const response = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput })
      });
      const data = await response.json();
      
      setMessages(prev => [...prev, { role: 'jarvis', text: data.reply }]);
      
      if (data.action === 'render_flood_map') {
        setMessages(prev => [...prev, { role: 'jarvis', text: '[AÇÃO] Iniciando renderização do mapa de inundações via GEE...' }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'jarvis', text: 'Erro de conexão com os servidores centrais.' }]);
    }
  };

  return (
    <div className="w-full h-screen bg-[#050505] text-cyan-500 font-mono flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#088 1px, transparent 1px), linear-gradient(90deg, #088 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      
      <div className="z-10 w-full max-w-4xl p-6 flex flex-col h-[90vh] bg-black/40 backdrop-blur-md border border-cyan-800 rounded-2xl shadow-[0_0_50px_rgba(0,255,255,0.1)]">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-6 pb-4 border-b border-cyan-800/50">
          <div className="flex items-center gap-3">
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
            >
              <Cpu className="w-8 h-8 text-cyan-400" />
            </motion.div>
            <h1 className="text-2xl font-bold tracking-widest text-white shadow-cyan-500/50 drop-shadow-lg">J.A.R.V.I.S</h1>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-xs text-cyan-300">
              <Activity className="w-4 h-4" /> SISTEMAS NOMINAIS
            </div>
            <div className="flex items-center gap-2 text-xs text-cyan-300">
              <Globe2 className="w-4 h-4" /> UPLINK GLOBAL
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto mb-6 pr-2 space-y-4">
          {messages.map((msg, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] p-4 rounded-xl ${msg.role === 'user' ? 'bg-cyan-900/40 border border-cyan-700/50 text-cyan-50' : 'bg-black/60 border border-cyan-900 text-cyan-300'}`}>
                {msg.text}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Input Area */}
        <div className="relative mt-auto">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Digite seu comando..." 
            className="w-full bg-black/50 border border-cyan-800 rounded-xl py-4 pl-6 pr-16 text-cyan-100 placeholder-cyan-800/50 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,255,255,0.3)] transition-all"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
            <button className="p-2 hover:bg-cyan-900/50 rounded-lg text-cyan-500 transition-colors">
              <Mic className="w-5 h-5" />
            </button>
            <button 
              onClick={handleSend}
              className="p-2 bg-cyan-900/30 hover:bg-cyan-800/50 rounded-lg text-cyan-400 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
