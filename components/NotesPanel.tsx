import React from 'react';
import { X, MessageSquare, Trash2, Download, FileText } from 'lucide-react';
import { Annotation } from '../types';

interface NotesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  annotations: Annotation[];
  onRemoveAnnotation: (id: string) => void;
  onClearAnnotations: () => void;
}

const NotesPanel: React.FC<NotesPanelProps> = ({ 
  isOpen, onClose, annotations, onRemoveAnnotation, onClearAnnotations 
}) => {
  if (!isOpen) return null;

  const handleExportCSV = () => {
    if (annotations.length === 0) return;

    // CSV Header
    const headers = ["Original Text", "Remark", "Date"];
    
    // Escape quotes for CSV
    const escape = (text: string) => `"${text.replace(/"/g, '""')}"`;

    const rows = annotations.map(ann => [
      escape(ann.text),
      escape(ann.note),
      escape(new Date(ann.timestamp).toLocaleString())
    ].join(","));

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "jademark_notes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2 text-gray-800 font-bold">
          <MessageSquare size={20} className="text-emerald-600" />
          <span>Remarks ({annotations.length})</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {annotations.length === 0 ? (
          <div className="text-center text-gray-400 mt-10 text-sm flex flex-col items-center gap-2">
            <FileText size={32} className="opacity-20" />
            <p>No remarks yet.</p>
            <p className="text-xs opacity-70">Select text in the preview to add a note.</p>
          </div>
        ) : (
          annotations.map((ann) => (
            <div key={ann.id} className="bg-white border border-gray-200 rounded-lg p-3 hover:border-emerald-300 transition-all shadow-sm group">
              <div className="flex justify-between items-start gap-2 mb-2">
                 <div className="text-xs font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 line-clamp-1 max-w-[80%]">
                   {ann.text}
                 </div>
                 <button 
                   onClick={() => onRemoveAnnotation(ann.id)}
                   className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                   title="Delete Note"
                 >
                   <Trash2 size={14} />
                 </button>
              </div>
              <div className="text-sm text-gray-800 font-medium leading-relaxed">
                {ann.note}
              </div>
              <div className="mt-2 text-[10px] text-gray-400 text-right">
                {new Date(ann.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 bg-white space-y-2">
        <button 
          onClick={handleExportCSV}
          disabled={annotations.length === 0}
          className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={16} />
          Export to CSV
        </button>
        {annotations.length > 0 && (
          <button 
            onClick={onClearAnnotations}
            className="w-full flex items-center justify-center gap-2 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
          >
            <Trash2 size={16} />
            Clear All
          </button>
        )}
      </div>
    </div>
  );
};

export default NotesPanel;