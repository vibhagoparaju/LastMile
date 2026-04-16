import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Check, AlertCircle, Sparkles } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function ConsentPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consents, setConsents] = useState({
    voiceCapture: true,
    familyAccess: true,
    researchOptIn: false,
    identityPreservation: true
  });

  const handleNext = () => setStep(step + 1);
  
  const handleSubmit = async () => {
    if (!auth.currentUser) return;
    setIsSubmitting(true);
    
    try {
      const consentData = {
        userId: auth.currentUser.uid,
        eventType: 'INITIAL_CONSENT',
        capacityLevel: 'FULL',
        permissions: consents,
        signedHash: await crypto.subtle.digest('SHA-256', new TextEncoder().encode(auth.currentUser.uid + Date.now())).then(b => Array.from(new Uint8Array(b)).map(b => b.toString(16).padStart(2, '0')).join('')),
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, 'users', auth.currentUser.uid, 'consentEvents'), consentData);
      navigate('/dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${auth.currentUser.uid}/consentEvents`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary p-8 flex items-center justify-center font-sans">
      <div className="max-w-xl w-full">
        <div className="flex justify-center mb-12">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
               <ShieldCheck size={32} />
            </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass p-12 rounded-[64px] border border-border-dim shadow-2xl"
            >
              <h1 className="text-4xl font-serif text-white mb-6">Privacy & <span className="text-primary italic">Sovereignty</span></h1>
              <p className="text-muted leading-relaxed mb-8 text-lg font-serif italic">
                LastMile Memory is not a clinical archive. It is a sacred vault of your identity. Your data is encrypted, never sold, and used solely to build your Personal Identity Model.
              </p>

              <div className="space-y-4 mb-10">
                 <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="mt-1 text-primary"><Sparkles size={18}/></div>
                    <div className="text-sm text-muted">You own 100% of your model and its weights.</div>
                 </div>
                 <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="mt-1 text-primary"><AlertCircle size={18}/></div>
                    <div className="text-sm text-muted">Family access can be revoked by you or your steward at any time.</div>
                 </div>
              </div>

              <button 
                onClick={handleNext}
                className="w-full py-5 bg-primary text-secondary rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-soft"
              >
                I Understand my Rights
                <ArrowRight size={20} />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass p-12 rounded-[64px] border border-border-dim shadow-2xl"
            >
              <h1 className="text-4xl font-serif text-white mb-8 italic">Define Access</h1>
              
              <div className="space-y-6 mb-10">
                <ConsentToggle 
                  label="Voice Capture & AI Transcription"
                  desc="Required for building your narrative shell"
                  active={consents.voiceCapture}
                  onClick={() => setConsents({...consents, voiceCapture: !consents.voiceCapture})}
                />
                <ConsentToggle 
                  label="Family Connection (Bridge)"
                  desc="Allow family to interact with your identity model"
                  active={consents.familyAccess}
                  onClick={() => setConsents({...consents, familyAccess: !consents.familyAccess})}
                />
                <ConsentToggle 
                  label="Research Opt-in"
                  desc="Anonymous data used to improve dementia care"
                  active={consents.researchOptIn}
                  onClick={() => setConsents({...consents, researchOptIn: !consents.researchOptIn})}
                />
              </div>

              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-5 bg-primary text-secondary rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-soft"
              >
                {isSubmitting ? "Signing Artifact..." : "Sign & Enter Dashboard"}
                {!isSubmitting && <Check size={20} />}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ConsentToggle({ label, desc, active, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={`p-6 rounded-3xl border transition-all cursor-pointer flex justify-between items-center ${active ? 'bg-primary/5 border-primary/30' : 'bg-card border-border-dim'}`}
    >
      <div>
        <div className={`font-bold transition-all ${active ? 'text-primary' : 'text-white'}`}>{label}</div>
        <div className="text-xs text-muted">{desc}</div>
      </div>
      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${active ? 'bg-primary border-primary text-secondary' : 'border-border-dim text-transparent'}`}>
         <Check size={16} strokeWidth={4} />
      </div>
    </div>
  );
}
