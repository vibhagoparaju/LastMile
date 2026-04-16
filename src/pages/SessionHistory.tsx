import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  History, Search, Filter, ChevronDown, 
  MessageSquare, Activity, Sparkles, Clock, Star, Calendar, ArrowLeft, Volume2, X
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import TopNav from '../components/TopNav';

export default function SessionHistory({ user }: { user: any }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get('id');
  
  const [filter, setFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(initialId);

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'users', user.uid, 'sessions'), 
      orderBy('startedAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snap) => {
      setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredSessions = sessions.filter(s => {
    if (filter !== 'ALL' && s.type !== filter) return false;
    if (searchQuery && !s.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const [isVoicePortraitOpen, setIsVoicePortraitOpen] = useState(false);
  const [currentVoiceIndex, setCurrentVoiceIndex] = useState(0);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);

  const voiceMemories = sessions.filter(s => s.type === 'CAPTURE' && s.audioUrl);

  const playVoicePortrait = () => {
    if (voiceMemories.length === 0) return;
    setIsVoicePortraitOpen(true);
    playNextVoice(0);
  };

  const playNextVoice = (index: number) => {
    if (index >= Math.min(voiceMemories.length, 5)) {
      setIsVoicePlaying(false);
      return;
    }
    setCurrentVoiceIndex(index);
    setIsVoicePlaying(true);
    
    // Simulate TTS or Play audioUrl
    // Feature requirement: "Use browser SpeechSynthesis as fallback"
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(voiceMemories[index].summary || "A precious memory.");
    utterance.onend = () => {
      setTimeout(() => playNextVoice(index + 1), 1000);
    };
    synth.speak(utterance);
  };

  const stopVoicePortrait = () => {
    window.speechSynthesis.cancel();
    setIsVoicePortraitOpen(false);
    setIsVoicePlaying(false);
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-secondary text-white pb-24 font-sans selection:bg-primary/30">
      <TopNav user={user} />

      <main className="max-w-5xl mx-auto px-8 pt-12">
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
           <div>
              <div className="flex items-center gap-2 text-primary font-serif italic text-lg mb-2">
                 <History size={18} />
                 Narrative Continuity
              </div>
              <h1 className="text-5xl font-serif tracking-tight">The <span className="italic text-primary">Legacy Feed</span></h1>
           </div>
           
           <div className="flex flex-col gap-4 items-end">
              <button 
                onClick={playVoicePortrait}
                className="px-6 py-3 bg-primary/10 border border-primary/20 text-primary rounded-2xl font-bold flex items-center gap-2 hover:bg-primary hover:text-secondary transition-all text-xs tracking-widest uppercase"
              >
                 <Volume2 size={16} />
                 Voice Portrait
              </button>
              <div className="flex bg-card border border-border-dim rounded-2xl overflow-hidden p-1">
                 {['ALL', 'CAPTURE', 'BRIDGE', 'LEGACY'].map(f => (
                   <button 
                     key={f}
                     onClick={() => setFilter(f)}
                     className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all rounded-xl ${filter === f ? 'bg-primary text-secondary' : 'text-muted hover:text-white'}`}
                   >
                     {f}
                   </button>
                 ))}
              </div>
           </div>
        </header>

        {/* Search */}
        <div className="relative mb-12">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted" size={18} />
           <input 
             type="text" 
             placeholder="Search by session title or tag..."
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="w-full bg-card border border-border-dim rounded-[32px] p-6 pl-14 text-lg font-serif italic text-white focus:outline-none focus:border-primary/50 transition-all"
           />
        </div>

        {/* Sessions List */}
        <div className="space-y-6">
           {filteredSessions.length === 0 ? (
              <div className="p-20 text-center glass rounded-[48px] border border-border-dim">
                 <p className="text-muted italic mb-4">No sessions found in this archive.</p>
                 <button onClick={() => navigate('/capture')} className="text-primary font-bold hover:underline font-sans uppercase text-xs tracking-widest">Start First Session →</button>
              </div>
           ) : filteredSessions.map((s, i) => (
              <SessionCard 
                key={s.id} 
                session={s} 
                expanded={expandedId === s.id}
                onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
              />
           ))}
        </div>

        {/* Voice Portrait Overlay */}
        <AnimatePresence>
           {isVoicePortraitOpen && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-secondary/95 backdrop-blur-xl flex items-center justify-center p-8"
              >
                  <div className="max-w-xl w-full text-center">
                     <button onClick={stopVoicePortrait} className="absolute top-12 right-12 text-muted hover:text-white"><X size={32}/></button>
                     <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center text-primary mx-auto mb-12 border border-primary/20">
                        <Volume2 size={48} className={isVoicePlaying ? 'animate-pulse' : ''} />
                     </div>
                     <h2 className="text-5xl font-serif text-white mb-6 italic">Voice Portrait.</h2>
                     <p className="text-muted text-xl mb-16 font-serif italic">Listening to the narrative threads of Robert's life.</p>
                     
                     <div className="glass p-10 rounded-[48px] border border-primary/20 bg-primary/5 shadow-2xl relative overflow-hidden">
                        {voiceMemories[currentVoiceIndex] ? (
                           <div className="space-y-4">
                              <div className="text-[10px] text-primary uppercase tracking-[0.4em] font-bold">Resonating Arc {currentVoiceIndex + 1}/{voiceMemories.length}</div>
                              <h3 className="text-3xl font-serif text-white italic">"{voiceMemories[currentVoiceIndex].title}"</h3>
                              <p className="text-muted font-serif">Recorded {voiceMemories[currentVoiceIndex].startedAt?.toDate().toLocaleDateString()}</p>
                           </div>
                        ) : (
                           <p className="text-muted italic">Preparing audio artifacts...</p>
                        )}
                        <div className="mt-8 flex justify-center gap-1">
                           {[...Array(5)].map((_, i) => (
                             <div key={i} className={`w-1 h-8 rounded-full transition-all duration-300 ${isVoicePlaying ? 'bg-primary animate-bounce' : 'bg-white/10'}`} style={{ animationDelay: `${i * 0.1}s` }} />
                           ))}
                        </div>
                     </div>
                     <div className="mt-12 text-[10px] text-muted uppercase tracking-[0.4em]">Listening to crystalized memories...</div>
                  </div>
              </motion.div>
           )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function SessionCard({ session, expanded, onClick }: any) {
  return (
    <div className={`rounded-[40px] border transition-all ${expanded ? 'bg-card border-primary/30 shadow-2xl' : 'bg-card/50 border-border-dim hover:bg-card'}`}>
       <div 
        onClick={onClick}
        className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 cursor-pointer"
       >
          <div className="flex items-center gap-6">
             <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-primary border border-border-dim">
                {session.type === 'CAPTURE' ? <MessageSquare size={24} /> : <Activity size={24} />}
             </div>
             <div>
                <h3 className="text-2xl font-serif text-white mb-1 italic">{session.title || 'Untitled Session'}</h3>
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
                   <div className="flex items-center gap-1"><Calendar size={12} /> {session.startedAt ? session.startedAt.toDate().toLocaleDateString() : 'Recent'}</div>
                   <div className="flex items-center gap-1"><Star size={12} className="text-primary" /> Score: {Math.round(session.qualityScore * 10 || 0)}/10</div>
                </div>
             </div>
          </div>
          <div className="flex items-center gap-4">
             <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-muted">{session.type}</span>
             <ChevronDown size={24} className={`text-muted transition-all ${expanded ? 'rotate-180' : ''}`} />
          </div>
       </div>

       <AnimatePresence>
          {expanded && (
             <motion.div 
               initial={{ height: 0, opacity: 0 }}
               animate={{ height: 'auto', opacity: 1 }}
               exit={{ height: 0, opacity: 0 }}
               className="overflow-hidden"
             >
                <div className="p-8 pt-0 border-t border-border-dim mt-4">
                   <div className="grid md:grid-cols-2 gap-12 pt-8">
                      <div>
                         <h4 className="text-xs uppercase tracking-[0.4em] font-bold text-muted mb-4">Memory Summary</h4>
                         <p className="text-lg font-serif italic text-white/80 leading-relaxed mb-6">"{session.summary || 'A beautiful session exploring narrative threads and emotional anchors.'}"</p>
                         <div className="flex flex-wrap gap-2">
                           {session.tags?.map((t: string) => (
                             <span key={t} className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase tracking-widest">#{t}</span>
                           ))}
                         </div>
                      </div>
                      <div className="space-y-6">
                         <div className="p-6 rounded-3xl bg-secondary border border-border-dim">
                            <h4 className="text-[10px] uppercase tracking-widest font-black text-muted mb-4">Quality Analysis</h4>
                            <div className="space-y-4">
                               <MetricRow label="Coherence" value={84} />
                               <MetricRow label="Resonance" value={92} />
                               <MetricRow label="Crystalization" value={76} />
                            </div>
                         </div>
                         <button className="w-full py-4 border border-border-dim rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all text-white">Full Transcript View</button>
                      </div>
                   </div>
                </div>
             </motion.div>
          )}
       </AnimatePresence>
    </div>
  );
}

function MetricRow({ label, value }: any) {
  return (
    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
       <span className="text-muted">{label}</span>
       <div className="flex-1 mx-4 h-1 bg-white/5 rounded-full">
          <div className="h-full bg-primary" style={{ width: `${value}%` }} />
       </div>
       <span className="text-primary italic">{value}%</span>
    </div>
  );
}
