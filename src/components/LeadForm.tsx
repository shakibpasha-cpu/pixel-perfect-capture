import React, { useState } from 'react';
import { Search, MapPin, Briefcase, Globe } from 'lucide-react';
import { SearchParams } from '../types';

interface LeadFormProps {
  onSearch: (params: SearchParams) => void;
  isLoading: boolean;
}

export const LeadForm: React.FC<LeadFormProps> = ({ onSearch, isLoading }) => {
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [keywords, setKeywords] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (industry && location) {
      onSearch({ industry, location, keywords });
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl mb-8">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <Search className="w-5 h-5 text-indigo-400" />
        Define Target Criteria
      </h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="relative md:col-span-1">
          <label className="block text-xs font-medium text-slate-400 mb-1 ml-1">Industry</label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              required
              placeholder="e.g. SaaS, Dental, Logistics"
              className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent block pl-10 p-2.5 placeholder-slate-600"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
          </div>
        </div>

        <div className="relative md:col-span-1">
          <label className="block text-xs font-medium text-slate-400 mb-1 ml-1">Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              required
              placeholder="e.g. Austin, TX"
              className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent block pl-10 p-2.5 placeholder-slate-600"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>

        <div className="relative md:col-span-1">
          <label className="block text-xs font-medium text-slate-400 mb-1 ml-1">Keywords (Optional)</label>
          <div className="relative">
            <Globe className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="e.g. 'startups', 'series A'"
              className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent block pl-10 p-2.5 placeholder-slate-600"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-end md:col-span-1">
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full text-white font-medium rounded-lg text-sm px-5 py-2.5 text-center focus:ring-4 focus:outline-none transition-all duration-200 ${
              isLoading 
                ? 'bg-indigo-800 cursor-not-allowed opacity-70' 
                : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-800'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Scraping...
              </span>
            ) : (
              'Find Leads'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
