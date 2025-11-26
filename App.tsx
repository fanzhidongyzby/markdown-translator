
import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  Layout, Palette, Monitor, Check,
  Languages, Upload, GripVertical, ChevronLeft, ChevronRight, Settings as SettingsIcon,
  MessageSquare, Loader2
} from 'lucide-react';
import Toolbar from './components/Toolbar';
import Preview from './components/Preview';
import NotesPanel from './components/NotesPanel';
import SettingsModal from './components/SettingsModal';
import AIPanel from './components/AIPanel';
import { ThemeType, AISettings, Annotation } from './types';
import { INITIAL_MARKDOWN } from './readmeContent';

// Enhanced Undo/Redo Hook with Cursor Persistence
interface HistoryState {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

function useHistory(initialState: string) {
  const [history, setHistory] = useState<HistoryState[]>([{ 
    text: initialState, 
    selectionStart: 0, 
    selectionEnd: 0 
  }]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const pushState = (text: string, selectionStart: number, selectionEnd: number) => {
    // Don't push if text hasn't changed
    if (text === history[currentIndex].text) return;

    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push({ text, selectionStart, selectionEnd });
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      return history[currentIndex - 1];
    }
    return null;
  };

  const redo = () => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return history[currentIndex + 1];
    }
    return null;
  };

  return {
    currentState: history[currentIndex],
    pushState,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1
  };
}

