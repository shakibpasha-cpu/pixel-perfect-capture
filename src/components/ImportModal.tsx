
import React, { useState, useRef } from 'react';
import { Lead } from '../types';
import Modal from './Modal';
import { Upload, FileSpreadsheet, ClipboardPaste, Check, AlertCircle } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (leads: Lead[]) => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [activeTab, setActiveTab] = useState<'csv' | 'paste'>('csv');
  const [rawText, setRawText] = useState('');
  const [parsedLeads, setParsedLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseData = (text: string, type: 'csv' | 'tsv') => {
    try {
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      if (lines.length < 2) {
        setError("File appears empty or missing headers.");
        return;
      }

      // Detect delimiter
      const delimiter = type === 'tsv' ? '\t' : ',';
      
      // Parse Headers
      const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]+/g, ''));
      
      // Map headers to Lead fields
      const keyMap: Record<number, keyof Lead> = {};
      headers.forEach((h, i) => {
        if (h.includes('name') || h.includes('company') || h.includes('business')) keyMap[i] = 'name';
        else if (h.includes('industry') || h.includes('sector') || h.includes('niche')) keyMap[i] = 'industry';
        else if (h.includes('location') || h.includes('city') || h.includes('address')) keyMap[i] = 'location';
        else if (h.includes('country')) keyMap[i] = 'country';
        else if (h.includes('web') || h.includes('url') || h.includes('site')) keyMap[i] = 'website';
        else if (h.includes('phone') || h.includes('tel') || h.includes('mobile')) keyMap[i] = 'phone';
        else if (h.includes('email') || h.includes('mail')) keyMap[i] = 'email';
        else if (h.includes('linkedin')) keyMap[i] = 'linkedin';
      });

      if (!Object.values(keyMap).includes('name')) {
        setError("Could not detect a 'Name' or 'Company' column. Please check headers.");
        return;
      }

      const newLeads: Lead[] = [];

      for (let i = 1; i < lines.length; i++) {
        let values: string[] = [];
        
        if (type === 'csv') {
          // Simple CSV regex parser to handle quoted strings with commas
          const matches = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
          if (matches) {
             values = matches.map(m => m.replace(/^"|"$/g, '').trim());
          } else {
             values = lines[i].split(',');
          }
        } else {
          values = lines[i].split('\t');
        }

        if (values.length === 0) continue;

        const lead: any = {
          id: `imp-${Date.now()}-${i}`,
          status: 'new',
          leadStatus: 'new',
          sourceType: 'web_search', // Default for imported
          rating: 0,
          reviews: 0,
          industry: 'Imported',
          location: 'Unknown'
        };

        let hasName = false;
        Object.keys(keyMap).forEach((indexStr) => {
          const idx = parseInt(indexStr);
          if (values[idx]) {
            const val = values[idx].trim().replace(/^"|"$/g, '');
            if (val) {
                lead[keyMap[idx]] = val;
                if (keyMap[idx] === 'name') hasName = true;
            }
          }
        });

        if (hasName) {
          newLeads.push(lead as Lead);
        }
      }

      setParsedLeads(newLeads);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to parse data. Please ensure format is correct.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        parseData(evt.target.result as string, 'csv');
      }
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setRawText(text);
    if (text) {
      // Auto-detect tab vs comma
      const type = text.includes('\t') ? 'tsv' : 'csv';
      parseData(text, type);
    } else {
      setParsedLeads([]);
    }
  };

  const handleFinalImport = () => {
    if (parsedLeads.length > 0) {
      onImport(parsedLeads);
      setParsedLeads([]);
      setRawText('');
      setError(null);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Data"
      onSubmit={handleFinalImport}
      submitLabel={`Import ${parsedLeads.length} Leads`}
      isLoading={false}
    >
      <div className="flex flex-col gap-6">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button 
            onClick={() => { setActiveTab('csv'); setError(null); setParsedLeads([]); }}
            className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'csv' ? 'bg-white text-[#2160fd] shadow-sm' : 'text-slate-500'}`}
          >
            <FileSpreadsheet size={16} /> Upload CSV
          </button>
          <button 
            onClick={() => { setActiveTab('paste'); setError(null); setParsedLeads([]); }}
            className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'paste' ? 'bg-white text-[#2160fd] shadow-sm' : 'text-slate-500'}`}
          >
            <ClipboardPaste size={16} /> Paste Data
          </button>
        </div>

        {activeTab === 'csv' ? (
          <div 
            className="border-2 border-dashed border-slate-300 rounded-[32px] p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-colors group"
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".csv"
              onChange={handleFileUpload}
            />
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 transition-transform">
              <Upload size={24} />
            </div>
            <p className="text-sm font-bold text-[#101828]">Click to upload CSV</p>
            <p className="text-xs text-slate-400 mt-1">Headers required: Name, Industry, Location, Website...</p>
          </div>
        ) : (
          <div>
            <textarea 
              className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono outline-none focus:border-blue-500 transition-all resize-none"
              placeholder={`Paste data from Excel or Google Sheets...\n\nExample:\nName\tIndustry\tWebsite\nAcme Corp\tTech\twww.acme.com`}
              value={rawText}
              onChange={handlePasteChange}
            />
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600 text-xs font-bold">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {parsedLeads.length > 0 && !error && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between text-emerald-700">
            <div className="flex items-center gap-3">
              <Check size={16} />
              <span className="text-xs font-bold">{parsedLeads.length} leads ready to import</span>
            </div>
            <span className="text-[10px] uppercase font-black tracking-widest bg-white/50 px-2 py-1 rounded">
              {activeTab === 'csv' ? 'CSV Parsed' : 'Clipboard Parsed'}
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ImportModal;
