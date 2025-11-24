
import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Settings, Zap, Layers, Key, Globe, Box, Terminal } from 'lucide-react';
import { AISettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AISettings) => void;
  initialSettings: AISettings;
}

// Local storage keys for caching drafts
const STORAGE_KEYS = {
  GEMINI: 'jadeMark_gemini_config',
  OPENAI: 'jadeMark_openai_config'
};

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, initialSettings }) => {
  const [settings, setSettings] = useState<AISettings>(initialSettings);
  
  // Independent state for caching configuration drafts
  const [geminiConfig, setGeminiConfig] = useState({
    apiKey: '',
    model: 'gemini-2.5-flash'
  });
  
  const [openaiConfig, setOpenaiConfig] = useState({
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    apiKey: '',
    model: '' // No default as requested
  });

  // Initialize configs from local storage or initial settings on mount
  useEffect(() => {
    const savedGemini = localStorage.getItem(STORAGE_KEYS.GEMINI);
    if (savedGemini) {
      setGeminiConfig(JSON.parse(savedGemini));
    } else if (initialSettings.provider === 'google-sdk') {
      setGeminiConfig({ apiKey: initialSettings.apiKey, model: initialSettings.model });
    }

    const savedOpenAI = localStorage.getItem(STORAGE_KEYS.OPENAI);
    if (savedOpenAI) {
      setOpenaiConfig(JSON.parse(savedOpenAI));
    } else if (initialSettings.provider === 'custom') {
      setOpenaiConfig({ 
        apiKey: initialSettings.apiKey, 
        model: initialSettings.model, 
        baseUrl: initialSettings.baseUrl 
      });
    }
  }, []);

  // Sync current settings to initialSettings when modal opens
  useEffect(() => {
    if (isOpen) {
      setSettings(initialSettings);
      // Also update our local cache wrappers if the active one has changed externally
      if (initialSettings.provider === 'google-sdk') {
        setGeminiConfig(prev => ({ ...prev, apiKey: initialSettings.apiKey, model: initialSettings.model }));
      } else if (initialSettings.provider === 'custom') {
        setOpenaiConfig(prev => ({ 
          ...prev, 
          apiKey: initialSettings.apiKey, 
          model: initialSettings.model, 
          baseUrl: initialSettings.baseUrl 
        }));
      }
    }
  }, [isOpen, initialSettings]);

  const handleProviderChange = (newProvider: AISettings['provider']) => {
    let newSettings = { ...settings, provider: newProvider };

    if (newProvider === 'google-sdk') {
      newSettings = { ...newSettings, ...geminiConfig };
    } else if (newProvider === 'custom') {
      newSettings = { ...newSettings, ...openaiConfig };
    }
    // For 'google-free', we don't overwrite api keys/models, just change provider
    
    setSettings(newSettings);
  };

  const updateGeminiConfig = (updates: Partial<typeof geminiConfig>) => {
    const newConfig = { ...geminiConfig, ...updates };
    setGeminiConfig(newConfig);
    setSettings({ ...settings, ...updates });
    localStorage.setItem(STORAGE_KEYS.GEMINI, JSON.stringify(newConfig));
  };

  const updateOpenAIConfig = (updates: Partial<typeof openaiConfig>) => {
    const newConfig = { ...openaiConfig, ...updates };
    setOpenaiConfig(newConfig);
    setSettings({ ...settings, ...updates });
    localStorage.setItem(STORAGE_KEYS.OPENAI, JSON.stringify(newConfig));
  };

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const handleReset = () => {
    const defaultSettings: AISettings = {
      provider: 'google-free',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      apiKey: '',
      model: 'gemini-2.5-flash', 
      concurrency: 3,
      batchSize: 10
    };
    setSettings(defaultSettings);
    // Reset caches too
    localStorage.removeItem(STORAGE_KEYS.GEMINI);
    localStorage.removeItem(STORAGE_KEYS.OPENAI);
    setGeminiConfig({ apiKey: '', model: 'gemini-2.5-flash' });
    setOpenaiConfig({ baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/', apiKey: '', model: '' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-2 font-bold text-gray-800">
            <Settings size={20} className="text-emerald-600" />
            <h3>Configuration</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 block mb-2">Translation Provider</label>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => handleProviderChange('google-free')}
                className={`flex items-center gap-3 py-3 px-4 rounded-lg text-sm font-medium border text-left transition-all ${
                  settings.provider === 'google-free'
                    ? 'bg-blue-50 border-blue-500 text-blue-800'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Globe size={18} className={settings.provider === 'google-free' ? 'text-blue-500' : 'text-gray-400'} />
                <div>
                  <div className="font-semibold">Google Translate (Free)</div>
                  <div className="text-xs opacity-70 font-normal">No API key required. Basic quality.</div>
                </div>
              </button>

              <button
                onClick={() => handleProviderChange('google-sdk')}
                className={`flex items-center gap-3 py-3 px-4 rounded-lg text-sm font-medium border text-left transition-all ${
                  settings.provider === 'google-sdk'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Box size={18} className={settings.provider === 'google-sdk' ? 'text-emerald-500' : 'text-gray-400'} />
                <div>
                  <div className="font-semibold">Google Gemini (Official SDK)</div>
                  <div className="text-xs opacity-70 font-normal">High performance. Requires API Key.</div>
                </div>
              </button>

              <button
                onClick={() => handleProviderChange('custom')}
                className={`flex items-center gap-3 py-3 px-4 rounded-lg text-sm font-medium border text-left transition-all ${
                  settings.provider === 'custom'
                    ? 'bg-purple-50 border-purple-500 text-purple-800'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Terminal size={18} className={settings.provider === 'custom' ? 'text-purple-500' : 'text-gray-400'} />
                <div>
                  <div className="font-semibold">Custom / OpenAI</div>
                  <div className="text-xs opacity-70 font-normal">Connect to any OpenAI-compatible API.</div>
                </div>
              </button>
            </div>
          </div>

          {/* Dynamic Form Fields */}
          <div className="space-y-4 border-t border-gray-100 pt-4">
             {settings.provider === 'google-sdk' && (
               <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                 <div>
                    <label className="flex items-center gap-1 text-xs font-semibold text-gray-600 mb-1">
                      <Key size={12} /> Google API Key
                    </label>
                    <input
                      type="password"
                      value={settings.apiKey}
                      onChange={(e) => updateGeminiConfig({ apiKey: e.target.value })}
                      placeholder="AIzaSy..."
                      className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Get key from <a href="https://aistudio.google.com" target="_blank" className="underline">Google AI Studio</a>.</p>
                 </div>
                 <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Model Name</label>
                    <input
                      type="text"
                      value={settings.model}
                      onChange={(e) => updateGeminiConfig({ model: e.target.value })}
                      placeholder="gemini-2.5-flash"
                      className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                 </div>
               </div>
             )}

             {settings.provider === 'custom' && (
               <div className="bg-purple-50/50 p-3 rounded-lg border border-purple-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                 <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Base URL</label>
                    <input
                      type="text"
                      value={settings.baseUrl}
                      onChange={(e) => updateOpenAIConfig({ baseUrl: e.target.value })}
                      placeholder="https://api.openai.com/v1/"
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Example: https://api.openai.com/v1/</p>
                 </div>
                 <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">API Key</label>
                    <input
                      type="password"
                      value={settings.apiKey}
                      onChange={(e) => updateOpenAIConfig({ apiKey: e.target.value })}
                      placeholder="sk-..."
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Model Name</label>
                    <input
                      type="text"
                      value={settings.model}
                      onChange={(e) => updateOpenAIConfig({ model: e.target.value })}
                      placeholder="gpt-4o"
                      className="w-full px-3 py-2 bg-white border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                 </div>
               </div>
             )}
          </div>

          {/* Performance Settings - Now Visible for ALL providers */}
          <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 mb-1">
                <Layers size={12} />
                Batch Size
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={settings.batchSize || 10}
                onChange={(e) => setSettings({ ...settings, batchSize: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                title="Number of blocks to translate in one request"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-gray-500 mb-1">
                <Zap size={12} />
                Concurrency
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.concurrency || 3}
                onChange={(e) => setSettings({ ...settings, concurrency: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                title="Number of parallel translation requests"
              />
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between flex-shrink-0">
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