export default function App() {
  const { currentState, pushState, undo, redo, canUndo, canRedo } = useHistory(INITIAL_MARKDOWN);
  const [markdown, setMarkdown] = useState(INITIAL_MARKDOWN);
  
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(ThemeType.EMERALD);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [isMobilePreview, setIsMobilePreview] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [enableTranslation, setEnableTranslation] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState({ current: 0, total: 0 });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  
  const [annotations, setAnnotations] = useState<Annotation[]>(() => {
    const saved = localStorage.getItem('jadeMarkAnnotations');
    return saved ? JSON.parse(saved) : [];
  });

  const [aiSettings, setAiSettings] = useState<AISettings>(() => {
    const saved = localStorage.getItem('jadeMarkSettings');
    const parsed = saved ? JSON.parse(saved) : null;
    
    const defaults = {
      provider: 'google-free', // Default to free translation
      baseUrl: '',
      apiKey: '',
      model: '',
      concurrency: 3,
      batchSize: 10
    };

    if (parsed) {
       return { ...defaults, ...parsed };
    }
    return defaults as AISettings;
  });

  const [sidebarWidth, setSidebarWidth] = useState(50); 
  const [isDragging, setIsDragging] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [lastSidebarWidth, setLastSidebarWidth] = useState(50);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Scroll Logic Refs
  const isScrollingRef = useRef<boolean>(false);
  const scrollingSourceRef = useRef<'editor' | 'preview' | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Cursor restoration ref
  const pendingCursorRef = useRef<{start: number, end: number} | null>(null);

  // Sync state with history
  useEffect(() => {
    if (currentState.text !== markdown) {
      setMarkdown(currentState.text);
      pendingCursorRef.current = { 
        start: currentState.selectionStart, 
        end: currentState.selectionEnd 
      };
    }
  }, [currentState]);

  // Restore cursor position after render
  useLayoutEffect(() => {
    if (pendingCursorRef.current && textareaRef.current) {
      textareaRef.current.setSelectionRange(
        pendingCursorRef.current.start,
        pendingCursorRef.current.end
      );
      pendingCursorRef.current = null;
    }
  });

  useEffect(() => {
    localStorage.setItem('jadeMarkAnnotations', JSON.stringify(annotations));
  }, [annotations]);

  const handleSaveSettings = (newSettings: AISettings) => {
    // Avoid re-translation if settings haven't effectively changed
    if (JSON.stringify(newSettings) === JSON.stringify(aiSettings)) {
      return;
    }
    setAiSettings(newSettings);
    localStorage.setItem('jadeMarkSettings', JSON.stringify(newSettings));
  };

  const handleAddAnnotation = (text: string, note: string, contextHash: string, startOffset: number, endOffset: number, globalStartOffset?: number, globalEndOffset?: number) => {
    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      text,
      note,
      timestamp: Date.now(),
      contextHash,
      startOffset,
      endOffset,
      globalStartOffset,
      globalEndOffset
    };
    setAnnotations(prev => [...prev, newAnnotation]);
    setIsNotesOpen(true);
  };

  const handleRemoveAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  };

  const handleClearNotes = () => {
    setAnnotations([]);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
          pushState(text, 0, 0);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setMarkdown(newText);
    pushState(newText, e.target.selectionStart, e.target.selectionEnd);
  };

  const performUndo = () => {
    const prevState = undo();
    if (prevState) {
      // State update handled by useEffect
    }
  };

  const performRedo = () => {
    const nextState = redo();
    if (nextState) {
      // State update handled by useEffect
    }
  };

  // Undo/Redo Key Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          performRedo();
        } else {
          performUndo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        performRedo();
      }
    };
    
    const currentTextArea = textareaRef.current;
    if(currentTextArea) {
        currentTextArea.addEventListener('keydown', handleKeyDown);
    }
    return () => {
        if(currentTextArea) {
            currentTextArea.removeEventListener('keydown', handleKeyDown);
        }
    }
  }, [undo, redo]);

  // --- Scroll Sync Logic (Optimized) ---
  
  const handleEditorScroll = () => {
    if (scrollingSourceRef.current === 'preview') return;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

    if (!textareaRef.current || !previewRef.current) return;
    scrollingSourceRef.current = 'editor';
    
    const editor = textareaRef.current;
    const preview = previewRef.current;
    
    requestAnimationFrame(() => {
      const percentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
      const targetScrollTop = percentage * (preview.scrollHeight - preview.clientHeight);
      if (Math.abs(preview.scrollTop - targetScrollTop) > 10) {
        preview.scrollTop = targetScrollTop;
      }
    });
    
    scrollTimeoutRef.current = setTimeout(() => {
      scrollingSourceRef.current = null;
    }, 250);
  };

  const handlePreviewScroll = () => {
    if (scrollingSourceRef.current === 'editor') return;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

    if (!textareaRef.current || !previewRef.current) return;
    scrollingSourceRef.current = 'preview';
    
    const editor = textareaRef.current;
    const preview = previewRef.current;
    
    requestAnimationFrame(() => {
      const percentage = preview.scrollTop / (preview.scrollHeight - preview.clientHeight);
      const targetScrollTop = percentage * (editor.scrollHeight - editor.clientHeight);
      if (Math.abs(editor.scrollTop - targetScrollTop) > 10) {
        editor.scrollTop = targetScrollTop;
      }
    });
    
    scrollTimeoutRef.current = setTimeout(() => {
      scrollingSourceRef.current = null;
    }, 250);
  };

  const startResizing = useCallback(() => setIsDragging(true), []);
  const stopResizing = useCallback(() => setIsDragging(false), []);
  const resize = useCallback((e: MouseEvent) => {
    if (isDragging && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = Math.max(15, Math.min(95, ((e.clientX - containerRect.left) / containerRect.width) * 100));
      setSidebarWidth(newWidth);
      if (isSidebarCollapsed) setIsSidebarCollapsed(false);
    }
  }, [isDragging, isSidebarCollapsed]);

  const toggleSidebarCollapse = () => {
    if (isSidebarCollapsed) {
      setSidebarWidth(lastSidebarWidth);
      setIsSidebarCollapsed(false);
    } else {
      setLastSidebarWidth(sidebarWidth);
      setSidebarWidth(0);
      setIsSidebarCollapsed(true);
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const handlePreviewElementClick = (fragment: string, offsetTop: number) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const text = textarea.value;
    
    const cleanFragment = fragment.trim();
    if (!cleanFragment) return;
    let index = text.indexOf(cleanFragment);
    if (index === -1 && cleanFragment.length > 30) {
      const sub = cleanFragment.substring(0, 30);
      index = text.indexOf(sub);
    }

    if (index !== -1) {
      textarea.focus();
      const endIndex = index + cleanFragment.length;
      textarea.setSelectionRange(index, endIndex);
      
      const textBefore = text.substring(0, index);
      const linesBefore = textBefore.split('\n').length;
      const computedStyle = window.getComputedStyle(textarea);
      const lineHeight = parseFloat(computedStyle.lineHeight);
      const paddingTop = parseFloat(computedStyle.paddingTop);
      const linePositionPx = (linesBefore - 1) * (lineHeight || 24) + (paddingTop || 32);
      const targetScrollTop = linePositionPx - offsetTop;

      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollingSourceRef.current = 'preview';
      
      textarea.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });
      
      scrollTimeoutRef.current = setTimeout(() => {
        scrollingSourceRef.current = null;
      }, 500);
    }
  };

  const handleInsert = (syntax: string, type: 'block' | 'inline' | 'wrap') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let newText = '';
    let newCursorPos = 0;

    if (type === 'wrap') {
      newText = text.substring(0, start) + syntax + selectedText + syntax + text.substring(end);
      newCursorPos = end + syntax.length; 
      if (selectedText.length === 0) newCursorPos = start + syntax.length; 
    } else if (type === 'block') {
      const isLineStart = start === 0 || text[start - 1] === '\n';
      const prefix = isLineStart ? '' : '\n';
      newText = text.substring(0, start) + prefix + syntax + text.substring(end);
      newCursorPos = start + prefix.length + syntax.length;
    } else {
      newText = text.substring(0, start) + syntax + text.substring(end);
      newCursorPos = start + syntax.length;
    }

    setMarkdown(newText);
    pushState(newText, newCursorPos, newCursorPos);
    
    pendingCursorRef.current = { start: newCursorPos, end: newCursorPos };
    setTimeout(() => {
        if(textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
    }, 0);
  };

  const getTranslateButtonClass = () => {
    if (!enableTranslation) return 'hover:bg-gray-100 text-gray-600';
    if (isTranslating) return 'bg-orange-100 text-orange-700 ring-1 ring-orange-200';
    return 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200';
  };

  const getTranslateButtonLabel = () => {
     if (isTranslating) return 'Translating';
     if (enableTranslation && !isTranslating) return 'Translated';
     return 'Translate';
  };

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 shrink-0 z-10 relative shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
            MT
          </div>
          <h1 className="font-semibold text-gray-800 hidden sm:block">Markdown Translator</h1>
        </div>

        <div className="flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload} 
            accept=".md,.txt" 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors text-sm font-medium"
            title="Open Markdown File"
          >
            <Upload size={18} />
            <span className="hidden sm:inline">Upload</span>
          </button>

          <button 
            onClick={() => setEnableTranslation(!enableTranslation)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${getTranslateButtonClass()}`}
            title={enableTranslation ? "Disable Auto Translate" : "Enable Auto Translate"}
          >
            <Languages size={16} />
            <span className="hidden sm:inline">{getTranslateButtonLabel()}</span>
          </button>
          
          <button
             onClick={() => setIsNotesOpen(!isNotesOpen)}
             className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${isNotesOpen ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'}`}
             title="View Remarks"
          >
             <MessageSquare size={18} />
             <span className="hidden sm:inline">Remarks</span>
             {annotations.length > 0 && <span className="bg-emerald-500 text-white text-[10px] px-1.5 rounded-full">{annotations.length}</span>}
          </button>

          <div className="relative">
            <button 
              onClick={() => setThemeMenuOpen(!themeMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-100 text-gray-600 text-sm font-medium transition-colors"
            >
              <Palette size={16} />
              <span className="hidden sm:inline">Theme</span>
            </button>
            
            {themeMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                {Object.values(ThemeType).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setCurrentTheme(t); setThemeMenuOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-gray-50 ${currentTheme === t ? 'text-emerald-600 font-medium' : 'text-gray-700'}`}
                  >
                    {t}
                    {currentTheme === t && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors text-sm font-medium"
            title="Configuration"
          >
            <SettingsIcon size={18} />
            <span className="hidden sm:inline">Settings</span>
          </button>

          <button 
            onClick={() => setIsMobilePreview(!isMobilePreview)}
            className="sm:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            {isMobilePreview ? <Layout size={18} /> : <Monitor size={18} />}
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative" ref={containerRef}>

        <div
          className={`flex flex-col min-w-0 transition-all duration-300 ease-in-out ${isMobilePreview ? 'hidden sm:flex' : 'flex'} ${isSidebarCollapsed ? 'w-0 min-w-0 opacity-0 invisible' : 'opacity-100 visible'}`}
          style={{ width: isSidebarCollapsed ? '0%' : (isMobilePreview ? '100%' : `${sidebarWidth}%`), flex: '0 0 auto', minWidth: isSidebarCollapsed ? '0px' : undefined }}
        >
          <Toolbar 
            onInsert={handleInsert} 
            onUndo={performUndo} 
            onRedo={performRedo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
          <div className="flex-1 relative bg-gray-50">
            <textarea
              ref={textareaRef}
              value={markdown}
              onScroll={handleEditorScroll}
              onChange={handleMarkdownChange}
              className="absolute inset-0 w-full h-full p-8 resize-none outline-none font-mono text-sm text-gray-800 bg-gray-50 leading-relaxed custom-scrollbar selection:bg-emerald-200 selection:text-emerald-900"
              placeholder="Start writing..."
              spellCheck={false}
            />
          </div>
        </div>

        {!isMobilePreview && !isSidebarCollapsed && (
          <div
            className="relative w-4 bg-gray-100 border-l border-r border-gray-200 flex-shrink-0 z-20 hover:bg-emerald-50 transition-colors group flex flex-col justify-center items-center"
            style={{ cursor: 'col-resize', userSelect: 'none' }}
          >
            <button
               onClick={toggleSidebarCollapse}
               className="absolute top-1/2 -translate-y-1/2 -left-3 z-30 w-6 h-12 bg-white border border-gray-200 rounded-l-lg shadow-sm flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
               title="Collapse Editor"
            >
              <ChevronLeft size={14} />
            </button>

            <div
              onMouseDown={startResizing}
              className="w-full h-full flex items-center justify-center cursor-col-resize"
            >
              <GripVertical size={16} className="text-gray-300 group-hover:text-emerald-500" />
            </div>
          </div>
        )}
        {!isMobilePreview && isSidebarCollapsed && (
          <div className="relative w-0 flex-shrink-0">
            <button
              onClick={toggleSidebarCollapse}
              className="absolute top-1/2 -translate-y-1/2 left-0 z-30 w-6 h-12 bg-white border border-gray-200 rounded-r-lg shadow-sm flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              title="Expand Editor"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        <div
          className={`bg-gray-100/50 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${isMobilePreview ? 'hidden sm:flex' : 'flex'} ${isSidebarCollapsed ? 'w-full opacity-100 visible' : 'opacity-100 visible'}`}
          style={{ flex: '1 1 auto', width: isSidebarCollapsed ? '100%' : 'auto' }}
        >
           <div className="bg-white border-b border-gray-200 px-4 py-2 text-xs font-medium text-gray-400 tracking-wider flex justify-between items-center shrink-0">
             <div className="flex items-center gap-2">
               <span>预览</span>
               {enableTranslation && <span className="text-orange-500 font-bold px-1.5 py-0.5 bg-orange-50 rounded text-[10px] border border-orange-100">中文</span>}
             </div>

             {uploadedFileName && (
               <div className="text-gray-500 text-sm font-medium truncate max-w-xs mx-4">
                 {uploadedFileName}
               </div>
             )}

             <div className="flex items-center gap-2">
               {isTranslating && (
                 <div className="flex items-center gap-2 bg-white/95 backdrop-blur px-3 py-1 rounded-full shadow-sm border border-emerald-100 text-xs text-emerald-700">
                   <Loader2 size={12} className="animate-spin text-emerald-500" />
                   <span>翻译中... {Math.round((translationProgress.current / Math.max(translationProgress.total, 1)) * 100)}%</span>
                 </div>
               )}
               {isMobilePreview && (
                 <button onClick={() => setIsMobilePreview(false)} className="sm:hidden text-gray-500">Close</button>
               )}
             </div>
           </div>
           
           <div className="flex-1 overflow-hidden relative bg-gray-100 p-4 sm:p-8 flex justify-center">
             <div
                className={`bg-white shadow-lg w-full h-full overflow-hidden relative border border-gray-200 rounded-sm transition-all duration-300 ${isSidebarCollapsed ? 'max-w-none' : 'max-w-none'}`}
             >
                <div 
                  ref={previewRef} 
                  onScroll={handlePreviewScroll}
                  className="h-full overflow-y-auto scroll-smooth custom-scrollbar"
                >
                  <Preview
                    content={markdown}
                    theme={currentTheme}
                    enableTranslation={enableTranslation}
                    onElementClick={handlePreviewElementClick}
                    settings={aiSettings}
                    onTranslatingStatusChange={(isTranslating, progress) => {
                      setIsTranslating(isTranslating);
                      if (progress) {
                        setTranslationProgress(progress);
                      }
                    }}
                    annotations={annotations}
                    onAddAnnotation={handleAddAnnotation}
                    onRemoveAnnotation={handleRemoveAnnotation}
                  />
                </div>
             </div>
           </div>
        </div>

        {isNotesOpen && (
            <div className="fixed inset-0 z-40 bg-black/5" onClick={() => setIsNotesOpen(false)}></div>
        )}
        <NotesPanel 
          isOpen={isNotesOpen}
          onClose={() => setIsNotesOpen(false)}
          annotations={annotations}
          onRemoveAnnotation={handleRemoveAnnotation}
          onClearAnnotations={handleClearNotes}
        />
        
        <AIPanel 
          isOpen={isAIPanelOpen}
          onClose={() => setIsAIPanelOpen(false)}
          currentContent={markdown}
          onApply={(text) => {
            pushState(text, 0, 0);
            setMarkdown(text);
            setIsAIPanelOpen(false);
          }}
          settings={aiSettings}
        />

        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)}
          onSave={handleSaveSettings}
          initialSettings={aiSettings}
        />
      </main>

      {isDragging && (
        <div className="fixed inset-0 z-50 cursor-col-resize" />
      )}
    </div>
  );
}
