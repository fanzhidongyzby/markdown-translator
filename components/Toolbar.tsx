
import React from 'react';
import { 
  Bold, Italic, Heading1, Heading2, Heading3, Quote, 
  List, ListOrdered, Link, Image as ImageIcon, Code, Minus,
  Undo, Redo
} from 'lucide-react';

interface ToolbarProps {
  onInsert: (syntax: string, type: 'block' | 'inline' | 'wrap') => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({ onInsert, onUndo, onRedo, canUndo, canRedo }) => {
  const tools = [
    { type: 'action', icon: <Undo size={18} />, label: 'Undo', action: onUndo, disabled: !canUndo },
    { type: 'action', icon: <Redo size={18} />, label: 'Redo', action: onRedo, disabled: !canRedo },
    // Separators removed
    { icon: <Bold size={18} />, label: 'Bold', action: () => onInsert('**', 'wrap') },
    { icon: <Italic size={18} />, label: 'Italic', action: () => onInsert('*', 'wrap') },
    { icon: <Heading1 size={18} />, label: 'H1', action: () => onInsert('# ', 'block') },
    { icon: <Heading2 size={18} />, label: 'H2', action: () => onInsert('## ', 'block') },
    { icon: <Heading3 size={18} />, label: 'H3', action: () => onInsert('### ', 'block') },
    { icon: <Quote size={18} />, label: 'Quote', action: () => onInsert('> ', 'block') },
    { icon: <List size={18} />, label: 'List', action: () => onInsert('- ', 'block') },
    { icon: <ListOrdered size={18} />, label: 'Ordered List', action: () => onInsert('1. ', 'block') },
    { icon: <Link size={18} />, label: 'Link', action: () => onInsert('[Link Text](url)', 'inline') },
    { icon: <ImageIcon size={18} />, label: 'Image', action: () => onInsert('![Alt Text](url)', 'inline') },
    { icon: <Code size={18} />, label: 'Code', action: () => onInsert('```\ncode\n```', 'inline') },
    { icon: <Minus size={18} />, label: 'Divider', action: () => onInsert('\n---\n', 'inline') },
  ];

  return (
    <div className="flex items-center gap-1 px-2 py-2 bg-white border-b border-gray-200 overflow-x-auto scrollbar-thin">
      {tools.map((tool, index) => {
        return (
          <button
            key={index}
            onClick={tool.action}
            disabled={tool.disabled}
            className="p-1.5 text-gray-600 hover:bg-gray-100 hover:text-primary rounded transition-colors flex-shrink-0 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-600"
            title={tool.label}
          >
            {tool.icon}
          </button>
        );
      })}
    </div>
  );
};

export default Toolbar;
