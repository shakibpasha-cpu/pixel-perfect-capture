import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShieldAlert, Users, Key, Ban, CheckCircle, Search, RefreshCw, UserPlus, BarChart3, Calendar, TrendingUp, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  role: string;
  is_suspended: boolean;
}

interface ActivityLog {
  action: string;
  count: number;
  created_at: string;
  user_id: string;
}

type MetricPeriod = 'today' | 'week' | 'month' | 'all' | 'custom';

const SuperAdminView: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [globalKey, setGlobalKey] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Metrics state
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [metricPeriod, setMetricPeriod] = useState<MetricPeriod>('all');
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, display_name, created_at');
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, is_suspended');
      if (rolesError) throw rolesError;

      const userList: AdminUser[] = (profiles || []).map(p => {
        const userRole = roles?.find(r => r.user_id === p.id);
        return {
          id: p.id,
          email: p.email,
          display_name: p.display_name,
          created_at: p.created_at,
          role: userRole?.role || 'user',
          is_suspended: userRole?.is_suspended || false,
        };
      });
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivityLogs = async () => {
    setIsLoadingMetrics(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('action, count, created_at, user_id')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setActivityLogs(data || []);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const fetchGlobalKey = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'global_api_key')
        .single();
      if (!error && data) {
        const val = data.value as any;
        setGlobalKey(val?.apiKey || '');
      }
    } catch (error) {
      console.error("Error fetching global key:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchGlobalKey();
    fetchActivityLogs();
  }, []);

  // Compute metrics based on selected period
  const metrics = useMemo(() => {
    const now = new Date();
    let filterFrom: Date | null = null;
    let filterTo: Date | null = null;

    switch (metricPeriod) {
      case 'today':
        filterFrom = startOfDay(now);
        break;
      case 'week':
        filterFrom = startOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        filterFrom = startOfMonth(now);
        break;
      case 'custom':
        filterFrom = customFrom ? startOfDay(customFrom) : null;
        filterTo = customTo ? new Date(customTo.getTime() + 86400000) : null;
        break;
      case 'all':
      default:
        break;
    }

    const filtered = activityLogs.filter(log => {
      const logDate = new Date(log.created_at);
      if (filterFrom && logDate < filterFrom) return false;
      if (filterTo && logDate > filterTo) return false;
      return true;
    });

    const totalSearches = filtered.filter(l => l.action === 'lead_generated').reduce((sum, l) => sum + l.count, 0);
    const totalEnrichments = filtered.filter(l => l.action === 'lead_enriched').reduce((sum, l) => sum + l.count, 0);
    const totalExports = filtered.filter(l => l.action === 'lead_exported').reduce((sum, l) => sum + l.count, 0);
    const uniqueUsers = new Set(filtered.map(l => l.user_id)).size;

    return { totalSearches, totalEnrichments, totalExports, uniqueUsers, totalActions: filtered.length };
  }, [activityLogs, metricPeriod, customFrom, customTo]);

  // Per-user metrics
  const getUserMetrics = (userId: string) => {
    const userLogs = activityLogs.filter(l => l.user_id === userId);
    return {
      generated: userLogs.filter(l => l.action === 'lead_generated').reduce((s, l) => s + l.count, 0),
      enriched: userLogs.filter(l => l.action === 'lead_enriched').reduce((s, l) => s + l.count, 0),
      exported: userLogs.filter(l => l.action === 'lead_exported').reduce((s, l) => s + l.count, 0),
      total: userLogs.reduce((s, l) => s + l.count, 0),
    };
  };

  const toggleSuspension = async (user: AdminUser) => {
    if (!window.confirm(`Are you sure you want to ${user.is_suspended ? 'unsuspend' : 'suspend'} ${user.email}?`)) return;
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_suspended: !user.is_suspended })
        .eq('user_id', user.id);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_suspended: !u.is_suspended } : u));
    } catch (error) {
      console.error("Error updating suspension:", error);
      alert("Failed to update user status.");
    }
  };

  const handleSaveKey = async () => {
    setIsSavingKey(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'global_api_key',
          value: { apiKey: globalKey, updatedAt: new Date().toISOString() } as any,
        }, { onConflict: 'key' });
      if (error) throw error;
      alert("Global API Key updated successfully.");
    } catch (error) {
      console.error("Error saving key:", error);
      alert("Failed to save API key.");
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword) return alert("Email and password are required.");
    setIsCreatingUser(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ email: newEmail, password: newPassword, display_name: newDisplayName }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create user');
      alert(`User ${newEmail} created successfully!`);
      setNewEmail(''); setNewPassword(''); setNewDisplayName(''); setShowCreateUser(false);
      fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      alert(error.message || "Failed to create user.");
    } finally {
      setIsCreatingUser(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const periodLabels: Record<MetricPeriod, string> = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    all: 'All Time',
    custom: 'Custom Range',
  };

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

      {/* ===== METRICS DASHBOARD ===== */}
      <div className="bg-white border border-[#eaecf0] rounded-[48px] p-10 shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <h3 className="text-xl font-black text-[#101828] flex items-center gap-3">
            <BarChart3 size={20} className="text-blue-500" />
            Activity Metrics
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {(['today', 'week', 'month', 'all', 'custom'] as MetricPeriod[]).map(period => (
              <button
                key={period}
                onClick={() => setMetricPeriod(period)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  metricPeriod === period
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                )}
              >
                {periodLabels[period]}
              </button>
            ))}
            <button
              onClick={fetchActivityLogs}
              className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-xl transition-all"
              title="Refresh Metrics"
            >
              <RefreshCw size={14} className={isLoadingMetrics ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Custom date pickers */}
        {metricPeriod === 'custom' && (
          <div className="flex items-center gap-4 flex-wrap animate-in fade-in duration-300">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-medium text-sm rounded-xl", !customFrom && "text-muted-foreground")}>
                  <Calendar className="mr-2 h-4 w-4" />
                  {customFrom ? format(customFrom, "PPP") : "From date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <span className="text-slate-400 font-bold text-xs">→</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-medium text-sm rounded-xl", !customTo && "text-muted-foreground")}>
                  <Calendar className="mr-2 h-4 w-4" />
                  {customTo ? format(customTo, "PPP") : "To date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker mode="single" selected={customTo} onSelect={setCustomTo} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-100 rounded-[32px] p-8 relative overflow-hidden group/card">
            <div className="absolute -right-4 -top-4 opacity-10 group-hover/card:scale-110 transition-transform">
              <Search size={80} />
            </div>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
              <TrendingUp size={12} /> Total Searches
            </p>
            <p className="text-4xl font-black text-[#101828] tracking-tighter">{metrics.totalSearches.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{periodLabels[metricPeriod]}</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-100 rounded-[32px] p-8 relative overflow-hidden group/card">
            <div className="absolute -right-4 -top-4 opacity-10 group-hover/card:scale-110 transition-transform">
              <Activity size={80} />
            </div>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
              <TrendingUp size={12} /> Enrichments
            </p>
            <p className="text-4xl font-black text-[#101828] tracking-tighter">{metrics.totalEnrichments.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{periodLabels[metricPeriod]}</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-100 rounded-[32px] p-8 relative overflow-hidden group/card">
            <div className="absolute -right-4 -top-4 opacity-10 group-hover/card:scale-110 transition-transform">
              <BarChart3 size={80} />
            </div>
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
              <TrendingUp size={12} /> Exports
            </p>
            <p className="text-4xl font-black text-[#101828] tracking-tighter">{metrics.totalExports.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{periodLabels[metricPeriod]}</p>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100 rounded-[32px] p-8 relative overflow-hidden group/card">
            <div className="absolute -right-4 -top-4 opacity-10 group-hover/card:scale-110 transition-transform">
              <Users size={80} />
            </div>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
              <TrendingUp size={12} /> Active Users
            </p>
            <p className="text-4xl font-black text-[#101828] tracking-tighter">{metrics.uniqueUsers.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{periodLabels[metricPeriod]}</p>
          </div>
        </div>
      </div>

      {/* Create Account Section */}
      <div className="bg-white border border-[#eaecf0] rounded-[48px] p-10 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-[#101828] flex items-center gap-3">
            <UserPlus size={20} className="text-emerald-500" />
            Create New Account
          </h3>
          <button
            onClick={() => setShowCreateUser(!showCreateUser)}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            {showCreateUser ? 'Cancel' : 'New User'}
          </button>
        </div>
        {showCreateUser && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Display Name</label>
              <input type="text" value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} placeholder="John Doe"
                className="w-full bg-slate-50 border border-slate-200 text-sm p-3 rounded-xl focus:border-emerald-500 outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email *</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@example.com"
                className="w-full bg-slate-50 border border-slate-200 text-sm p-3 rounded-xl focus:border-emerald-500 outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Password *</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters"
                className="w-full bg-slate-50 border border-slate-200 text-sm p-3 rounded-xl focus:border-emerald-500 outline-none transition-colors" />
            </div>
            <div className="md:col-span-3">
              <button onClick={handleCreateUser} disabled={isCreatingUser}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50">
                {isCreatingUser ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white border border-[#eaecf0] rounded-[48px] p-10 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
           <h3 className="text-xl font-black text-[#101828] flex items-center gap-3">
             <Users size={20} className="text-slate-400" />
             Registered Users ({users.length})
           </h3>
           <div className="flex items-center gap-4">
              <div className="relative group">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                 <input type="text" placeholder="Search email or name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                   className="pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:bg-white focus:border-blue-500 outline-none transition-all w-64" />
              </div>
              <button onClick={fetchUsers} className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-xl transition-all" title="Refresh List">
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
                <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-400 font-medium">No users found matching query.</td></tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <p className="text-sm font-bold text-[#101828]">{user.display_name || 'No Name'}</p>
                        <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wide ${user.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                        {user.role === 'admin' ? 'Super Admin' : 'User'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{new Date(user.created_at).toLocaleDateString()}</span>
                        <span className="text-[10px] font-medium text-slate-400">{new Date(user.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {user.is_suspended ? (
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
                      {user.role !== 'admin' && (
                        <button onClick={() => toggleSuspension(user)}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            user.is_suspended ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                          }`}>
                          {user.is_suspended ? 'Reactivate' : 'Suspend'}
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
