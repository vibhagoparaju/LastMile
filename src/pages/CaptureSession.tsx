import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
import { Mic, MicOff, Send, X, History, Sparkles, Save, Heart } from 'lucide-react';
import { addDoc, collection, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function CaptureSession({ user }: { user: any }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<{ role: 'user' | 'model', content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionStage, setSessionStage] = useState<'INTRO' | 'TALKING' | 'SUMMARY'>('INTRO');
  const [memoryCard, setMemoryCard] = useState<any>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) navigate('/');
    if (scrollRef.current) {
       scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, user, navigate]);

  const startSession = async () => {
    setSessionStage('TALKING');
    const introPrompt = "Hello Robert. Today I'd like to explore a piece of your history. Do you remember the first house you ever lived in? What did it smell like on a Sunday afternoon?";
    setMessages([{ role: 'model', content: introPrompt }]);
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setIsProcessing(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `You are the LastMile Memory Archaeologist. Your goal is to help Robert (the user) preserve his identity. 
          Be warm, patient, and empathetic. Ask open-ended questions. 
          Probe for sensory details (smells, sounds, feelings). 
          Follow tangents if they seem emotional. 
          If Robert seems confused, gently re-anchor him to a known fact from his PIM (Personal Identity Model).
          Current User: ${user.displayName}. 
          Current Session Context: Early memories and sensory heritage.`,
          temperature: 0.7,
        },
        contents: [
          ...messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
          { role: 'user', parts: [{ text: userMsg }] }
        ]
      });

      const aiText = response.text || "I'm listening carefully. Tell me more.";
      setMessages(prev => [...prev, { role: 'model', content: aiText }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'model', content: "I encountered a small hiccup in my memory bank. Could you repeat that last part?" }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const endSession = async () => {
    setIsProcessing(true);
    try {
      const transcript = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: "Create a 'Memory Card' from this transcript. A Memory Card is a one-page summary of a life moment. Include: 1. A poetic title. 2. A 3-sentence summary. 3. Three 'Identity Tags' (entities/values/years). Output in JSON format.",
          responseMimeType: "application/json"
        },
        contents: [{ role: 'user', parts: [{ text: transcript }] }]
      });

      const summary = JSON.parse(response.text || '{}');
      setMemoryCard(summary);
      
      // Save to Firebase
      const sessionRef = await addDoc(collection(db, 'users', user.uid, 'sessions'), {
        type: 'CAPTURE',
        startedAt: serverTimestamp(),
        summary: summary.summary,
        title: summary.title,
        status: 'COMPLETED'
      });

      await addDoc(collection(db, 'users', user.uid, 'memories'), {
        userId: user.uid,
        sessionId: sessionRef.id,
        text: transcript,
        tags: summary.tags,
        createdAt: serverTimestamp()
      });

      setSessionStage('SUMMARY');
    } catch (e) {
      navigate('/dashboard');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary text-white flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {sessionStage === 'INTRO' && (
          <motion.div 
            key="intro"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="text-center max-w-lg"
          >
            <div className="w-24 h-24 bg-primary rounded-full mx-auto mb-8 flex items-center justify-center shadow-[0_0_50px_rgba(90,90,64,0.3)]">
               <History size={40} className="text-secondary" />
            </div>
            <h1 className="text-4xl font-serif mb-4 italic text-primary">Ready to tell a story?</h1>
            <p className="text-muted mb-10 leading-relaxed">Today we're exploring your early origins. Don't worry about dates or facts—talk to me like a companion.</p>
            <button 
              onClick={startSession}
              className="px-12 py-4 bg-primary text-secondary rounded-2xl font-bold tracking-wide hover:scale-105 transition-all"
            >
              Enter the Session
            </button>
          </motion.div>
        )}

        {sessionStage === 'TALKING' && (
          <motion.div 
            key="talking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-4xl h-[90vh] flex flex-col glass overflow-hidden rounded-[48px] bg-card/50 border border-border-dim shadow-2xl"
          >
             <header className="p-8 border-b border-border-dim flex justify-between items-center bg-card">
                <div className="flex items-center gap-3">
                   <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                   <span className="text-sm font-bold uppercase tracking-widest text-muted">Capturing Essence</span>
                </div>
                <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-border-dim rounded-full"><X size={20}/></button>
             </header>

             <div ref={scrollRef} className="flex-1 overflow-y-auto p-12 space-y-8 custom-scrollbar">
                {messages.map((m, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                     <div className={`max-w-[80%] p-6 rounded-[28px] ${m.role === 'user' ? 'bg-primary text-secondary rounded-tr-none' : 'bg-card text-white rounded-tl-none border border-border-dim'}`}>
                        <p className={`font-serif leading-relaxed ${m.role === 'model' ? 'text-lg italic' : 'text-base'}`}>{m.content}</p>
                     </div>
                  </motion.div>
                ))}
                {isProcessing && (
                  <div className="flex justify-start">
                     <div className="flex gap-1 p-4">
                        <div className="w-1.5 h-1.5 bg-stone-500 rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-stone-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                        <div className="w-1.5 h-1.5 bg-stone-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                     </div>
                  </div>
                )}
             </div>

             <footer className="p-8 bg-card border-t border-border-dim">
                <div className="flex gap-4 items-center max-w-3xl mx-auto">
                   <button 
                     onClick={() => setIsRecording(!isRecording)}
                     className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 ring-4 ring-red-500/20' : 'bg-border-dim hover:bg-border-dim/80'}`}
                   >
                     {isRecording ? <MicOff size={24}/> : <Mic size={24}/>}
                   </button>
                   <input 
                     value={input}
                     onChange={e => setInput(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && handleSend()}
                     placeholder="Type a memory..."
                     className="flex-1 bg-secondary border border-border-dim rounded-2xl px-6 py-4 focus:outline-none focus:border-primary transition-all font-serif italic text-lg"
                   />
                   <button 
                     onClick={handleSend}
                     className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center hover:scale-105 transition-all text-secondary"
                   >
                      <Send size={24} />
                   </button>
                   <button 
                     onClick={endSession}
                     className="ml-4 px-6 py-4 bg-accent text-white rounded-2xl font-bold text-sm shadow-lg hover:scale-105 transition-all"
                   >
                     Complete
                   </button>
                </div>
             </footer>
          </motion.div>
        )}

        {sessionStage === 'SUMMARY' && (
          <motion.div 
            key="summary"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl w-full text-center"
          >
             <div className="glass p-12 rounded-[60px] relative overflow-hidden mb-12">
                <Sparkles className="text-primary mb-8 mx-auto" size={48} />
                <h2 className="text-xs font-bold text-primary uppercase tracking-[0.2em] mb-4">Memory Card Crystallized</h2>
                <h1 className="text-4xl font-serif italic mb-6 leading-tight text-white">"{memoryCard?.title}"</h1>
                <p className="text-muted mb-8 leading-relaxed font-serif text-lg">{memoryCard?.summary}</p>
                <div className="flex justify-center gap-2 flex-wrap">
                   {memoryCard?.tags?.map((t: string) => (
                     <span key={t} className="px-3 py-1 bg-card border border-border-dim rounded-full text-xs text-muted">#{t}</span>
                   ))}
                </div>
             </div>
             
             <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 py-4 bg-primary text-secondary rounded-2xl font-bold flex items-center justify-center gap-2"
                >
                   <Save size={18}/> Save to Archive
                </button>
                <button 
                  onClick={startSession}
                  className="px-8 py-4 bg-card border border-border-dim rounded-2xl font-bold text-muted"
                >
                   Add Detail
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
