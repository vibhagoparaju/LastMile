/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auth } from './lib/firebase';
import { AnimatePresence, motion } from 'motion/react';

// Pages
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import CaptureSession from './pages/CaptureSession';
import BridgeSession from './pages/BridgeSession';
import FamilyPortal from './pages/FamilyPortal';
import ConsentPage from './pages/ConsentPage';
import PimExplorer from './pages/PimExplorer';
import SessionHistory from './pages/SessionHistory';
import BiometricSetup from './pages/BiometricSetup';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-secondary">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-primary font-serif text-2xl italic"
        >
          Crystalizing narrative archive...
        </motion.div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<LandingPage user={user} />} />
            <Route path="/consent" element={<ConsentPage />} />
            <Route path="/consent/manage" element={<ConsentPage />} /> {/* Simplification for now */}
            <Route path="/dashboard" element={<Dashboard user={user} />} />
            <Route path="/capture" element={<CaptureSession user={user} />} />
            <Route path="/bridge" element={<BridgeSession user={user} />} />
            <Route path="/family" element={<FamilyPortal user={user} />} />
            <Route path="/pim" element={<PimExplorer user={user} />} />
            <Route path="/history" element={<SessionHistory user={user} />} />
            <Route path="/biometrics" element={<BiometricSetup user={user} />} />
          </Routes>
        </AnimatePresence>
      </div>
    </Router>
  );
}
