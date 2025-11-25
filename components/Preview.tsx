
import React, { forwardRef, useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import RemarkGfm from 'remark-gfm';
import { ChevronDown, ChevronRight, Copy, Check, Loader2, Globe, MessageSquarePlus, X } from 'lucide-react';
import { ThemeType, THEMES, AISettings, Annotation } from '../types';
import { translateMarkdownToChinese } from '../services/translateService';
import { createPortal } from 'react-dom';

interface PreviewProps {
  content: string;
  theme: ThemeType;
  enableTranslation: boolean;
  onElementClick?: (text: string, offsetTop: number) => void;
  onTranslatingStatusChange?: (isTranslating: boolean, progress?: { current: number; total: number }) => void;
  settings?: AISettings;
  annotations: Annotation[];
  onAddAnnotation: (text: string, note: string, contextHash: string, startOffset: number, endOffset: number) => void;
  onRemoveAnnotation?: (id: string) => void;
}

// Simple string hash for context identification
const djb2Hash = (str: string): string => {
  let hash = 5381;
  const cleanStr = str.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim(); 
  for (let i = 0; i < cleanStr.length; i++) {
    hash = ((hash << 5) + hash) + cleanStr.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
};

const getSelectionOffsetRelativeToContainer = (container: HTMLElement, targetNode: Node, targetOffset: number): number => {
  const range = document.createRange();
  range.selectNodeContents(container);
  const startRange = document.createRange();
  startRange.selectNodeContents(container);
  startRange.setEnd(targetNode, targetOffset);
  return startRange.toString().length;
};

// --- Parsing ---
const REGEX = {
  header: /^(#{1,6})\s+(.*)/,
  blockquote: /^((?:> ?)+)(.*)/,
  list: /^(\s*[-*+]|\d+\.)\s+(.*)/,
  codeFenceStart: /^```(\w*)/,
  codeFenceEnd: /^```$/,
};

interface MarkdownBlock {
  type: 'text' | 'code' | 'header' | 'quote' | 'list' | 'hr' | 'empty';
  content: string;
  prefix?: string; 
  lang?: string; 
  raw: string; 
}

const parseMarkdownIntoBlocks = (text: string): MarkdownBlock[] => {
  const lines = text.split('\n');
  const blocks: MarkdownBlock[] = [];
  let currentTextBuffer: string[] = [];
  let inCodeBlock = false;
  let codeLang = '';
  let codeBuffer: string[] = [];

  const flushTextBuffer = () => {
    if (currentTextBuffer.length > 0) {
      const raw = currentTextBuffer.join('\n');
      blocks.push({ type: 'text', content: raw, raw: raw });
      currentTextBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code Fence Detection
    if (!inCodeBlock && REGEX.codeFenceStart.test(line)) {
      flushTextBuffer();
      inCodeBlock = true;
      codeLang = line.match(REGEX.codeFenceStart)![1] || '';
      codeBuffer = []; 
      continue;
    }
    if (inCodeBlock) {
      if (REGEX.codeFenceEnd.test(line)) {
        inCodeBlock = false;
        blocks.push({ 
          type: 'code', 
          content: codeBuffer.join('\n'), 
          lang: codeLang,
          raw: `\`\`\`${codeLang}\n${codeBuffer.join('\n')}\n\`\`\``
        });
        codeBuffer = [];
      } else {
        codeBuffer.push(line);
      }
      continue;
    }

    const headerMatch = line.match(REGEX.header);
    if (headerMatch) {
      flushTextBuffer();
      blocks.push({ type: 'header', prefix: headerMatch[1] + ' ', content: headerMatch[2], raw: line });
      continue;
    }
    
    // Standard Text Accumulation
    if (line.trim() === '') {
        flushTextBuffer();
        blocks.push({ type: 'empty', content: '', raw: '' });
        continue;
    }
    
    currentTextBuffer.push(line);
  }

  flushTextBuffer();
  return blocks;
};

// --- Highlighting ---

const getTextContent = (node: React.ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (!node) return '';
  if (Array.isArray(node)) return node.map(getTextContent).join('');
  if (React.isValidElement(node)) {
    // Standard React element
    const props = node.props as any;
    // If it's a code block (inline or block), treat its content as text
    if (props.children) {
      return getTextContent(props.children);
    }
  }
  return '';
};

// Define CodeBlock first so we can reference it in RecursiveHighlighter
const CodeBlock = ({ inline, className, children, annotations, node, ...props }: any) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  
  // Robust Inline Detection:
  // 1. Explicit inline prop.
  // 2. OR: No "language-" class AND the text content has no newlines (after trimming).
  const contentText = getTextContent(children);
  const cleanContent = contentText.replace(/\n$/, ''); // Trim trailing newline from fence
  const match = /language-(\w+)/.exec(className || '');
  
  // Note: react-markdown v9+ often drops `inline` prop, so we rely heavily on content analysis.
  // Inline code usually has NO className and NO internal newlines.
  const isInline = inline || (!match && !cleanContent.includes('\n'));

  if (isInline) {
    return (
      <code className={`${className || ''} inline bg-gray-100 text-pink-600 px-1.5 rounded text-sm font-mono break-words align-middle`} {...props}>
        {children}
      </code>
    );
  }

  const language = match ? match[1] : 'text';
  const codeContent = contentText.replace(/\n$/, '');
  
  const hash = djb2Hash(codeContent);
  const blockAnnotations = annotations ? annotations.filter((a: Annotation) => a.contextHash === hash) : [];
  const offsetTracker = { value: 0 };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-lg border border-gray-200 overflow-hidden shadow-sm bg-gray-50 text-left group">
      <div 
        className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-200 select-none"
        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
      >
        <div className="flex items-center gap-2 cursor-pointer">
          {isExpanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
          <span className="text-xs font-mono font-medium text-gray-600 uppercase">{language}</span>
        </div>
        <button 
          onClick={handleCopy}
          className="text-gray-500 hover:text-emerald-600 transition-colors opacity-0 group-hover:opacity-100"
          title="Copy code"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      {isExpanded && (
        <div className="overflow-x-auto p-4 bg-gray-50">
          <code className={`${className} block`} data-block-hash={hash} {...props}>
             <RecursiveHighlighter node={codeContent} annotations={blockAnnotations} currentOffset={offsetTracker} />
          </code>
        </div>
      )}
    </div>
  );
};

const RecursiveHighlighter: React.FC<{
  node: React.ReactNode;
  annotations: Annotation[];
  currentOffset: { value: number }; 
}> = ({ node, annotations, currentOffset }) => {
  
  if (typeof node === 'string') {
    const text = node;
    const start = currentOffset.value;
    const end = start + text.length;
    currentOffset.value = end; 

    const relevant = annotations.filter(a => 
      a.startOffset < end && a.endOffset > start
    ).sort((a, b) => a.startOffset - b.startOffset);

    if (relevant.length === 0) return <>{text}</>;

    const fragments: React.ReactNode[] = [];
    let cursor = start;

    for (const ann of relevant) {
      const hlStart = Math.max(ann.startOffset, cursor);
      const hlEnd = Math.min(ann.endOffset, end);

      if (hlStart >= hlEnd) continue;

      if (hlStart > cursor) {
        fragments.push(text.slice(cursor - start, hlStart - start));
      }

      const content = text.slice(hlStart - start, hlEnd - start);
      fragments.push(
        <span key={ann.id + '-' + cursor} className="group relative inline cursor-help border-b-2 border-dashed border-yellow-400 bg-yellow-50/50 decoration-clone">
          {content}
           <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50 pointer-events-none text-left font-sans whitespace-normal select-none">
            {ann.note}
            <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></span>
          </span>
        </span>
      );
      cursor = hlEnd;
    }

    if (cursor < end) fragments.push(text.slice(cursor - start));

    return <>{fragments}</>;
  }

  // FIX: Identify CodeBlock explicitly to prevent recursion loop.
  // We do NOT recurse into CodeBlock, effectively handing off control to the CodeBlock component itself.
  if (React.isValidElement(node)) {
    const isCodeBlock = (node.type === CodeBlock) || ((node.props as any).node?.tagName === 'code');
    
    if (isCodeBlock) {
      const text = getTextContent(node);
      currentOffset.value += text.length;
      return node;
    }

    const props = (node.props as any) || {};
    const children = props.children;
    
    if (!children) return node;

    const processedChildren = React.Children.map(children, (child) => (
      <RecursiveHighlighter 
        node={child} 
        annotations={annotations} 
        currentOffset={currentOffset} 
      />
    ));

    return React.cloneElement(node, { ...props, children: processedChildren } as any);
  }

  if (Array.isArray(node)) {
    return (
      <>
        {node.map((child, i) => (
          <RecursiveHighlighter 
            key={i} 
            node={child} 
            annotations={annotations} 
            currentOffset={currentOffset} 
          />
        ))}
      </>
    );
  }

  return <>{node}</>;
};

const AnnotatedBlock: React.FC<{
  children: React.ReactNode,
  annotations: Annotation[],
  as?: React.ElementType,
  className?: string,
  [key: string]: any 
}> = ({ children, annotations, as: Component = 'div', className, ...props }) => {
  const textContent = getTextContent(children);
  const hash = djb2Hash(textContent);
  const blockAnnotations = annotations.filter(a => a.contextHash === hash);
  const offsetTracker = { value: 0 };

  return (
    <Component className={className} data-block-hash={hash} {...props}>
      <RecursiveHighlighter 
        node={children} 
        annotations={blockAnnotations} 
        currentOffset={offsetTracker} 
      />
    </Component>
  );
};

// --- Concurrency Queue ---
class TaskQueue {
  private queue: (() => Promise<void>)[] = [];
  private active = 0;
  private concurrency: number;

  constructor(concurrency: number) {
    this.concurrency = concurrency;
  }

  add(task: () => Promise<void>) {
    this.queue.push(task);
    this.next();
  }

  private next() {
    if (this.active >= this.concurrency || this.queue.length === 0) return;
    const task = this.queue.shift();
    if (task) {
      this.active++;
      task().finally(() => {
        this.active--;
        this.next();
      });
    }
  }
}

const Preview = forwardRef<HTMLDivElement, PreviewProps>(({ 
  content, theme, enableTranslation, onElementClick, settings, onTranslatingStatusChange,
  annotations, onAddAnnotation
}, ref) => {
  const currentTheme = THEMES[theme];
  const [displayedContent, setDisplayedContent] = useState(content);
  const [isTranslating, setIsTranslating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  
  const [selectionPopup, setSelectionPopup] = useState<{ x: number, y: number, text: string, contextHash: string, start: number, end: number } | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const popupRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null); 
  const chunkCacheRef = useRef<Map<string, string>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (onTranslatingStatusChange) onTranslatingStatusChange(isTranslating);
  }, [isTranslating, onTranslatingStatusChange]);

  useEffect(() => {
    chunkCacheRef.current.clear();
  }, [settings]);

  useEffect(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort();

    if (!enableTranslation) {
      setIsTranslating(false);
      setDisplayedContent(content);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const runTranslation = async () => {
      const blocks = parseMarkdownIntoBlocks(content);
      const totalBlocks = blocks.filter(b => b.type !== 'empty').length;
      
      const currentRenderedBlocks = blocks.map(block => {
        if (block.type === 'empty') return '';
        const cached = chunkCacheRef.current.get(block.raw);
        return cached || block.raw;
      });

      setDisplayedContent(currentRenderedBlocks.join('\n'));
      
      const blocksToTranslate = blocks.map((b, i) => ({ block: b, index: i }))
        .filter(({ block }) => block.type !== 'empty' && !chunkCacheRef.current.has(block.raw));

      if (blocksToTranslate.length === 0) {
        setIsTranslating(false);
        return;
      }

      setIsTranslating(true);
      const initialProgress = { current: totalBlocks - blocksToTranslate.length, total: totalBlocks };
      setProgress(initialProgress);
      if (onTranslatingStatusChange) onTranslatingStatusChange(true, initialProgress);

      const batchSize = settings?.batchSize || 10;
      const concurrency = settings?.concurrency || 3;
      const taskQueue = new TaskQueue(concurrency);

      const batches: Array<{ type: 'batch' | 'single', items: typeof blocksToTranslate }> = [];
      let currentBatch: typeof blocksToTranslate = [];

      for (const item of blocksToTranslate) {
        if (item.block.type === 'code' || item.block.content.length > 1000) {
          if (currentBatch.length > 0) {
            batches.push({ type: 'batch', items: currentBatch });
            currentBatch = [];
          }
          batches.push({ type: 'single', items: [item] });
        } else {
          currentBatch.push(item);
          if (currentBatch.length >= batchSize) {
             batches.push({ type: 'batch', items: currentBatch });
             currentBatch = [];
          }
        }
      }
      if (currentBatch.length > 0) batches.push({ type: 'batch', items: currentBatch });

      let completedCount = totalBlocks - blocksToTranslate.length;

      const updateProgress = () => {
         completedCount++;
         const newProgress = { current: Math.min(completedCount, totalBlocks), total: totalBlocks };
         setProgress(newProgress);
         if (onTranslatingStatusChange) onTranslatingStatusChange(true, newProgress);
      };

      const processBatch = async (batchItems: typeof blocksToTranslate) => {
         if (controller.signal.aborted) return;
         const delimiter = "\n\n<<<BATCH_SEP>>>\n\n";
         const fullText = batchItems.map(item => item.block.content).join(delimiter);
         
         try {
            const translatedTextFull = await translateMarkdownToChinese(fullText, undefined, settings);
            const parts = translatedTextFull.split('<<<BATCH_SEP>>>');
            
            batchItems.forEach((item, idx) => {
               const translation = parts[idx] ? parts[idx].trim() : item.block.content;
               const finalBlock = `${item.block.prefix || ''}${translation}`;
               
               chunkCacheRef.current.set(item.block.raw, finalBlock);
               currentRenderedBlocks[item.index] = finalBlock;
               updateProgress();
            });
            setDisplayedContent(currentRenderedBlocks.join('\n'));
         } catch (e) {
           console.error("Batch failed", e);
         }
      };

      const processSingle = async (item: typeof blocksToTranslate[0]) => {
         if (controller.signal.aborted) return;
         const { block, index } = item;
         try {
            let finalTranslatedBlock = "";
            let prefix = block.prefix || "";
            let suffix = "";

            if (block.type === 'code') {
               prefix = `\`\`\`${block.lang || ''}\n`;
               suffix = `\n\`\`\``;
            }

            let accumulatedStream = "";
            const t = await translateMarkdownToChinese(block.content, (delta) => {
              if (controller.signal.aborted) return;
              accumulatedStream += delta;
              const now = Date.now();
              if (now - lastUpdateRef.current > 100) {
                  lastUpdateRef.current = now;
                  currentRenderedBlocks[index] = `${prefix}${accumulatedStream}${suffix}`;
                  setDisplayedContent(currentRenderedBlocks.join('\n'));
              }
            }, settings);
            finalTranslatedBlock = `${prefix}${t}${suffix}`;
            
            if (controller.signal.aborted) return;

            chunkCacheRef.current.set(block.raw, finalTranslatedBlock);
            currentRenderedBlocks[index] = finalTranslatedBlock;
            setDisplayedContent(currentRenderedBlocks.join('\n'));
            updateProgress();
         } catch (e) {
            console.error("Single block failed", e);
         }
      };

      for (const batch of batches) {
        if (batch.type === 'batch') taskQueue.add(() => processBatch(batch.items));
        else taskQueue.add(() => processSingle(batch.items[0]));
      }
      
      const checkDone = setInterval(() => {
         if (completedCount >= totalBlocks || controller.signal.aborted) {
            setIsTranslating(false);
            if (onTranslatingStatusChange) onTranslatingStatusChange(false);
            clearInterval(checkDone);
         }
      }, 500);
    };

    runTranslation();
    return () => controller.abort();
  }, [content, enableTranslation, settings]);

  // --- Selection & Annotations ---
  useEffect(() => {
    const handleDocumentMouseUp = (e: MouseEvent) => {
      if (popupRef.current && popupRef.current.contains(e.target as Node)) return;

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.anchorNode || !selection.focusNode) {
        setSelectionPopup(null);
        return;
      }

      let anchorEl = selection.anchorNode.nodeType === 3 ? selection.anchorNode.parentElement : selection.anchorNode as HTMLElement;
      let focusEl = selection.focusNode.nodeType === 3 ? selection.focusNode.parentElement : selection.focusNode as HTMLElement;
      
      const blockContainer = anchorEl?.closest('[data-block-hash]');
      if (!blockContainer || !contentRef.current?.contains(blockContainer) || !blockContainer.contains(focusEl)) {
        setSelectionPopup(null);
        return;
      }

      const hash = blockContainer.getAttribute('data-block-hash');
      if (!hash) return;
      const selectedText = selection.toString();
      if (!selectedText.trim()) return;

      const startOffset = getSelectionOffsetRelativeToContainer(blockContainer as HTMLElement, selection.anchorNode!, selection.anchorOffset);
      const endOffset = getSelectionOffsetRelativeToContainer(blockContainer as HTMLElement, selection.focusNode!, selection.focusOffset);

      if (startOffset === -1 || endOffset === -1) return;

      const rect = selection.getRangeAt(0).getBoundingClientRect();
      setSelectionPopup({
        x: rect.left + (rect.width / 2),
        y: rect.top,
        text: selectedText,
        contextHash: hash,
        start: Math.min(startOffset, endOffset),
        end: Math.max(startOffset, endOffset)
      });
      setNoteInput("");
    };

    document.addEventListener('mouseup', handleDocumentMouseUp);
    return () => document.removeEventListener('mouseup', handleDocumentMouseUp);
  }, []);

  const saveAnnotation = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    if (selectionPopup && noteInput.trim()) {
      onAddAnnotation(selectionPopup.text, noteInput.trim(), selectionPopup.contextHash, selectionPopup.start, selectionPopup.end);
      setSelectionPopup(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.annotation-popup')) return;
    const block = target.closest('[data-block-hash]');
    if (block && block.textContent && ref && 'current' in ref && ref.current) {
       if (target.closest('button')) return;
       const elementRect = block.getBoundingClientRect();
       const containerRect = ref.current.getBoundingClientRect();
       if (onElementClick) onElementClick(block.textContent.substring(0, 50), elementRect.top - containerRect.top);
    }
  };

  const components = {
    h1: ({children, ...props}: any) => <AnnotatedBlock as="h1" className={currentTheme.h1} annotations={annotations} {...props}>{children}</AnnotatedBlock>,
    h2: ({children, ...props}: any) => <AnnotatedBlock as="h2" className={currentTheme.h2} annotations={annotations} {...props}>{children}</AnnotatedBlock>,
    h3: ({children, ...props}: any) => <AnnotatedBlock as="h3" className={currentTheme.h3} annotations={annotations} {...props}>{children}</AnnotatedBlock>,
    h4: ({children, ...props}: any) => <AnnotatedBlock as="h4" className={currentTheme.h4} annotations={annotations} {...props}>{children}</AnnotatedBlock>,
    p: ({children, ...props}: any) => <AnnotatedBlock as="p" className={currentTheme.p} annotations={annotations} {...props}>{children}</AnnotatedBlock>,
    blockquote: ({children, ...props}: any) => <blockquote className={currentTheme.blockquote} {...props}>{children}</blockquote>,
    li: ({children, ...props}: any) => <AnnotatedBlock as="li" className="mb-1" annotations={annotations} {...props}>{children}</AnnotatedBlock>,
    code: (props: any) => <CodeBlock {...props} annotations={annotations} />,
    ul: (props: any) => <ul className={currentTheme.list} {...props} />,
    ol: (props: any) => <ol className="list-decimal list-inside mb-4 space-y-1 text-gray-700" {...props} />,
    a: (props: any) => <a className={currentTheme.link} {...props} />,
    img: (props: any) => <img className={currentTheme.img} {...props} />,
    hr: (props: any) => <hr className={currentTheme.hr} {...props} />,
    strong: (props: any) => <strong className={currentTheme.strong} {...props} />,
  };

  return (
    <div className="relative h-full">
      {isTranslating && onTranslatingStatusChange && onTranslatingStatusChange(true)}

      {selectionPopup && createPortal(
        <div 
          ref={popupRef}
          className="annotation-popup fixed z-[100] bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-72 flex flex-col gap-2"
          style={{ 
            left: selectionPopup.x, 
            top: selectionPopup.y - 130 > 0 ? selectionPopup.y - 130 : selectionPopup.y + 30,
            transform: 'translateX(-50%)'
          }}
          onMouseDown={(e) => e.stopPropagation()} 
        >
          <div className="flex justify-between items-center text-xs text-gray-500 font-medium border-b border-gray-100 pb-2">
            <span>Add Remark</span>
            <button onClick={() => setSelectionPopup(null)}><X size={14} /></button>
          </div>
          <div className="bg-gray-50 p-2 rounded text-xs text-gray-600 italic line-clamp-2 border border-gray-100">
            "{selectionPopup.text}"
          </div>
          <input
            autoFocus
            type="text"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveAnnotation(e)}
            placeholder="Type remark..."
            className="w-full text-sm border border-gray-200 rounded px-2 py-2 outline-none focus:border-emerald-500"
          />
          <button onClick={saveAnnotation} className="w-full bg-emerald-600 text-white text-xs font-medium py-2 rounded hover:bg-emerald-700 flex items-center justify-center gap-1">
            <MessageSquarePlus size={14} /> Save
          </button>
        </div>,
        document.body
      )}

      <div 
        ref={ref}
        onClick={handleContainerClick}
        className="prose max-w-none p-8 bg-white min-h-full overflow-y-auto pb-20"
        style={{ fontFamily: theme === ThemeType.DEFAULT ? 'Inter, sans-serif' : 'Noto Sans SC, sans-serif' }}
      >
        <div ref={contentRef}>
          <ReactMarkdown remarkPlugins={[RemarkGfm]} components={components}>
            {displayedContent}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
});

Preview.displayName = 'Preview';
export default Preview;
