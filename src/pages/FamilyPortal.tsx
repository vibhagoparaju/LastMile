import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Heart, Plus, Mail, Shield, 
  MessageSquare, History, Check, Info, ChevronRight, Sparkles, Camera, Loader2, Send
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, query, orderBy, limit, onSnapshot, addDoc, getDoc, doc, serverTimestamp, setDoc 
} from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import TopNav from '../components/TopNav';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function FamilyPortal({ user }: { user: any }) {
  const navigate = useNavigate();
  const [family, setFamily] = useState<any[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);
  const [moments, setMoments] = useState<any[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("CAREGIVER");
  
  const [newMemory, setNewMemory] = useState("");
  const [newRelation, setNewRelation] = useState("Daughter");

  useEffect(() => {
    if (!user) return;
    
    // 1. Fetch Family Members
    const familyMembersPath = `users/${user.uid}/familyMembers`;
    const unsubscribeFamily = onSnapshot(collection(db, familyMembersPath), (snap) => {
      setFamily(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, familyMembersPath);
    });

    // 2. Fetch Contributions
    const familyContributionsPath = `users/${user.uid}/familyContributions`;
    const unsubscribeContribs = onSnapshot(collection(db, familyContributionsPath), (snap) => {
      setContributions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, familyContributionsPath);
    });

    // 3. Fetch Shared Moments
    const sharedMomentsPath = `users/${user.uid}/sharedMoments`;
    const qMoments = query(collection(db, sharedMomentsPath), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribeMoments = onSnapshot(qMoments, (snap) => {
      setMoments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, sharedMomentsPath);
    });

    return () => {
      unsubscribeFamily();
      unsubscribeContribs();
      unsubscribeMoments();
    };
  }, [user]);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    const invitePath = 'familyInvites';
    try {
      await addDoc(collection(db, invitePath), {
        email: inviteEmail,
        userId: user.uid,
        userName: user.displayName,
        role: inviteRole,
        status: 'PENDING',
        createdAt: serverTimestamp()
      });
      setShowInviteModal(false);
      setInviteEmail("");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, invitePath);
    }
  };

  const handleSubmitMemory = async () => {
    if (!newMemory) return;
    setIsSubmitting(true);
    const familyContributionsPath = `users/${user.uid}/familyContributions`;
    const sharedMomentsPath = `users/${user.uid}/sharedMoments`;
    try {
      // 1. Save Contribution
      const contrib = {
        text: newMemory,
        relationship: newRelation,
        contributor: user.displayName,
        createdAt: serverTimestamp()
      };
      const contribRef = await addDoc(collection(db, familyContributionsPath), contrib);

      // 2. Multi-Match with PIM using Gemini
      const pimRef = doc(db, 'users', user.uid, 'pimLayers', 'active');
      const pimSnap = await getDoc(pimRef);
      const pim = pimSnap.data();

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Does this family memory match anything in this PIM? 
        PIM: ${JSON.stringify(pim)}
        New Memory: ${newMemory}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              match: { type: "BOOLEAN" },
              matchedMemoryTitle: { type: "STRING" },
              resonanceDescription: { type: "STRING" }
            }
          }
        }
      });

      const analysis = JSON.parse(response.text || "{}");
      
      if (analysis.match) {
        // Create Shared Moment
        await addDoc(collection(db, sharedMomentsPath), {
          title: analysis.matchedMemoryTitle || "Resonant Connection",
          description: analysis.resonanceDescription,
          author: user.displayName,
          createdAt: serverTimestamp()
        });
      }

      setShowSubmitModal(false);
      setNewMemory("");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, familyContributionsPath);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary text-white pb-12 font-sans selection:bg-primary/30">
      <TopNav user={user} />

      <main className="max-w-7xl mx-auto px-8 pt-12">
        <header className="mb-12">
           <div className="flex items-center gap-2 text-primary font-serif italic text-lg mb-2">
              <Users size={18} />
              Circle of Care
           </div>
           <h1 className="text-4xl font-serif text-white tracking-tight">The <span className="italic text-primary">Steward Portal</span></h1>
        </header>

        <div className="grid lg:grid-cols-12 gap-12">
           {/* Main Feed */}
           <div className="lg:col-span-8 space-y-12">
              {/* Contribution Mode Card */}
              <div className="p-10 rounded-[48px] bg-card border border-border-dim shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-all duration-1000 group-hover:bg-primary/10" />
                 <div className="relative z-10">
                    <h3 className="text-2xl font-serif text-white mb-4 italic">Contribute to the Narrative</h3>
                    <p className="text-muted mb-8 leading-relaxed max-w-lg">Help crystalize Robert's Personal Identity Model by sharing your own memories, photos, and stories of him.</p>
                    <button 
                      onClick={() => setShowSubmitModal(true)}
                      className="px-8 py-4 bg-primary text-secondary rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-all shadow-soft"
                    >
                       <Plus size={20} />
                       Submit a Memory
                    </button>
                 </div>
              </div>

              {/* Shared Moments */}
              <div>
                 <div className="flex justify-between items-center mb-8 border-b border-border-dim pb-4">
                    <h3 className="text-xs uppercase tracking-[0.4em] font-bold text-muted">Shared Moments Feed</h3>
                    <span className="text-[10px] text-primary font-bold uppercase tracking-widest">{moments.length} Synchronizations</span>
                 </div>
                 
                 <div className="space-y-6">
                    {moments.length === 0 ? (
                      <div className="glass p-12 text-center rounded-[48px] border border-border-dim italic text-muted">No shared moments yet — contribute a memory above.</div>
                    ) : moments.map((moment, i) => (
                      <MomentItem 
                        key={moment.id}
                        title={moment.title}
                        desc={moment.description}
                        date={moment.createdAt ? formatDistanceToNow(moment.createdAt.toDate(), { addSuffix: true }) : 'Recent'}
                        author={moment.author}
                      />
                    ))}
                 </div>
              </div>
           </div>

           {/* Sidebar */}
           <div className="lg:col-span-4 space-y-8">
              {/* Legacy Steward Section */}
              <div className="glass p-8 rounded-[40px] border border-border-dim bg-white/5">
                 <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-white">Circle Members</h2>
                    <button 
                      onClick={() => setShowInviteModal(true)}
                      className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center hover:bg-primary hover:text-secondary transition-all"
                    >
                       <Plus size={16} />
                    </button>
                 </div>
                 
                 <div className="space-y-4">
                    {family.length === 0 ? (
                      <p className="text-xs text-muted italic">No other members yet.</p>
                    ) : family.map((member, i) => (
                      <div key={member.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-card border border-border-dim flex items-center justify-center text-primary group-hover:scale-110 transition-all overflow-hidden">
                               {member.photoURL ? <img src={member.photoURL} className="w-full h-full object-cover" /> : <Users size={16} />}
                            </div>
                            <div>
                               <div className="text-sm font-bold text-white tracking-widest uppercase">{member.name}</div>
                               <div className="text-[10px] text-muted uppercase tracking-widest">{member.role}</div>
                            </div>
                         </div>
                         <div className="text-[10px] text-muted italic">{member.lastActive ? formatDistanceToNow(member.lastActive.toDate()) : 'Active'}</div>
                      </div>
                    ))}
                 </div>
              </div>

              {/* Data Stewardship Info */}
              <div className="p-8 rounded-[40px] border border-border-dim border-dashed">
                 <div className="flex items-center gap-2 mb-4 text-muted">
                    <Shield size={16} />
                    <h3 className="text-[10px] uppercase font-bold tracking-[0.2em]">Data Stewardship</h3>
                 </div>
                 <p className="text-xs text-muted leading-relaxed italic mb-4">You are currently acting as an <span className="text-white font-bold">Observer</span>. Your access ensures Robert's PIM remains secure and accurate while supporting family connection.</p>
                 <button className="text-[10px] text-primary font-bold uppercase tracking-widest hover:underline flex items-center gap-1">Manage Permissions <ChevronRight size={10} /></button>
              </div>
           </div>
        </div>
      </main>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
            <motion.div onClick={() => setShowInviteModal(false)} className="absolute inset-0 bg-secondary/80 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-full max-w-md glass p-10 rounded-[48px] border border-border-dim space-y-8"
            >
              <h2 className="text-3xl font-serif text-white italic">Invite Caregiver</h2>
              <div className="space-y-4">
                 <input 
                  type="email" 
                  placeholder="Email Address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-white/5 border border-border-dim rounded-2xl p-4 text-white focus:outline-none focus:border-primary"
                 />
                 <select 
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full bg-white/5 border border-border-dim rounded-2xl p-4 text-white focus:outline-none focus:border-primary"
                 >
                    <option value="CAREGIVER">Caregiver</option>
                    <option value="STEWARD">Legacy Steward</option>
                    <option value="OBSERVER">Observer</option>
                 </select>
              </div>
              <button 
                onClick={handleInvite}
                className="w-full py-4 bg-primary text-secondary rounded-2xl font-bold font-sans uppercase tracking-[0.2em]"
              >
                 Send Invitation
              </button>
            </motion.div>
          </div>
        )}

        {showSubmitModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
            <motion.div onClick={() => setShowSubmitModal(false)} className="absolute inset-0 bg-secondary/80 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-full max-w-2xl glass p-12 rounded-[56px] border border-border-dim space-y-8"
            >
              <h2 className="text-4xl font-serif text-white italic">Share a Memory</h2>
              <div className="space-y-6">
                 <textarea 
                  value={newMemory}
                  onChange={(e) => setNewMemory(e.target.value)}
                  placeholder="Describe the memory in detail..."
                  className="w-full h-40 bg-white/5 border border-border-dim rounded-3xl p-6 text-xl font-serif text-white focus:outline-none focus:border-primary resize-none"
                 />
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-border-dim flex items-center gap-3">
                       <Camera size={20} className="text-muted" />
                       <span className="text-xs text-muted font-bold uppercase">Add Photo</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-border-dim flex items-center gap-3">
                       <Heart size={20} className="text-primary" />
                       <select 
                        value={newRelation} 
                        onChange={(e) => setNewRelation(e.target.value)}
                        className="bg-transparent text-xs font-bold uppercase bg-none focus:outline-none w-full"
                       >
                          <option>Daughter</option>
                          <option>Son</option>
                          <option>Friend</option>
                          <option>Partner</option>
                       </select>
                    </div>
                 </div>
              </div>
              <button 
                onClick={handleSubmitMemory}
                disabled={isSubmitting}
                className="w-full py-5 bg-primary text-secondary rounded-[32px] font-bold font-sans uppercase tracking-[0.2em] flex items-center justify-center gap-2"
              >
                 {isSubmitting ? (
                    <>
                       <Loader2 size={24} className="animate-spin" />
                       Analyzing Resonance...
                    </>
                 ) : (
                    <>
                       <Send size={24} />
                       Submit to Archive
                    </>
                 )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MomentItem({ title, desc, date, author }: any) {
  return (
    <div className="glass p-8 rounded-[40px] border border-border-dim hover:border-primary/30 transition-all group">
       <div className="flex justify-between items-start mb-4">
          <div>
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary mb-3">
                <Sparkles size={12} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Resonance Found</span>
             </div>
             <h4 className="text-2xl font-serif text-white italic group-hover:text-primary transition-all">"{title}"</h4>
          </div>
          <div className="text-right">
             <div className="text-[10px] text-muted uppercase tracking-widest mb-1">{date}</div>
             <div className="text-xs text-primary font-bold italic tracking-wider">— {author}</div>
          </div>
       </div>
       <p className="text-muted leading-relaxed font-serif italic text-lg">{desc}</p>
    </div>
  );
}
