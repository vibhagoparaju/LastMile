import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, History, MessageSquare, ArrowRight, ShieldCheck, Heart } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';

export default function LandingPage({ user }: { user: any }) {
  const navigate = useNavigate();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if profile exists, if not create basic one
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          name: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          stage: 'PLANNER',
          createdAt: serverTimestamp(),
          lastActive: serverTimestamp()
        });
        navigate('/consent');
      } else {
        await setDoc(userRef, { lastActive: serverTimestamp() }, { merge: true });
        navigate('/dashboard');
      }
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary overflow-hidden selection:bg-primary/30">
      {/* Hero Section */}
      <section className="relative px-8 pt-32 pb-24 md:pt-48 md:pb-40">
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
               <Sparkles size={16} />
               <span className="text-xs font-bold uppercase tracking-[0.2em]">Live real-time preservation</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-serif text-primary leading-[0.85] mb-8 tracking-tighter">
              Identity doesn't <br />
              <span className="italic text-white">have to end.</span>
            </h1>
            
            <p className="text-muted text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed mb-12 font-serif font-light">
              LastMile Memory captures your voice, values, and memories to build a Personal Identity Model that supports your family when they need it most.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <button 
                onClick={user ? () => navigate('/dashboard') : handleLogin}
                disabled={isLoggingIn}
                className="group px-10 py-5 bg-primary text-secondary rounded-[32px] font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(229,192,123,0.2)] flex items-center gap-3"
              >
                {user ? "Enter Your Dashboard" : (isLoggingIn ? "Initializing..." : "Preserve My Identity")}
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-all" />
              </button>
              
              <button 
                onClick={() => navigate('/family')}
                className="px-10 py-5 bg-card border border-border-dim text-white rounded-[32px] font-bold text-lg hover:bg-border-dim transition-all"
              >
                Family Invitation
              </button>
            </div>
          </motion.div>
        </div>

        {/* Ambient background elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-[radial-gradient(circle_at_center,rgba(229,192,123,0.05)_0%,transparent_70%)] pointer-events-none" />
      </section>

      {/* Feature Grid */}
      <section className="px-8 py-32 bg-secondary border-t border-border-dim">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            <FeatureCard 
              icon={<MessageSquare size={32} />}
              title="Voice Capture"
              desc="Daily micro-sessions that learn your speech patterns, unique humor, and narrative style."
            />
            <FeatureCard 
              icon={<History size={32} />}
              title="Memory Bridge"
              desc="Real-time session coaching for family members, using prompts derived from your real life details."
            />
            <FeatureCard 
              icon={<ShieldCheck size={32} />}
              title="Identity Model"
              desc="A secure, private personal model (PIM) that preserves your values long after cognitive decline."
            />
          </div>
        </div>
      </section>

      {/* Proof Section */}
      <section className="px-8 py-32 relative">
        <div className="max-w-5xl mx-auto glass p-12 md:p-24 rounded-[64px] border border-border-dim relative overflow-hidden">
           <div className="relative z-10 grid md:grid-cols-2 gap-16 items-center">
              <div>
                 <h2 className="text-4xl md:text-5xl font-serif text-white mb-8 leading-tight">
                    "It's like having a <span className="text-primary italic">lucid conversation</span> on the hardest days."
                 </h2>
                 <p className="text-muted text-lg mb-8 leading-relaxed italic">
                    — Priya, primary caregiver using LastMile for her father.
                 </p>
                 <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                       <Heart size={32} />
                    </div>
                    <div>
                       <div className="font-bold text-white uppercase tracking-widest text-xs">Identity Richness</div>
                       <div className="text-primary font-serif text-2xl italic">Robert - 84.2% Crystalized</div>
                    </div>
                 </div>
              </div>
              <div className="relative">
                 <div className="aspect-square bg-card rounded-[48px] border border-border-dim p-8 flex flex-col justify-end group cursor-default shadow-2xl">
                    <p className="text-2xl font-serif text-primary italic mb-6 leading-snug">" Robert, tell Priya about the time you drove that old Fiat from Chennai to Goa in '87. She's forgotten the ending." </p>
                    <div className="flex justify-between items-center text-muted">
                        <span className="text-xs font-bold uppercase tracking-widest">Resonance Prompt #14</span>
                        <div className="flex gap-1">
                           <div className="w-1 h-4 bg-primary rounded-full animate-bounce" />
                           <div className="w-1 h-6 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                           <div className="w-1 h-3 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-20 border-t border-border-dim">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Sparkles size={20} />
             </div>
             <span className="font-serif text-2xl font-bold text-white tracking-tighter">LastMile <span className="text-primary italic">Memory</span></span>
          </div>
          <div className="text-muted text-sm uppercase tracking-[0.2em]">Refusing to let the story end.</div>
          <div className="flex gap-8 text-muted text-xs font-bold uppercase tracking-widest">
             <a href="#" className="hover:text-primary transition-all">Privacy</a>
             <a href="#" className="hover:text-primary transition-all">Methodology</a>
             <a href="#" className="hover:text-primary transition-all">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: any) {
  return (
    <div className="p-10 rounded-[48px] bg-card border border-border-dim hover:border-primary/30 transition-all group shadow-soft">
      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-primary mb-12 group-hover:scale-110 transition-all border border-border-dim">
        {icon}
      </div>
      <h3 className="text-3xl font-serif text-white mb-6 leading-tight">{title}</h3>
      <p className="text-muted leading-relaxed text-lg font-serif italic">{desc}</p>
    </div>
  );
}
