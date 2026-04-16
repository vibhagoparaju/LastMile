import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Activity, Search, Brain, Users, History, Zap, 
  ChevronDown, Sparkles, BookOpen, Download, X, Loader2
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import { streamBiography } from '../lib/gemini';
import TopNav from '../components/TopNav';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function PimExplorer({ user }: { user: any }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pim, setPim] = useState<any>(null);
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [answer, setAnswer] = useState<{ text: string, sources: string[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const [isBioModalOpen, setIsBioModalOpen] = useState(searchParams.get('action') === 'bio');
  const [biography, setBiography] = useState("");
  const [isBioGenerating, setIsBioGenerating] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      const pimSnap = await getDoc(doc(db, 'users', user.uid, 'pimLayers', 'active'));
      const memSnap = await getDocs(query(collection(db, 'users', user.uid, 'memories'), orderBy('createdAt', 'desc')));
      
      const pData = pimSnap.data();
      setPim(pData || { identityLayer: {}, narrativeLayer: { events: [] }, relationalLayer: { people: [] }, valuesLayer: { beliefs: [] } });
      setMemories(memSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    loadData();
  }, [user]);

  const handleAsk = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setAnswer(null);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `You are the PIM Oracle. Answer the following question based ONLY on this Personal Identity Model.
        Question: ${searchQuery}
        PIM Context: ${JSON.stringify(pim)}
        Memories: ${JSON.stringify(memories.slice(0, 10))}`,
        config: {
          systemInstruction: "Always cite memory titles in your answer. If you don't know, say it hasn't been crystalized yet."
        }
      });
      setAnswer({ text: response.text || "", sources: [] });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const generateBio = async () => {
    setIsBioGenerating(true);
    setBiography("");
    const bioStream = streamBiography(memories);
    for await (const part of bioStream) {
      setBiography(prev => prev + part);
    }
    setIsBioGenerating(false);
  };

  const downloadBio = () => {
    const blob = new Blob([biography], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Biography_${user.displayName}.txt`;
    a.click();
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-secondary text-white pb-24 font-sans selection:bg-primary/30">
      <TopNav user={user} />

      <main className="max-w-7xl mx-auto px-8 pt-12">
        <header className="mb-12">
           <div className="flex items-center gap-2 text-primary font-serif italic text-lg mb-2">
              <Zap size={18} />
              Identity Architecture
           </div>
           <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <h1 className="text-5xl font-serif tracking-tight">The <span className="italic text-primary">PIM Explorer</span></h1>
              <button 
                onClick={() => { setIsBioModalOpen(true); generateBio(); }}
                className="px-8 py-4 bg-primary/10 border border-primary/20 text-primary rounded-2xl font-bold flex items-center gap-2 hover:bg-primary hover:text-secondary transition-all"
              >
                 <BookOpen size={18} />
                 Living Biography Engine
              </button>
           </div>
        </header>

        {/* Search / Ask AI */}
        <div className="mb-16">
           <div className="relative max-w-3xl mx-auto">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted" size={20} />
              <input 
                type="text" 
                placeholder="Ask your PIM a question... (e.g., 'What was Robert's first car?')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                className="w-full bg-card border border-border-dim rounded-[40px] p-8 pl-16 text-xl font-serif text-white focus:outline-none focus:border-primary/50 transition-all shadow-2xl"
              />
              <button 
                onClick={handleAsk}
                disabled={isSearching}
                className="absolute right-4 top-1/2 -translate-y-1/2 px-6 py-3 bg-primary text-secondary rounded-full font-bold text-sm tracking-widest uppercase"
              >
                 {isSearching ? "Querying..." : "Search PIM"}
              </button>
           </div>
           
           <AnimatePresence>
              {answer && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-3xl mx-auto mt-6 p-8 glass rounded-[32px] border border-primary/20 bg-primary/5 italic font-serif text-xl"
                >
                   <Sparkles className="text-primary mb-4" size={24} />
                   "{answer.text}"
                </motion.div>
              )}
           </AnimatePresence>
        </div>

        <div className="grid lg:grid-cols-12 gap-12">
           {/* Visual Coverage Chart */}
           <div className="lg:col-span-4 self-start">
              <div className="glass p-10 rounded-[48px] border border-border-dim text-center">
                 <h3 className="text-xs uppercase tracking-[0.4em] font-bold text-muted mb-12">PIM Coverage Radar</h3>
                 <div className="relative w-full aspect-square flex items-center justify-center">
                    <RadarChart />
                    <div className="absolute inset-0 flex items-center justify-center">
                       <div className="text-center">
                          <div className="text-5xl font-serif text-white leading-none mb-1">68<span className="text-primary italic text-2xl">%</span></div>
                          <div className="text-[10px] text-muted uppercase font-bold tracking-widest">Total Weight</div>
                       </div>
                    </div>
                 </div>
                 
                 <div className="mt-12 space-y-4 text-left">
                    <div className="flex justify-between items-baseline">
                       <span className="text-xs text-muted font-bold tracking-widest">Identity Density</span>
                       <span className="text-primary font-serif italic">High</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                       <span className="text-xs text-muted font-bold tracking-widest">Relational Depth</span>
                       <span className="text-primary font-serif italic">Medium</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* Layers Explorer */}
           <div className="lg:col-span-8 space-y-4">
              <PimSection 
                 title="Identity Layer" 
                 icon={<Brain className="text-primary"/>} 
                 desc="Personality traits, common phrases, and humor styles."
                 entities={pim.identityLayer?.traits || []}
                 expanded={expandedSection === 'identity'}
                 onClick={() => setExpandedSection(expandedSection === 'identity' ? null : 'identity')}
              />
              <PimSection 
                 title="Narrative Layer" 
                 icon={<BookOpen className="text-primary"/>} 
                 desc="The core timeline of events that define the story."
                 entities={pim.narrativeLayer?.events?.map((e: any) => e.title) || []}
                 expanded={expandedSection === 'narrative'}
                 onClick={() => setExpandedSection(expandedSection === 'narrative' ? null : 'narrative')}
              />
              <PimSection 
                 title="Relational Layer" 
                 icon={<Users className="text-primary"/>} 
                 desc="The circle of people and emotional connections."
                 entities={pim.relationalLayer?.people?.map((p: any) => p.name) || []}
                 expanded={expandedSection === 'relational'}
                 onClick={() => setExpandedSection(expandedSection === 'relational' ? null : 'relational')}
              />
              <PimSection 
                 title="Values Layer" 
                 icon={<Sparkles className="text-primary"/>} 
                 desc="Deeply held beliefs, metaphors, and life philosophies."
                 entities={pim.valuesLayer?.beliefs || []}
                 expanded={expandedSection === 'values'}
                 onClick={() => setExpandedSection(expandedSection === 'values' ? null : 'values')}
              />
           </div>
        </div>
      </main>

      {/* Biography Modal */}
      <AnimatePresence>
         {isBioModalOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-secondary flex items-center justify-center p-8"
            >
               <div className="max-w-3xl w-full h-full flex flex-col pt-12">
                  <header className="flex justify-between items-center mb-12">
                     <div className="font-serif italic text-2xl text-primary">Living Biography of {user?.displayName}</div>
                     <button onClick={() => setIsBioModalOpen(false)} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all">
                        <X size={24} />
                     </button>
                  </header>

                  <div className="flex-1 glass p-12 rounded-[64px] border border-border-dim overflow-y-auto font-serif selection:bg-primary/30">
                     <div className="max-w-xl mx-auto">
                        <div className="space-y-8 text-xl text-white/90 leading-relaxed whitespace-pre-wrap">
                           {biography || (
                              <div className="flex flex-col items-center justify-center py-20 gap-4">
                                 <Loader2 size={40} className="text-primary animate-spin" />
                                 <p className="text-muted italic">Consulting the Narrative Archive...</p>
                              </div>
                           )}
                        </div>
                     </div>
                  </div>

                  <footer className="py-12 flex justify-center gap-6">
                     <button 
                      onClick={downloadBio}
                      className="px-10 py-4 bg-primary text-secondary rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-soft"
                     >
                        <Download size={18} /> Download Biography (.txt)
                     </button>
                     <button className="px-10 py-4 border border-border-dim rounded-2xl text-muted font-bold hover:bg-white/5 transition-all">Order Bound Print</button>
                  </footer>
               </div>
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}

function RadarChart() {
   return (
      <svg className="w-full h-full p-4 overflow-visible" viewBox="0 0 100 100">
         {/* Axes */}
         {[0, 72, 144, 216, 288].map((angle, i) => {
            const rad = (angle - 90) * (Math.PI / 180);
            return (
               <line 
                  key={i}
                  x1="50" y1="50" 
                  x2={50 + 40 * Math.cos(rad)} y2={50 + 40 * Math.sin(rad)}
                  stroke="#2C2C2E" strokeWidth="0.5"
               />
            );
         })}
         {/* Web Circles */}
         {[10, 20, 30, 40].map((r, i) => (
            <circle key={i} cx="50" cy="50" r={r} fill="none" stroke="#2C2C2E" strokeWidth="0.5" />
         ))}
         {/* Data Poly */}
         <polygon 
            points="50,20 80,45 65,80 35,80 20,45"
            className="fill-primary/20 stroke-primary stroke-[0.5]"
         />
      </svg>
   );
}

function PimSection({ title, icon, desc, entities, expanded, onClick }: any) {
  return (
    <div className={`p-8 rounded-[40px] border transition-all ${expanded ? 'bg-card border-primary/30' : 'bg-card/50 border-border-dim hover:bg-card'}`}>
       <div 
        onClick={onClick}
        className="flex items-center justify-between cursor-pointer"
       >
          <div className="flex items-center gap-6">
             <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center border border-border-dim group-hover:bg-primary group-hover:text-secondary">
                {icon}
             </div>
             <div>
                <h3 className="text-xl font-serif text-white mb-1 italic">{title}</h3>
                <p className="text-xs text-muted font-bold uppercase tracking-widest">{entities.length} CRYSTALIZED NODES</p>
             </div>
          </div>
          <ChevronDown size={24} className={`text-muted transition-all ${expanded ? 'rotate-180' : ''}`} />
       </div>
       
       <AnimatePresence>
          {expanded && (
             <motion.div 
               initial={{ height: 0, opacity: 0 }}
               animate={{ height: 'auto', opacity: 1 }}
               exit={{ height: 0, opacity: 0 }}
               className="overflow-hidden"
             >
                <div className="pt-8 mt-8 border-t border-border-dim">
                   <p className="text-muted text-sm font-serif italic mb-6 leading-relaxed">{desc}</p>
                   <div className="flex flex-wrap gap-2">
                      {entities.length === 0 ? <span className="text-xs text-muted italic">No data yet.</span> : entities.map((e: string, i: number) => (
                         <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1">
                            <Sparkles size={10} /> {e}
                         </span>
                      ))}
                   </div>
                </div>
             </motion.div>
          )}
       </AnimatePresence>
    </div>
  );
}
