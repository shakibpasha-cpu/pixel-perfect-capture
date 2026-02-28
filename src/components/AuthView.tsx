
import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  updateProfile,
  signOut
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

type AuthMode = 'signin' | 'signup' | 'forgot' | 'verify';

interface AuthViewProps {
  onDemoLogin?: () => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onDemoLogin }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // New Sign Up Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [verifyEmailAddress, setVerifyEmailAddress] = useState('');

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleNetworkError = () => {
    setError("Network/Configuration issue detected. Entering Demo Mode...");
    setTimeout(() => {
      onDemoLogin?.();
    }, 1500);
  };

  const createUserDocument = async (user: any, additionalData: any = {}) => {
    try {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || additionalData.name || 'User',
        role: 'user', // Default role
        isSuspended: false,
        registeredAt: new Date().toISOString(),
        ...additionalData
      }, { merge: true });
    } catch (e) {
      console.error("Error creating user document:", e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (userCredential.user) {
          await updateProfile(userCredential.user, { displayName: name });
          
          // Create User Doc in Firestore for Admin Management
          await createUserDocument(userCredential.user, { name, phone, country, city });

          // Send verification email
          await sendEmailVerification(userCredential.user);
          
          // Sign out immediately as per requirement "do not sign in automatically"
          await signOut(auth);
          
          setVerifyEmailAddress(email);
          setMode('verify');
        }
      } else if (mode === 'signin') {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Check if email is verified
        if (!userCredential.user.emailVerified) {
          setVerifyEmailAddress(userCredential.user.email || email);
          await signOut(auth); // Block access
          setMode('verify');
          setIsLoading(false);
          return;
        }
      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setSuccess("Reset link dispatched. Please check your inbox.");
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/network-request-failed') {
        handleNetworkError();
        return;
      }
      if (mode === 'signup' && err.code === 'auth/email-already-in-use') {
        setError("User already exists. Please sign in");
      } else if (mode === 'signin' && (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password')) {
        setError("Email or password is incorrect");
      } else {
        setError(err.message || "An authentication error occurred");
      }
    } finally {
      if (error !== "Network/Configuration issue detected. Entering Demo Mode...") {
        setIsLoading(false);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    resetMessages();
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // Ensure user doc exists
      await createUserDocument(result.user);

      // Social providers usually verify emails, but we check anyway to be safe
      if (!result.user.emailVerified) {
        setVerifyEmailAddress(result.user.email || '');
        await signOut(auth);
        setMode('verify');
      }
    } catch (err: any) {
      if (err.code === 'auth/network-request-failed') {
        handleNetworkError();
      } else {
        setError(err.message);
      }
    } finally {
      if (error !== "Network/Configuration issue detected. Entering Demo Mode...") {
        setIsLoading(false);
      }
    }
  };

  const handleAppleSignIn = async () => {
    resetMessages();
    setIsLoading(true);
    const provider = new OAuthProvider('apple.com');
    try {
      const result = await signInWithPopup(auth, provider);
      await createUserDocument(result.user);

      if (!result.user.emailVerified) {
        setVerifyEmailAddress(result.user.email || '');
        await signOut(auth);
        setMode('verify');
      }
    } catch (err: any) {
      if (err.code === 'auth/network-request-failed') {
        handleNetworkError();
      } else {
        setError(err.message);
      }
    } finally {
      if (error !== "Network/Configuration issue detected. Entering Demo Mode...") {
        setIsLoading(false);
      }
    }
  };

  const inputStyles = "w-full pl-12 pr-12 py-4 bg-[#f9fafb] border border-[#eaecf0] rounded-2xl text-[14px] font-bold text-[#101828] focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-[#2160fd] outline-none transition-all";
  const labelStyles = "text-[11px] font-black text-[#475467] uppercase tracking-[0.2em] px-1";

  if (mode === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcfcfd] p-6 relative overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-blue-50 rounded-full blur-[140px] opacity-60"></div>
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-indigo-50 rounded-full blur-[140px] opacity-60"></div>

        <div className="w-full max-w-[500px] bg-white border border-[#eaecf0] rounded-[48px] shadow-[0_32px_64px_-16px_rgba(16,24,40,0.12)] p-12 relative z-10 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[28px] flex items-center justify-center mx-auto mb-8 shadow-inner">
            <i className="fas fa-envelope-circle-check text-3xl"></i>
          </div>
          <h1 className="text-3xl font-black text-[#101828] tracking-tighter mb-4">Check Your Inbox</h1>
          <p className="text-[#475467] text-[15px] font-medium leading-relaxed mb-10">
            We have sent you a verification email to <span className="font-black text-[#101828]">{verifyEmailAddress}</span>. Please verify it and log in.
          </p>
          <button
            onClick={() => { setMode('signin'); resetMessages(); }}
            className="w-full py-5 bg-[#101828] text-white rounded-[24px] font-black text-[12px] uppercase tracking-[0.25em] shadow-2xl hover:bg-[#2160fd] transition-all flex items-center justify-center gap-4 group"
          >
            Return to Login <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfcfd] p-6 relative overflow-hidden">
      {/* Cinematic Background */}
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-blue-50 rounded-full blur-[140px] opacity-60"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-indigo-50 rounded-full blur-[140px] opacity-60"></div>

      <div className="w-full max-w-[500px] bg-white border border-[#eaecf0] rounded-[48px] shadow-[0_32px_64px_-16px_rgba(16,24,40,0.12)] p-10 md:p-12 relative z-10 transition-all duration-500">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-[#101828] to-[#2160fd] rounded-2xl flex items-center justify-center text-white shadow-2xl mb-6 transform hover:scale-105 transition-transform duration-500">
            <i className="fas fa-rocket-launch text-2xl"></i>
          </div>
          <h1 className="text-3xl font-black text-[#101828] tracking-tighter mb-2">
            {mode === 'signin' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Recover Access'}
          </h1>
          <p className="text-[#667085] text-sm font-bold opacity-60 text-center">
            {mode === 'signin' ? 'Sign in to access your intelligence dashboard' : mode === 'signup' ? 'Join companiesGenius Pro to start generating leads' : 'Enter your email to receive a secure reset link'}
          </p>
        </div>

        {/* Social Authentication Suite */}
        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button 
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="flex items-center justify-center gap-3 py-4 px-4 bg-white border border-[#eaecf0] rounded-2xl hover:bg-slate-50 hover:border-blue-200 transition-all group active:scale-95 disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 group-hover:scale-110 transition-transform" alt="Google" />
              <span className="text-[11px] font-black uppercase tracking-widest text-[#344054]">Google</span>
            </button>
            <button 
              onClick={handleAppleSignIn}
              disabled={isLoading}
              className="flex items-center justify-center gap-3 py-4 px-4 bg-[#101828] border border-[#101828] rounded-2xl hover:bg-black transition-all group active:scale-95 disabled:opacity-50"
            >
              <i className="fab fa-apple text-white text-xl group-hover:scale-110 transition-transform"></i>
              <span className="text-[11px] font-black uppercase tracking-widest text-white">Apple</span>
            </button>
          </div>
        )}

        {mode !== 'forgot' && (
          <div className="relative flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-[#eaecf0]"></div>
            <span className="text-[9px] font-black text-[#98a2b3] uppercase tracking-[0.3em]">Or use credentials</span>
            <div className="flex-1 h-px bg-[#eaecf0]"></div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500 max-h-[60vh] overflow-y-auto px-1 no-scrollbar">
          {mode === 'signup' && (
            <>
              <div className="space-y-2">
                <label className={labelStyles}>Full Name</label>
                <div className="relative group">
                  <i className="fas fa-user absolute left-5 top-1/2 -translate-y-1/2 text-[#98a2b3] group-focus-within:text-[#2160fd] transition-colors"></i>
                  <input 
                    type="text" 
                    required
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputStyles}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelStyles}>Phone Number</label>
                <div className="relative group">
                  <i className="fas fa-phone absolute left-5 top-1/2 -translate-y-1/2 text-[#98a2b3] group-focus-within:text-[#2160fd] transition-colors"></i>
                  <input 
                    type="tel" 
                    required
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputStyles}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={labelStyles}>Country</label>
                  <div className="relative group">
                    <i className="fas fa-globe absolute left-5 top-1/2 -translate-y-1/2 text-[#98a2b3] group-focus-within:text-[#2160fd] transition-colors"></i>
                    <input 
                      type="text" 
                      required
                      placeholder="USA"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className={inputStyles}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">City</label>
                  <div className="relative group">
                    <i className="fas fa-city absolute left-5 top-1/2 -translate-y-1/2 text-[#98a2b3] group-focus-within:text-[#2160fd] transition-colors"></i>
                    <input 
                      type="text" 
                      required
                      placeholder="New York"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className={inputStyles}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className={labelStyles}>Executive Email</label>
            <div className="relative group">
              <i className="fas fa-envelope absolute left-5 top-1/2 -translate-y-1/2 text-[#98a2b3] group-focus-within:text-[#2160fd] transition-colors"></i>
              <input 
                type="email" 
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputStyles}
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className={labelStyles}>Password</label>
                {mode === 'signin' && (
                  <button 
                    type="button"
                    onClick={() => { setMode('forgot'); resetMessages(); }}
                    className="text-[10px] font-black text-[#2160fd] uppercase tracking-widest hover:text-[#101828] transition-colors"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative group">
                <i className="fas fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-[#98a2b3] group-focus-within:text-[#2160fd] transition-colors"></i>
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputStyles}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-[#98a2b3] hover:text-[#2160fd] transition-colors"
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700 animate-in slide-in-from-top-2 duration-300">
              <i className="fas fa-circle-exclamation text-sm shrink-0"></i>
              <p className="text-[11px] font-bold leading-relaxed">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 animate-in slide-in-from-top-2 duration-300">
              <i className="fas fa-circle-check text-sm shrink-0"></i>
              <p className="text-[11px] font-bold leading-relaxed">{success}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-5 bg-[#101828] text-white rounded-[24px] font-black text-[12px] uppercase tracking-[0.25em] shadow-2xl hover:bg-[#2160fd] hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed group mt-2"
          >
            {isLoading ? (
              <i className="fas fa-spinner animate-spin"></i>
            ) : (
              <>{mode === 'signin' ? 'Access Platform' : mode === 'signup' ? 'Initialize Account' : 'Send Reset Link'} <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i></>
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-[#f2f4f7] text-center">
          <p className="text-[#667085] text-xs font-bold">
            {mode === 'signin' ? "Don't have an account yet?" : mode === 'signup' ? "Already a member?" : "Remembered your password?"}
            <button 
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                resetMessages();
              }}
              className="ml-2 text-[#2160fd] hover:text-[#101828] transition-colors underline decoration-blue-100 underline-offset-4"
            >
              {mode === 'signin' ? 'Create one for free' : 'Sign in here'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
