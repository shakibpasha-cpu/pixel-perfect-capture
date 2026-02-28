
import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { UserProfile } from '../types';
import { ShieldAlert, Users, Key, Ban, CheckCircle, Search, RefreshCw } from 'lucide-react';

const SuperAdminView: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [globalKey, setGlobalKey] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const userList: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        userList.push(doc.data() as UserProfile);
      });
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGlobalKey = async () => {
    try {
      const docRef = doc(db, "settings", "global");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setGlobalKey(docSnap.data().apiKey || '');
      }
    } catch (error) {
      console.error("Error fetching global key:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchGlobalKey();
  }, []);

  const toggleSuspension = async (user: UserProfile) => {
    if (!window.confirm(`Are you sure you want to ${user.isSuspended ? 'unsuspend' : 'suspend'} ${user.email}?`)) return;

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        isSuspended: !user.isSuspended
      });
      // Update local state
      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, isSuspended: !u.isSuspended } : u));
    } catch (error) {
      console.error("Error updating suspension:", error);
      alert("Failed to update user status.");
    }
  };

  const handleSaveKey = async () => {
    setIsSavingKey(true);
    try {
      await setDoc(doc(db, "settings", "global"), {
        apiKey: globalKey,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      alert("Global API Key updated successfully.");
    } catch (error) {
      console.error("Error saving key:", error);
      alert("Failed to save API key.");
    } finally {
      setIsSavingKey(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* Header Block */}
      <div className="bg-slate-900 rounded-[48px] p-12 text-white shadow-2xl relative overflow-hidden group border border-slate-800">
        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-1000">
          <ShieldAlert size={180} />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-[24px] flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/10">
               <Users className="text-rose-500" size={28} />
            </div>
            <h2 className="text-[11px] font-black text-rose-500 uppercase tracking-[0.5em] mb-4 flex items-center gap-2">
              <ShieldAlert className="animate-pulse" size={14} />
              High Clearance
            </h2>
            <h3 className="text-4xl font-black tracking-tighter mb-2 leading-tight">
              Super Admin Console
            </h3>
            <p className="text-slate-400 font-medium text-sm">Manage user access, global configurations, and security protocols.</p>
          </div>
          
          <div className="bg-slate-800/50 p-6 rounded-[32px] border border-slate-700/50 backdrop-blur-sm max-w-sm">
             <div className="flex items-center gap-3 mb-4">
                <Key className="text-emerald-400" size={18} />
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">System API Engine</span>
             </div>
             <div className="space-y-3">
               <input 
                 type="password" 
                 value={globalKey}
                 onChange={(e) => setGlobalKey(e.target.value)}
                 placeholder="Enter Google GenAI Key..."
                 className="w-full bg-slate-900 border border-slate-700 text-white text-xs p-3 rounded-xl focus:border-emerald-500 outline-none transition-colors font-mono"
               />
               <button 
                 onClick={handleSaveKey}
                 disabled={isSavingKey}
                 className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
               >
                 {isSavingKey ? 'Securing...' : 'Set Global Key'}
               </button>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#eaecf0] rounded-[48px] p-10 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
           <h3 className="text-xl font-black text-[#101828] flex items-center gap-3">
             <Users size={20} className="text-slate-400" />
             Registered Users ({users.length})
           </h3>
           <div className="flex items-center gap-4">
              <div className="relative group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                 <input 
                   type="text" 
                   placeholder="Search email or name..." 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-blue-500 outline-none transition-all w-64"
                 />
              </div>
              <button 
                onClick={fetchUsers} 
                className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-xl transition-all"
                title="Refresh List"
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">User Identity</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Joining Date</th>
                <th className="text-left py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="text-right py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-slate-400 font-medium">No users found matching query.</td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.uid} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <p className="text-sm font-bold text-[#101828]">{user.displayName || 'No Name'}</p>
                        <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wide ${user.email === 'admin@companiesgenius.com' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                        {user.email === 'admin@companiesgenius.com' ? 'Super Admin' : 'User'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">
                          {user.registeredAt ? new Date(user.registeredAt).toLocaleDateString() : 'N/A'}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">
                          {user.registeredAt ? new Date(user.registeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {user.isSuspended ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                          <Ban size={10} /> Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                          <CheckCircle size={10} /> Active
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {user.email !== 'admin@companiesgenius.com' && (
                        <button
                          onClick={() => toggleSuspension(user)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            user.isSuspended 
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                            : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                          }`}
                        >
                          {user.isSuspended ? 'Reactivate' : 'Suspend'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminView;
