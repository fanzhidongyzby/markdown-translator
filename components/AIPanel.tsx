
import React, { useState } from 'react';
import { X, Sparkles, Send, Loader2, Wand2, BookOpen, Languages } from 'lucide-react';
import { streamResponse } from '../services/translateService';
import { AISettings } from '../types';

interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentContent: string;
  onApply: (text: string) => void;
  settings?: AISettings;
}

const AIPanel: React.FC<AIPanelProps> = ({ isOpen, onClose, currentContent, onApply, settings }) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (actionType: string) => {
    if (!currentContent && actionType !== 'generate') return;
    
    setIsLoading(true);
    setResponse('');
    
    let systemPrompt = "";
    switch (actionType) {
      case 'polish':
        systemPrompt = "Rewrite the following markdown content to be more professional, concise, and engaging. Maintain the markdown formatting.";
        break;
      case 'summarize':
        systemPrompt = "Summarize the following content in a bulleted list.";
        break;
      case 'translate':
        systemPrompt = "Translate the following content into English (if it is not) or Chinese (if it is English). Maintain markdown structure.";
        break;
      default:
        systemPrompt = "Act as a helpful writing assistant.";
    }

    try {
      await streamResponse(systemPrompt, currentContent, (chunk) => {
        setResponse(prev => prev + chunk);
      }, settings);
    } catch (e) {
      setResponse("Error: Failed to connect to AI Service. Please check your settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomPrompt = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setResponse('');
    try {
      await streamResponse(prompt, currentContent, (chunk) => {
        setResponse(prev => prev + chunk);
      }, settings);
    } catch (e) {
      setResponse("Error: Failed to connect to AI Service.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white">
        <div className="flex items-center gap-2 text-emerald-700 font-bold">
          <Sparkles size={20} />
          <span>AI Assistant</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="p-4 grid grid-cols-3 gap-2 border-b border-gray-100 bg-gray-50/50">
        <button 
          onClick={() => handleAction('polish')}
          disabled={isLoading || !currentContent}
          className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-lg hover:border-emerald-400 hover:bg-emerald-50 transition-all disabled:opacity-50 text-xs text-gray-600 gap-1"
        >
          <Wand2 size={16} className="text-purple-500" />
          Polish
        </button>
        <button 
          onClick={() => handleAction('summarize')}
          disabled={isLoading || !currentContent}
          className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-lg hover:border-emerald-400 hover:bg-emerald-50 transition-all disabled:opacity-50 text-xs text-gray-600 gap-1"
        >
          <BookOpen size={16} className="text-blue-500" />
          Summary
        </button>
        <button 
          onClick={() => handleAction('translate')}
          disabled={isLoading || !currentContent}
          className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-lg hover:border-emerald-400 hover:bg-emerald-50 transition-all disabled:opacity-50 text-xs text-gray-600 gap-1"
        >
          <Languages size={16} className="text-orange-500" />
          Translate
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!response && !isLoading && (
          <div className="text-center text-gray-400 mt-10 text-sm">
            <p>Ask AI to help you write, edit, or format your markdown.</p>
          </div>
        )}
        
        {(response || isLoading) && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap font-mono text-xs">
              {response}
            </div>
            {isLoading && (
              <div className="flex items-center gap-2 mt-2 text-emerald-600 text-xs animate-pulse">
                <Loader2 size={14} className="animate-spin" />
                AI is thinking...
              </div>
            )}
          </div>
        )}

        {response && !isLoading && (
          <button 
            onClick={() => onApply(response)}
            className="w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium transition-colors shadow-sm"
          >
            Replace Content
          </button>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
               if(e.key === 'Enter' && !e.shiftKey) {
                 e.preventDefault();
                 handleCustomPrompt();
               }
            }}
            placeholder="Ask AI anything..."
            className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none text-sm outline-none transition-all"
            rows={3}
          />
          <button 
            onClick={handleCustomPrompt}
            disabled={isLoading || !prompt.trim()}
            className="absolute right-2 bottom-2 p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIPanel;
