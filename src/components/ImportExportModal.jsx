import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Download, Upload, Check, AlertCircle, FileText } from 'lucide-react';
import { exportDataAsJson, importDataFromJson, getStoredLists } from '../services/storage';

export default function ImportExportModal({ onClose, onImported }) {
  const [importStatus, setImportStatus] = useState(null);
  const [jsonInput, setJsonInput] = useState('');

  const currentCount = Object.keys(getStoredLists()).length;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const res = importDataFromJson(content);
        if (res.success) {
          setImportStatus({ success: true, message: `Successfully restored ${res.count} titles!` });
          if (onImported) onImported();
        } else {
          setImportStatus({ success: false, message: `Error restoring: ${res.error}` });
        }
      }
    };
    reader.readAsText(file);
  };

  const handlePasteImport = () => {
    if (!jsonInput.trim()) return;
    const res = importDataFromJson(jsonInput);
    if (res.success) {
      setImportStatus({ success: true, message: `Successfully restored ${res.count} titles!` });
      if (onImported) onImported();
    } else {
      setImportStatus({ success: false, message: `Error restoring: ${res.error}` });
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
    >
      <div 
        className="relative w-full max-w-lg bg-[#0b1622] border border-[#1e293b] rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-Right Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#151f2e] text-slate-400 hover:text-white transition-colors"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Back link */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#151f2e] transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-sky-400" />
            <span>Backup & Restore Data</span>
          </h2>
        </div>

        <p className="text-xs text-slate-400 mb-6">
          Your lists are stored locally in your browser. You can export a JSON backup anytime or transfer your data across devices.
        </p>

        {importStatus && (
          <div className={`p-3 rounded-xl mb-4 text-xs font-bold flex items-center gap-2 ${
            importStatus.success ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          }`}>
            {importStatus.success ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span>{importStatus.message}</span>
          </div>
        )}

        <div className="space-y-6">
          
          {/* Export Box */}
          <div className="bg-[#151f2e] border border-[#1e293b] p-4 rounded-2xl">
            <h3 className="text-sm font-bold text-white mb-1">Export Backup File</h3>
            <p className="text-xs text-slate-400 mb-3">
              Currently tracking <strong className="text-sky-400">{currentCount}</strong> titles. Download your full list as a JSON file.
            </p>
            <button
              type="button"
              onClick={exportDataAsJson}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download JSON Backup</span>
            </button>
          </div>

          {/* Import Box */}
          <div className="bg-[#151f2e] border border-[#1e293b] p-4 rounded-2xl">
            <h3 className="text-sm font-bold text-white mb-1">Restore from Backup</h3>
            <p className="text-xs text-slate-400 mb-3">
              Upload your saved JSON file to restore your progress and ratings.
            </p>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#1e293b] hover:border-sky-500/50 rounded-xl p-4 cursor-pointer bg-[#0b1622] transition-colors mb-3">
              <Upload className="w-6 h-6 text-slate-400 mb-1" />
              <span className="text-xs font-semibold text-slate-300">Click to choose JSON file</span>
              <span className="text-[10px] text-slate-500 mt-0.5">Supports .json exports</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <div className="relative">
              <textarea
                rows="2"
                placeholder="Or paste raw JSON content here..."
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full bg-[#0b1622] border border-[#1e293b] rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none font-mono"
              />
              {jsonInput.trim() && (
                <button
                  type="button"
                  onClick={handlePasteImport}
                  className="mt-2 w-full py-2 rounded-xl bg-[#1e293b] hover:bg-slate-700 text-white text-xs font-bold transition-colors"
                >
                  Import Pasted JSON
                </button>
              )}
            </div>
          </div>

          {/* Bottom Back Button */}
          <div className="pt-2 text-center">
            <button
              onClick={onClose}
              className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Website
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
