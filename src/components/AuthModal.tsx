import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [pendingSignUpData, setPendingSignUpData] = useState<any>(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = useState('');

  React.useEffect(() => {
    if (showOtpPopup) {
      const timer = setTimeout(() => {
        setOtp(generatedOtp.split(''));
      }, 15000);
      return () => clearTimeout(timer);
    } else {
      setOtp(['', '', '', '', '', '']);
      setGeneratedOtp('');
    }
  }, [showOtpPopup, generatedOtp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (!isLogin && !email.toLowerCase().endsWith('@gmail.com')) {
      setError('Invalid email');
      return;
    }
    if (!isLogin && !email) {
      setError('Email is required for sign up');
      return;
    }
    if (pin.length < 8 || !/^\d+$/.test(pin)) {
      setError('PIN must be 8 digits');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Find email by username
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username.toLowerCase()));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          throw new Error('auth/invalid-credential');
        }

        const userData = snapshot.docs[0].data();
        const userId = snapshot.docs[0].id;
        
        // Brute-force protection
        if (userData.lockoutUntil && new Date() < new Date(userData.lockoutUntil)) {
          throw new Error('Account locked. Try again in 5 hours.');
        }

        let loginEmail = userData.email || `${username.toLowerCase()}@unitrack.app`;
        
        try {
          await signInWithEmailAndPassword(auth, loginEmail, pin);
          // Reset attempts on success
          await updateDoc(doc(db, 'users', userId), {
              failedAttempts: 0,
              lockoutUntil: null
          });
          onClose();
        } catch (err: any) {
          throw err;
        }
      } else {
        // Check if username exists
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username.toLowerCase()));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          setError('Username already taken');
          setLoading(false);
          return;
        }

        // Set up OTP flow
        const generated = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(generated);
        setPendingSignUpData({ email, username, pin });
        setShowOtpPopup(true);
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Full Auth Error:', err);
      console.error('Error Code:', err.code);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid username or PIN');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email is already registered. Please try logging in.');
        setIsLogin(true);
        setTimeout(() => setError(''), 3000);
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please wait a while before trying again.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('FIREBASE_SETUP_REQUIRED');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network connection error. Please check your connection and try again.');
      } else {
        setError(`Authentication failed: ${err.message || 'Please try again.'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    setLoading(true);
    try {
        const { email, username, pin } = pendingSignUpData;
        const userCredential = await createUserWithEmailAndPassword(auth, email, pin);

        await setDoc(doc(db, 'users', userCredential.user.uid), {
            id: userCredential.user.uid,
            username: username.toLowerCase(),
            email: email,
            role: 'Student',
            usernameChanged: false,
            createdAt: new Date().toISOString(),
            failedAttempts: 0,
            lockoutUntil: null
        });
        setShowOtpPopup(false);
        onClose();
    } catch(err: any) {
        console.error('OTP verify error:', err);
        setError('OTP verification failed: ' + err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <AnimatePresence>
        {showOtpPopup && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                    <h3 className="text-xl font-bold text-white mb-4">OTP Verification</h3>
                    <p className="text-slate-400 mb-6 text-sm">Please verify your account. Waiting for auto-fill...</p>
                    <div className="flex gap-2 justify-center mb-6">
                        {otp.map((digit, i) => (
                            <input
                                key={i}
                                type="text"
                                maxLength={1}
                                value={digit}
                                readOnly
                                className="w-10 h-12 bg-slate-950 border border-slate-800 text-white text-center text-xl rounded-lg font-mono focus:outline-none focus:border-sky-500"
                            />
                        ))}
                    </div>
                    <button
                        onClick={handleOtpVerify}
                        disabled={loading || otp.join('').length < 6}
                        className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : 'Verify'}
                    </button>
                </div>
            </motion.div>
        )}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </h2>
            
            {error === 'FIREBASE_SETUP_REQUIRED' ? (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6 text-sm text-center flex flex-col gap-2">
                <p className="font-bold text-white">Action Required: Enable Email/Password Auth</p>
                <p>You must enable the Email/Password provider in your Firebase Console to use this feature.</p>
                <a 
                  href="https://console.firebase.google.com/project/ssc22-4f7ae/authentication/providers" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded mt-2 transition-colors inline-block"
                >
                  Open Firebase Console
                </a>
              </div>
            ) : error ? (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-6 text-sm text-center">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_ ]/g, '').slice(0, 21))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-sky-500 transition-colors"
                  placeholder="Enter username"
                  maxLength={21}
                  required
                />
              </div>
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-sky-500 transition-colors"
                    placeholder="Enter email address"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">8-Digit PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-sky-500 transition-colors tracking-[0.5em] font-mono text-lg"
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Sign In' : 'Sign Up')}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); setUsername(''); setPin(''); }}
                className="text-slate-400 hover:text-white transition-colors text-sm"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
