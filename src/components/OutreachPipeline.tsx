
import React, { useState, useMemo } from 'react';
import { Lead } from '../types';
import Modal from './Modal';

interface OutreachPipelineProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: Lead['status']) => void;
  onUpdateLead: (lead: Lead) => void;
}

const OutreachPipeline: React.FC<OutreachPipelineProps> = ({ leads, onSelectLead, onStatusChange, onUpdateLead }) => {
  const [activeDatePicker, setActiveDatePicker] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'scheduled'>('all');
  const [viewMode, setViewMode] = useState<'pipeline' | 'calendar'>('pipeline');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Note Modal State
  const [noteModalLead, setNoteModalLead] = useState<Lead | null>(null);
  const [tempNote, setTempNote] = useState('');

  const stages: { status: Lead['status']; label: string; icon: string; color: string }[] = [
    { status: 'new', label: 'Discovered', icon: 'fa-sparkles', color: 'border-blue-500' },
    { status: 'analyzed', label: 'Qualified Intel', icon: 'fa-brain-circuit', color: 'border-emerald-500' },
    { status: 'contacted', label: 'Outreach Active', icon: 'fa-paper-plane', color: 'border-indigo-500' },
    { status: 'qualified', label: 'High Intent', icon: 'fa-trophy', color: 'border-amber-500' },
  ];

  const getLeadsByStatus = (status: Lead['status']) => {
    let baseLeads = leads.filter((l) => l.status === status || (status === 'new' && l.status === 'enriching'));
    if (filterMode === 'scheduled') {
      baseLeads = baseLeads.filter(l => !!l.followUpDate);
    }
    return baseLeads;
  };

  const handleSetReminder = (lead: Lead, date: string) => {
    onUpdateLead({ ...lead, followUpDate: date });
    setActiveDatePicker(null);
    
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Reminder Set", {
        body: `Follow-up scheduled with ${lead.name} for ${new Date(date).toLocaleDateString()}.`,
        icon: lead.imageUrl || undefined
      });
    } else if ("Notification" in window && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  };

  const getReminderStatus = (dateString?: string) => {
    if (!dateString) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reminderDate = new Date(dateString);
    reminderDate.setHours(0, 0, 0, 0);

    if (reminderDate < today) return { label: 'Overdue', color: 'text-rose-600 bg-rose-50 border-rose-100', icon: 'fa-calendar-exclamation', urgency: 3 };
    if (reminderDate.getTime() === today.getTime()) return { label: 'Today', color: 'text-amber-600 bg-amber-50 border-amber-100', icon: 'fa-calendar-day', urgency: 2 };
    return { label: new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), color: 'text-blue-600 bg-blue-50 border-blue-100', icon: 'fa-calendar-check', urgency: 1 };
  };

  const overdueLeads = leads.filter(l => {
    const status = getReminderStatus(l.followUpDate);
    return status?.label === 'Overdue';
  });

  const todayLeads = leads.filter(l => {
    const status = getReminderStatus(l.followUpDate);
    return status?.label === 'Today';
  });

  const handleOpenNoteModal = (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    setNoteModalLead(lead);
    setTempNote(lead.notes || '');
  };

  const handleDeleteNote = (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    if (window.confirm('Delete tactical note?')) {
      onUpdateLead({ ...lead, notes: undefined });
    }
  };

  const handleSaveNote = () => {
    if (noteModalLead) {
      onUpdateLead({
        ...noteModalLead,
        notes: tempNote
      });
      setNoteModalLead(null);
    }
  };

  // Calendar Helpers
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    const prevPadding = firstDay.getDay();
    for (let i = prevPadding - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    const nextPadding = 42 - days.length;
    for (let i = 1; i <= nextPadding; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    return days;
  }, [currentMonth]);

  const navigateMonth = (direction: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1));
  };

  function getAvatarHexColor(name: string) {
    const hexColors = ['#2160fd', '#7f56d9', '#f04438', '#12b76a', '#f79009', '#0ea5e9'];
    let hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    return hexColors[hash % hexColors.length];
  }

  function getNextStatus(current: Lead['status']): Lead['status'] {
    const order: Lead['status'][] = ['new', 'analyzed', 'contacted', 'qualified'];
    const idx = order.indexOf(current === 'enriching' ? 'new' : current);
    return order[Math.min(idx + 1, order.length - 1)];
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-white border border-[#eaecf0] rounded-[24px] shadow-sm flex items-center justify-center">
            <i className="fas fa-arrows-split-up text-[#2160fd] text-2xl"></i>
          </div>
          <div>
            <h2 className="text-[11px] font-black text-[#2160fd] uppercase tracking-[0.5em] mb-2 flex items-center gap-2">
              <i className="fas fa-radar"></i>
              Sales Velocity Hub
            </h2>
            <h3 className="text-3xl font-black text-[#101828] tracking-tighter">Engagement Pipeline</h3>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
             <button 
               onClick={() => setViewMode('pipeline')}
               className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'pipeline' ? 'bg-white text-[#2160fd] shadow-md' : 'text-slate-500'}`}
             >
               <i className="fas fa-columns-3"></i>
               Pipeline
             </button>
             <button 
               onClick={() => setViewMode('calendar')}
               className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'calendar' ? 'bg-white text-[#2160fd] shadow-md' : 'text-slate-500'}`}
             >
               <i className="fas fa-calendar-alt"></i>
               Calendar
             </button>
          </div>

          <div className="w-px h-8 bg-slate-200 mx-2"></div>

           <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
             <button 
               onClick={() => setFilterMode('all')}
               className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterMode === 'all' ? 'bg-white text-[#2160fd] shadow-md' : 'text-slate-500'}`}
             >
               All
             </button>
             <button 
               onClick={() => setFilterMode('scheduled')}
               className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterMode === 'scheduled' ? 'bg-white text-[#2160fd] shadow-md' : 'text-slate-500'}`}
             >
               Reminders
             </button>
           </div>
        </div>
      </div>

      {/* Notification Center */}
      {(overdueLeads.length > 0 || todayLeads.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-500">
          {overdueLeads.length > 0 && (
            <div className="bg-rose-600 text-white rounded-[28px] p-6 shadow-xl shadow-rose-200 flex items-center justify-between border-b-4 border-rose-800">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-xl">
                  <i className="fas fa-calendar-exclamation animate-pulse"></i>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Action Required</p>
                  <p className="text-lg font-black">{overdueLeads.length} Overdue Follow-ups</p>
                </div>
              </div>
              <button 
                onClick={() => { setViewMode('pipeline'); setFilterMode('scheduled'); }}
                className="px-6 py-2.5 bg-white text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-colors"
              >
                Fix Now
              </button>
            </div>
          )}
          {todayLeads.length > 0 && (
            <div className="bg-[#101828] text-white rounded-[28px] p-6 shadow-xl flex items-center justify-between border-b-4 border-slate-800">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-lg">
                  <i className="fas fa-calendar-day"></i>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Daily Focus</p>
                  <p className="text-lg font-black">{todayLeads.length} Leads for Today</p>
                </div>
              </div>
              <button 
                onClick={() => { setViewMode('pipeline'); setFilterMode('scheduled'); }}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors"
              >
                View
              </button>
            </div>
          )}
        </div>
      )}

      {viewMode === 'calendar' ? (
        <div className="bg-white border border-slate-200 rounded-[48px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-700">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-6">
              <h4 className="text-2xl font-black text-[#101828] tracking-tighter">
                {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </h4>
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                <button 
                  onClick={() => navigateMonth(-1)}
                  className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 transition-all"
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <button 
                  onClick={() => setCurrentMonth(new Date())}
                  className="px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-[#2160fd] hover:bg-blue-50 rounded-lg transition-all"
                >
                  Today
                </button>
                <button 
                  onClick={() => navigateMonth(1)}
                  className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 transition-all"
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 border-collapse">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/30 border-b border-r border-slate-100 last:border-r-0">
                {day}
              </div>
            ))}
            {calendarDays.map((dayObj, i) => {
              const dayStr = dayObj.date.toISOString().split('T')[0];
              const dayLeads = leads.filter(l => l.followUpDate === dayStr);
              const isToday = new Date().toISOString().split('T')[0] === dayStr;
              
              return (
                <div 
                  key={i} 
                  className={`min-h-[140px] p-4 border-b border-r border-slate-100 last:border-r-0 transition-colors hover:bg-slate-50/50 ${!dayObj.isCurrentMonth ? 'bg-slate-50/20' : ''}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className={`text-xs font-black ${isToday ? 'w-7 h-7 bg-[#2160fd] text-white rounded-full flex items-center justify-center shadow-lg' : dayObj.isCurrentMonth ? 'text-slate-700' : 'text-slate-300'}`}>
                      {dayObj.date.getDate()}
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-[100px] overflow-y-auto no-scrollbar">
                    {dayLeads.map(lead => {
                      const reminder = getReminderStatus(lead.followUpDate);
                      const urgencyColor = reminder?.urgency === 3 ? 'bg-rose-50 text-rose-700 border-rose-100' : reminder?.urgency === 2 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-blue-50 text-blue-700 border-blue-100';
                      
                      return (
                        <div 
                          key={lead.id}
                          onClick={() => onSelectLead(lead)}
                          className={`px-2 py-1.5 rounded-lg border text-[9px] font-bold truncate cursor-pointer transition-all hover:translate-x-1 ${urgencyColor}`}
                        >
                          <i className={`fas ${reminder?.urgency === 3 ? 'fa-triangle-exclamation' : 'fa-user'} mr-1.5 opacity-60 text-[8px]`}></i>
                          {lead.name}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-[600px]">
          {stages.map((stage) => {
            const stageLeads = getLeadsByStatus(stage.status);
            return (
              <div key={stage.status} className="flex flex-col gap-5">
                <div className={`p-4 bg-white border-t-4 ${stage.color} rounded-2xl shadow-sm flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <i className={`fas ${stage.icon} text-slate-400 text-xs`}></i>
                    <span className="text-[11px] font-black text-[#101828] uppercase tracking-widest">{stage.label}</span>
                  </div>
                  <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">{stageLeads.length}</span>
                </div>

                <div className="flex-1 space-y-4 bg-slate-50/50 rounded-[32px] p-4 border border-dashed border-slate-200 min-h-[500px]">
                  {stageLeads.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-30 grayscale">
                      <i className={`fas ${stage.icon} text-3xl mb-4`}></i>
                      <p className="text-[9px] font-black uppercase tracking-widest">{filterMode === 'scheduled' ? 'No Reminders' : 'Stage Empty'}</p>
                    </div>
                  ) : (
                    stageLeads.map((lead) => {
                      const reminder = getReminderStatus(lead.followUpDate);
                      
                      return (
                        <div 
                          key={lead.id}
                          onClick={() => onSelectLead(lead)}
                          className={`group bg-white p-5 rounded-[24px] border shadow-sm hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer relative overflow-hidden active:scale-[0.98] ${reminder?.urgency === 3 ? 'border-rose-100 ring-1 ring-rose-50' : 'border-slate-200'}`}
                        >
                          {reminder?.urgency === 3 && (
                            <div className="absolute top-0 right-0 p-2 opacity-20">
                              <i className="fas fa-triangle-exclamation text-rose-600 text-4xl -rotate-12"></i>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-md" style={{ backgroundColor: getAvatarHexColor(lead.name) }}>
                                {lead.name[0].toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-[13px] font-black text-[#101828] truncate leading-tight group-hover:text-blue-600">{lead.name}</h4>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{lead.industry}</p>
                              </div>
                            </div>
                          </div>

                          {reminder && (
                            <div className={`mb-3 px-3 py-1.5 rounded-xl border flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ${reminder.color}`}>
                              <i className={`fas ${reminder.icon} ${reminder.urgency === 3 ? 'animate-pulse' : ''}`}></i>
                              {reminder.label}
                            </div>
                          )}

                          {/* DEDICATED NOTES SECTION - WRITABLE/EDITABLE/DELETEABLE */}
                          <div 
                            className="mb-4 group/note relative"
                            onClick={(e) => e.stopPropagation()}
                          >
                             {lead.notes ? (
                               <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl relative">
                                  <div className="flex items-center justify-between mb-1.5">
                                     <span className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.1em]">Tactical Note</span>
                                     <div className="flex items-center gap-2 opacity-0 group-hover/note:opacity-100 transition-opacity">
                                        <button 
                                          onClick={(e) => handleOpenNoteModal(e, lead)}
                                          className="text-[10px] text-indigo-600 hover:text-indigo-800"
                                          title="Edit Note"
                                        >
                                           <i className="fas fa-edit"></i>
                                        </button>
                                        <button 
                                          onClick={(e) => handleDeleteNote(e, lead)}
                                          className="text-[10px] text-rose-500 hover:text-rose-700"
                                          title="Delete Note"
                                        >
                                           <i className="fas fa-trash-alt"></i>
                                        </button>
                                     </div>
                                  </div>
                                  <p className="text-[11px] font-bold text-indigo-700 leading-relaxed line-clamp-3 italic">
                                    "{lead.notes}"
                                  </p>
                               </div>
                             ) : (
                               <button 
                                 onClick={(e) => handleOpenNoteModal(e, lead)}
                                 className="w-full py-2.5 border border-dashed border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 transition-all flex items-center justify-center gap-2"
                               >
                                  <i className="fas fa-plus-circle"></i>
                                  Add Tactical Note
                               </button>
                             )}
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {lead.phone && <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px]" title={lead.phone}><i className="fas fa-phone"></i></div>}
                            {lead.email && <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px]" title={lead.email}><i className="fas fa-at"></i></div>}
                            {lead.website && <div className="p-1.5 bg-slate-50 text-slate-600 rounded-lg text-[10px]" title={lead.website}><i className="fas fa-globe"></i></div>}
                          </div>

                          <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               <div className="relative">
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); setActiveDatePicker(activeDatePicker === lead.id ? null : lead.id); }}
                                   className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${lead.followUpDate ? 'bg-[#101828] text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600'}`}
                                   title="Set Follow-up Reminder"
                                 >
                                   <i className="fas fa-calendar-plus text-xs"></i>
                                 </button>
                                 {activeDatePicker === lead.id && (
                                   <div 
                                     className="absolute bottom-full left-0 mb-2 z-20 bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 animate-in slide-in-from-bottom-2 w-[220px]"
                                     onClick={(e) => e.stopPropagation()}
                                   >
                                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Schedule Follow-up</p>
                                     <input 
                                       type="date" 
                                       className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-blue-500 mb-3"
                                       onChange={(e) => handleSetReminder(lead, e.target.value)}
                                       value={lead.followUpDate || ''}
                                     />
                                     <button 
                                       onClick={() => { onUpdateLead({ ...lead, followUpDate: undefined }); setActiveDatePicker(null); }}
                                       className="w-full py-2.5 bg-rose-50 text-rose-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors"
                                     >
                                       Remove Schedule
                                     </button>
                                   </div>
                                 )}
                               </div>
                             </div>
                             <div className="flex items-center gap-1">
                                {stage.status !== 'new' && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); onStatusChange(lead.id, 'new'); }}
                                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
                                    title="Move back to discovery"
                                  >
                                    <i className="fas fa-arrow-left text-[10px]"></i>
                                  </button>
                                )}
                                {stage.status !== 'qualified' && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); onStatusChange(lead.id, getNextStatus(stage.status)); }}
                                    className="px-4 py-2 bg-[#101828] text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 shadow-sm"
                                  >
                                    Advance
                                    <i className="fas fa-chevron-right text-[7px]"></i>
                                  </button>
                                )}
                             </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REFINED NOTE MODAL */}
      {noteModalLead && (
        <Modal 
          isOpen={!!noteModalLead} 
          onClose={() => setNoteModalLead(null)} 
          title="Tactical Note" 
          submitLabel="Save Note" 
          onSubmit={handleSaveNote}
        >
          <div className="space-y-4">
             <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white text-blue-600 shadow-sm font-black text-xs">
                   {noteModalLead.name[0].toUpperCase()}
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Account</p>
                   <p className="text-sm font-bold text-[#101828]">{noteModalLead.name}</p>
                </div>
             </div>
             <textarea 
               className="w-full px-6 py-5 bg-[#f9fafb] border border-[#eaecf0] rounded-3xl font-medium outline-none h-40 resize-none leading-relaxed focus:bg-white focus:border-blue-600 transition-all"
               placeholder="Record tactical intelligence, meeting outcomes, or relationship context..."
               value={tempNote}
               onChange={e => setTempNote(e.target.value)}
               autoFocus
             />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default OutreachPipeline;
