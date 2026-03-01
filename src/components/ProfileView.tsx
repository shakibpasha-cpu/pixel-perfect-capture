
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserCircle, Mail, Phone, MapPin, Lock, Save, ShieldCheck, Eye, EyeOff } from 'lucide-react';

const ProfileView: React.FC = () => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  
  // Password States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [passwordError, setPasswordError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);
      setCurrentEmail(user.email || '');

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setName(data.display_name || '');
          setPhone(data.phone || '');
          setCountry(data.country || '');
          setCity(data.city || '');
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return;
    setIsSaving(true);
    setSuccessMessage('');

    try {
      // Update auth metadata
      await supabase.auth.updateUser({
        data: { display_name: name }
      });

      // Update profile in database
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: name,
          phone,
          country,
          city,
        })
        .eq('id', currentUserId);

      if (error) throw error;

      setSuccessMessage('Profile details updated successfully.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setPasswordError("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setSuccessMessage('');

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccessMessage('Password updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error("Error updating password:", error);
      setPasswordError(error.message || "Failed to update password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* Header */}
      <div className="bg-[#101828] rounded-[48px] p-12 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-1000">
          <UserCircle size={180} />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-[24px] flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/10">
               <UserCircle className="text-blue-400" size={28} />
            </div>
            <h2 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.5em] mb-4 flex items-center gap-2">
              <ShieldCheck className="animate-pulse" size={14} />
              Identity Management
            </h2>
            <h3 className="text-4xl font-black tracking-tighter mb-2 leading-tight">
              My Profile
            </h3>
            <p className="text-slate-400 font-medium text-sm">Manage your personal information and security settings.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Profile Details Form */}
        <div className="bg-white border border-[#eaecf0] rounded-[48px] p-10 shadow-sm">
          <h4 className="text-xl font-black text-[#101828] mb-8 flex items-center gap-3">
            <UserCircle size={20} className="text-slate-400" />
            Personal Details
          </h4>
          
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
              <div className="relative group">
                <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-[#101828] focus:bg-white focus:border-blue-500 outline-none transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="email" 
                  value={currentEmail}
                  disabled
                  className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-bold text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-[#101828] focus:bg-white focus:border-blue-500 outline-none transition-all"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Country</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                  <input 
                    type="text" 
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-[#101828] focus:bg-white focus:border-blue-500 outline-none transition-all"
                    placeholder="USA"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">City</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                  <input 
                    type="text" 
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-[#101828] focus:bg-white focus:border-blue-500 outline-none transition-all"
                    placeholder="New York"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSaving}
              className="w-full py-4 bg-[#101828] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#2160fd] transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70"
            >
              {isSaving ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span> : <Save size={16} />}
              Save Changes
            </button>
          </form>
        </div>

        {/* Security Settings */}
        <div className="bg-white border border-[#eaecf0] rounded-[48px] p-10 shadow-sm flex flex-col">
          <h4 className="text-xl font-black text-[#101828] mb-8 flex items-center gap-3">
            <Lock size={20} className="text-slate-400" />
            Security & Password
          </h4>

          <form onSubmit={handleChangePassword} className="space-y-6 flex-1">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-rose-500 transition-colors" />
                <input 
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-[#101828] focus:bg-white focus:border-rose-500 outline-none transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirm Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-rose-500 transition-colors" />
                <input 
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-[#101828] focus:bg-white focus:border-rose-500 outline-none transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {passwordError && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700 animate-in slide-in-from-top-2 duration-300">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <p className="text-[11px] font-bold leading-relaxed">{passwordError}</p>
              </div>
            )}

            {successMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 animate-in slide-in-from-top-2 duration-300">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <p className="text-[11px] font-bold leading-relaxed">{successMessage}</p>
              </div>
            )}

            <div className="mt-auto pt-6">
              <button 
                type="submit"
                disabled={isChangingPassword || !newPassword}
                className="w-full py-4 bg-white border border-[#eaecf0] text-rose-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-50 hover:border-rose-200 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChangingPassword ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-rose-600 border-t-transparent"></span> : <Lock size={16} />}
                Update Password
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
