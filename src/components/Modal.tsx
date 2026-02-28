
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit: () => void;
  submitLabel: string;
  isLoading?: boolean;
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, onClose, title, children, onSubmit, submitLabel, isLoading 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-[#101828]/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative w-full max-w-[480px] bg-white border border-[#eaecf0] rounded-[48px] shadow-[0_32px_64px_-16px_rgba(16,24,40,0.12)] p-10 flex flex-col animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-black text-[#101828] tracking-tighter uppercase">{title}</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-colors">
            <i className="fas fa-times text-slate-400"></i>
          </button>
        </div>

        <div className="space-y-6">
          {children}
        </div>

        <div className="mt-10 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 px-6 border border-[#eaecf0] rounded-3xl text-[11px] font-black uppercase tracking-widest text-[#475467] hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onSubmit}
            disabled={isLoading}
            className="flex-[2] py-4 px-6 bg-[#101828] text-white rounded-3xl text-[11px] font-black uppercase tracking-widest hover:bg-[#2160fd] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isLoading ? <i className="fas fa-spinner animate-spin"></i> : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
