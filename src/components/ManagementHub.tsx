
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Note } from '../types';
import Modal from './Modal';

interface Props {
  userId: string;
}

const ManagementHub: React.FC<Props> = ({ userId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);

  // Modal State
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    noteTitle: '',
    noteContent: ''
  });

  const fetchData = async () => {
    if (!userId) return;
    setIsLoading(true);
    setPermissionError(false);
    
    try {
      const snap = await getDocs(query(collection(db, `users/${userId}/notes`), orderBy('createdAt', 'desc')));
      setNotes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note)));
    } catch (e: any) {
      console.error("Management Hub error:", e);
      if (e.code === 'permission-denied') {
        setPermissionError(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, [userId]);

  const handleCreateNote = async () => {
    if (!formData.noteTitle) return;
    setIsLoading(true);
    try {
      await addDoc(collection(db, `users/${userId}/notes`), {
        title: formData.noteTitle,
        content: formData.noteContent,
        createdAt: new Date().toISOString()
      });
      await fetchData();
      setFormData({ noteTitle: '', noteContent: '' });
      setIsNoteModalOpen(false);
    } catch (e: any) {
      console.error("Note creation error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  if (permissionError) {
    return (
      <div className="bg-white border border-rose-200 rounded-[48px] p-16 shadow-sm text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[28px] flex items-center justify-center mx-auto mb-8">
          <i className="fas fa-shield-exclamation text-3xl"></i>
        </div>
        <h2 className="text-3xl font-black text-[#101828] tracking-tighter mb-4 uppercase">Database Locked</h2>
        <p className="text-[#475467] text-[15px] font-medium mb-10 max-w-lg mx-auto leading-relaxed">
          Please update your <strong>Firestore Security Rules</strong> in the Firebase Console to allow access.
        </p>
        <button 
          onClick={() => fetchData()}
          className="px-10 py-5 bg-[#101828] text-white rounded-[24px] font-black text-[12px] uppercase tracking-[0.25em] hover:bg-[#2160fd] transition-all"
        >
          Check Permissions Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[11px] font-black text-[#2160fd] uppercase tracking-[0.5em] mb-2 flex items-center gap-2">
            <i className="fas fa-note-sticky"></i>
            Knowledge Base
          </h2>
          <h3 className="text-3xl font-black text-[#101828] tracking-tighter">Strategic Notes</h3>
        </div>
        <button 
          onClick={() => setIsNoteModalOpen(true)}
          className="px-10 py-5 bg-[#101828] text-white rounded-[24px] font-black text-[12px] uppercase tracking-widest hover:bg-[#2160fd] transition-all shadow-xl"
        >
          New Strategic Memo
        </button>
      </div>

      <div className="bg-white border border-[#eaecf0] rounded-[48px] p-10 shadow-sm min-h-[400px] relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        )}

        {notes.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-[24px] flex items-center justify-center mb-6 text-slate-300">
              <i className="fas fa-pen-fancy text-2xl"></i>
            </div>
            <h4 className="text-xl font-black text-[#101828] uppercase tracking-tighter">Memo Hub Empty</h4>
            <p className="text-[13px] font-bold text-[#667085] mt-2 opacity-60">Your strategic brainstorms, persisted in the cloud.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notes.map(n => (
              <div key={n.id} className="p-8 bg-white border border-slate-200 rounded-[40px] hover:shadow-2xl transition-all group flex flex-col justify-between h-[240px]">
                <div>
                  <h5 className="text-xl font-black text-[#101828] tracking-tighter uppercase mb-4 line-clamp-1">{n.title}</h5>
                  <p className="text-sm font-medium text-slate-500 line-clamp-3 leading-relaxed">{n.content}</p>
                </div>
                <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{new Date(n.createdAt).toLocaleDateString()}</span>
                  <i className="fas fa-file-signature text-blue-500/20 group-hover:text-blue-500 transition-colors"></i>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal 
        isOpen={isNoteModalOpen} 
        onClose={() => setIsNoteModalOpen(false)} 
        title="New Strategic Memo" 
        submitLabel="Save Note" 
        onSubmit={handleCreateNote}
        isLoading={isLoading}
      >
        <div className="space-y-4">
          <input 
            className="w-full px-6 py-4 bg-[#f9fafb] border border-[#eaecf0] rounded-2xl font-bold outline-none text-lg focus:bg-white focus:border-blue-600 transition-all"
            placeholder="Memo Title"
            value={formData.noteTitle}
            onChange={e => setFormData({ ...formData, noteTitle: e.target.value })}
          />
          <textarea 
            className="w-full px-6 py-5 bg-[#f9fafb] border border-[#eaecf0] rounded-3xl font-medium outline-none h-40 resize-none leading-relaxed focus:bg-white focus:border-blue-600 transition-all"
            placeholder="Detailed tactical notes..."
            value={formData.noteContent}
            onChange={e => setFormData({ ...formData, noteContent: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
};

export default ManagementHub;
