import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, Mic, Send, History, Check, X, 
  ChevronRight, MicOff, Volume2, Waves, Loader2
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, query, orderBy, limit, getDocs, getDoc, doc, addDoc, setDoc, serverTimestamp, updateDoc 
} from 'firebase/firestore';
import { transcribeAudio, generateSessionResponse, extractMemoryData, getEmbedding } from '../lib/gemini';
import { suggestNextTopic } from '../lib/pim';

export default function CaptureSession({ user }: { user: any }) {
  const navigate = useNavigate();
  const [stage, setStage] = useState<'intro' | 'talking' | 'summary'>('intro');
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [memoryCard, setMemoryCard] = useState<any>(null);
  
  const [profile, setProfile] = useState<any>(null);
  const [recentMemories, setRecentMemories] = useState<any[]>([]);
  const [suggestedTopic, setSuggestedTopic] = useState("");

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const animationFrame = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerInterval = useRef<any>(null);

  useEffect(() => {
    if (!user) return;
    
    // Load context for the session
    const loadContext = async () => {
      try {
        const profileSnap = await getDoc(doc(db, 'users', user.uid));
        const pimSnap = await getDoc(doc(db, 'users', user.uid, 'pimLayers', 'active'));
        const memoriesSnap = await getDocs(query(
          collection(db, 'users', user.uid, 'memories'), 
          orderBy('createdAt', 'desc'), 
          limit(5)
        ));
        
        const pData = profileSnap.data();
        setProfile(pData);
        setRecentMemories(memoriesSnap.docs.map(d => d.data().title));
        setSuggestedTopic(suggestNextTopic(pimSnap.data()));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}/capture-context`);
      }
    };
    loadContext();
  }, [user]);

  // Start Session
  const startSession = async () => {
    setStage('talking');
    setIsThinking(true);
    
    const systemPrompt = `You are the LastMile Memory Archaeologist helping ${profile?.name || 'the user'} (stage: ${profile?.stage || 'PLANNER'}). Their previous memory topics were: ${recentMemories.join(', ') || 'None yet'}. Today's session goal is to explore new territory not yet covered. Ask about: ${suggestedTopic || 'their childhood'}. Be warm, follow tangents, and focus on sensory details. Use short prompts. Always refer to them by their name.`;
    
    const intro = await generateSessionResponse(systemPrompt, []);
    setMessages([{ role: 'model', content: intro }]);
    setIsThinking(false);
  };

  // Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunks.current = [];
      
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        setIsThinking(true);
        try {
          const transcript = await transcribeAudio(audioBlob);
          setInputValue(transcript);
          // Auto send logic if transcript exists
          if (transcript.trim()) {
            handleSend(transcript);
          }
        } catch (e) {
          console.error("Transcription failed", e);
        } finally {
          setIsThinking(false);
        }
      };

      // Set up visualizer
      audioContext.current = new AudioContext();
      const source = audioContext.current.createMediaStreamSource(stream);
      analyser.current = audioContext.current.createAnalyser();
      source.connect(analyser.current);
      drawWaveform();

      mediaRecorder.current.start();
      setIsRecording(true);
      timerInterval.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (e) {
      console.error("Mic access denied", e);
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
    clearInterval(timerInterval.current);
    setRecordingTime(0);
    if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyser.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const bufferLength = analyser.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
       animationFrame.current = requestAnimationFrame(draw);
       analyser.current!.getByteFrequencyData(dataArray);
       
       ctx.clearRect(0, 0, canvas.width, canvas.height);
       const barWidth = (canvas.width / bufferLength) * 2.5;
       let barHeight;
       let x = 0;
       
       for(let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 2) * (canvas.height / 128);
          ctx.fillStyle = '#E5C07B';
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
       }
    };
    draw();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Chat Logic
  const handleSend = async (forcedValue?: string) => {
    const text = forcedValue || inputValue;
    if (!text.trim()) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsThinking(true);

    const systemPrompt = `You are a warm Memory Archaeologist. Based on the history, continue the conversation. Keep it focused on capturing one specific memory in detail.`;
    const history = messages.concat(userMsg).map(m => ({ role: m.role, content: m.content }));
    
    const response = await generateSessionResponse(systemPrompt, history);
    setMessages(prev => [...prev, { role: 'model', content: response }]);
    setIsThinking(false);
  };

  const exitSession = async () => {
    setIsThinking(true);
    const transcript = messages.map(m => `${m.role}: ${m.content}`).join('\n');
    
    // 1. Generate Memory Card
    const card = await extractMemoryData(transcript);
    
    // 2. Embed for search
    const embedding = await getEmbedding(transcript);
    
    // 3. Save Memory to Firestore
    try {
      const memRef = await addDoc(collection(db, 'users', user.uid, 'memories'), {
        ...card,
        embedding,
        createdAt: serverTimestamp(),
        userId: user.uid
      });

      // 4. Update PIM Layers
      const pimRef = doc(db, 'users', user.uid, 'pimLayers', 'active');
      const pimSnap = await getDoc(pimRef);
      const oldPim = pimSnap.exists() ? pimSnap.data() : { identityLayer: {}, narrativeLayer: {}, relationalLayer: {}, valuesLayer: {} };
      
      // Simple Merge for entities into PIM (Logic can be improved later)
      await setDoc(pimRef, {
        ...oldPim,
        entities: card.entities,
        lastUpdated: serverTimestamp()
      }, { merge: true });

      setMemoryCard({ ...card, id: memRef.id });
      setStage('summary');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/memories`);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary text-white font-sans selection:bg-primary/30">
      <AnimatePresence mode="wait">
        {stage === 'intro' && (
          <motion.div 
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-screen flex items-center justify-center p-8"
          >
            <div className="max-w-2xl text-center">
              <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto mb-12 border border-primary/20 animate-pulse">
                 <Sparkles size={48} />
              </div>
              <h1 className="text-5xl font-serif text-white mb-6">A new window is <span className="italic text-primary">beginning.</span></h1>
              <p className="text-muted text-xl font-serif italic mb-12 leading-relaxed">
                 Robert, I thought we might talk about <span className="text-primary font-bold">"{suggestedTopic}"</span> today. You've mentioned it before, but I want to hear the details you've never shared.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                 <button 
                   onClick={startSession}
                   className="px-10 py-5 bg-primary text-secondary rounded-[32px] font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-soft flex items-center justify-center gap-2"
                 >
                    Enter the Session
                    <ChevronRight size={20} />
                 </button>
                 <button onClick={() => navigate('/dashboard')} className="px-10 py-5 bg-card border border-border-dim text-muted rounded-[32px] text-sm font-bold uppercase tracking-widest hover:bg-white/5 transition-all">
                    Maybe Later
                 </button>
              </div>
            </div>
          </motion.div>
        )}

        {stage === 'talking' && (
          <motion.div 
            key="talking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-screen"
          >
            {/* Session Header */}
            <div className="p-8 border-b border-border-dim flex justify-between items-center bg-card/30 backdrop-blur-md">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                     <Volume2 size={20} />
                  </div>
                  <div>
                     <div className="font-serif italic text-white">Capture Session</div>
                     <div className="text-[10px] text-primary uppercase tracking-[0.2em] font-bold">Archaeologist Active</div>
                  </div>
               </div>
               <button 
                onClick={exitSession}
                className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
               >
                  <History size={14} /> Finish & Save
               </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth">
               {messages.map((m, i) => (
                 <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   key={i} 
                   className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                 >
                    <div className={`max-w-[80%] p-6 rounded-[32px] font-serif text-lg leading-relaxed ${m.role === 'user' ? 'bg-primary text-secondary rounded-tr-none' : 'bg-card border border-border-dim text-white rounded-tl-none italic'}`}>
                        {m.content}
                    </div>
                 </motion.div>
               ))}
               {isThinking && (
                 <div className="flex justify-start">
                    <div className="bg-card/50 p-4 rounded-full flex gap-1">
                       <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                       <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                       <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                 </div>
               )}
            </div>

            {/* Input Area */}
            <div className="p-8 bg-card/50 border-t border-border-dim backdrop-blur-xl">
               <div className="max-w-4xl mx-auto">
                  <div className="relative mb-4">
                     <canvas 
                       ref={canvasRef} 
                       width={1000} 
                       height={40} 
                       className={`w-full h-10 transition-opacity duration-300 pointer-events-none absolute -top-12 left-0 ${isRecording ? 'opacity-100' : 'opacity-0'}`} 
                     />
                     <textarea 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={isRecording ? "Listening to your story..." : "Share your memory here..."}
                        className="w-full bg-secondary/50 border border-border-dim rounded-[32px] p-6 pr-32 min-h-[100px] font-serif text-lg focus:outline-none focus:border-primary/50 transition-all resize-none"
                     />
                     <div className="absolute bottom-4 right-4 flex gap-2">
                        <button 
                          onMouseDown={startRecording}
                          onMouseUp={stopRecording}
                          onTouchStart={startRecording}
                          onTouchEnd={stopRecording}
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-muted hover:text-primary hover:bg-white/10'}`}
                        >
                           {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
                        </button>
                        <button 
                          onClick={() => handleSend()}
                          disabled={isThinking || !inputValue.trim()}
                          className="w-14 h-14 bg-primary text-secondary rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-50"
                        >
                           <Send size={24} />
                        </button>
                     </div>
                  </div>
                  {isRecording && (
                    <div className="flex items-center justify-between px-4">
                       <span className="text-red-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                          Recording Audio
                       </span>
                       <span className="font-mono text-white text-xs">{formatTime(recordingTime)}</span>
                    </div>
                  )}
               </div>
            </div>
          </motion.div>
        )}

        {stage === 'summary' && (
          <motion.div 
            key="summary"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="min-h-screen flex items-center justify-center p-8 bg-secondary/95"
          >
            <div className="max-w-xl w-full">
               <div className="text-center mb-12">
                  <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-secondary mx-auto mb-6 shadow-soft">
                     <Check size={40} />
                  </div>
                  <h2 className="text-4xl font-serif text-white mb-2 italic">A Memory Crystalized.</h2>
                  <p className="text-muted">Stored securely in your Narrative Layer.</p>
               </div>

               <div className="glass p-10 rounded-[48px] border border-primary/20 bg-primary/5 shadow-2xl relative overflow-hidden group mb-12">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                  <div className="relative z-10">
                     <div className="text-[10px] text-primary uppercase tracking-[0.4em] font-bold mb-4">Memory Card #{memoryCard?.id?.slice(-4)}</div>
                     <h3 className="text-3xl font-serif text-white mb-4 italic">{memoryCard?.title}</h3>
                     <p className="text-muted leading-relaxed font-serif mb-8">{memoryCard?.summary}</p>
                     
                     <div className="flex flex-wrap gap-2">
                        {memoryCard?.tags?.map((t: string) => (
                          <span key={t} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest text-primary font-bold">#{t}</span>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="flex gap-4">
                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="flex-1 py-5 bg-primary text-secondary rounded-[32px] font-bold flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-soft"
                  >
                     Return to Dashboard
                  </button>
                  <button 
                    onClick={() => window.location.reload()}
                    className="px-10 py-5 bg-card border border-border-dim text-white rounded-[32px] font-bold hover:bg-white/5 transition-all"
                  >
                     New Session
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {isThinking && stage !== 'talking' && (
        <div className="fixed inset-0 z-50 bg-secondary/80 flex items-center justify-center backdrop-blur-sm">
           <div className="text-center">
              <Loader2 size={48} className="text-primary animate-spin mx-auto mb-4" />
              <p className="text-primary font-serif italic text-xl">Saving to your PIM...</p>
           </div>
        </div>
      )}
    </div>
  );
}
