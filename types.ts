
export enum ThemeType {
  DEFAULT = 'Default',
  EMERALD = 'Emerald',
  PURPLE = 'Purple',
  BLUE = 'Blue',
  ORANGE = 'Orange'
}

export interface ThemeStyles {
  h1: string;
  h2: string;
  h3: string;
  h4: string;
  p: string;
  blockquote: string;
  list: string;
  link: string;
  code: string;
  img: string;
  hr: string;
  strong: string;
}

export interface AISettings {
  provider: 'google-free' | 'google-sdk' | 'custom';
  baseUrl: string;
  apiKey: string;
  model: string;
  concurrency: number;
  batchSize: number;
}

export interface Annotation {
  id: string;
  text: string; // The selected text content
  note: string; // The user's remark
  timestamp: number;
  contextHash: string; // Hash of the containing block to prevent duplicates in other blocks
  startOffset: number; // Start index in the block text
  endOffset: number; // End index in the block text
  globalStartOffset?: number; // Start index in the entire document
  globalEndOffset?: number; // End index in the entire document
}

export const THEMES: Record<ThemeType, ThemeStyles> = {
  [ThemeType.DEFAULT]: {
    h1: "text-3xl font-bold mb-6 pb-2 border-b border-gray-200 text-gray-900",
    h2: "text-2xl font-bold mb-4 mt-8 pb-1 border-b border-gray-100 text-gray-800",
    h3: "text-xl font-bold mb-3 mt-6 text-gray-800",
    h4: "text-lg font-bold mb-2 mt-4 text-gray-800",
    p: "mb-4 leading-7 text-gray-700",
    blockquote: "border-l-4 border-gray-300 pl-4 py-1 my-4 bg-gray-50 text-gray-600 italic",
    list: "list-disc list-inside mb-4 space-y-1 text-gray-700",
    link: "text-blue-600 hover:underline",
    code: "bg-gray-100 text-pink-600 px-1.5 rounded text-sm font-mono break-words", // Removed inline-block
    img: "rounded-lg shadow-md my-6 max-w-full mx-auto",
    hr: "my-8 border-gray-200",
    strong: "font-bold text-gray-900"
  },
  [ThemeType.EMERALD]: {
    h1: "text-3xl font-bold mb-6 text-center text-emerald-800 border-b-2 border-emerald-500 pb-4",
    h2: "text-2xl font-bold mb-4 mt-8 px-3 py-1 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 inline-block rounded-r-lg",
    h3: "text-xl font-bold mb-3 mt-6 text-emerald-700",
    h4: "text-lg font-bold mb-2 mt-4 text-emerald-600 border-b border-emerald-100 inline-block",
    p: "mb-4 leading-7 text-gray-700 text-justify",
    blockquote: "border-l-4 border-emerald-500 pl-4 py-2 my-4 bg-emerald-50 text-emerald-800 rounded-r-lg shadow-sm",
    list: "list-disc list-inside mb-4 space-y-1 text-gray-700 marker:text-emerald-500",
    link: "text-emerald-600 underline decoration-emerald-300 underline-offset-2",
    code: "bg-emerald-50 text-emerald-700 px-1.5 rounded text-sm font-mono border border-emerald-100 break-words",
    img: "rounded-xl shadow-lg my-6 max-w-full mx-auto border-2 border-emerald-100",
    hr: "my-8 border-t-2 border-dashed border-emerald-200 w-1/2 mx-auto",
    strong: "font-bold text-emerald-900"
  },
  [ThemeType.PURPLE]: {
    h1: "text-3xl font-bold mb-6 text-purple-900 border-b-4 border-purple-200 pb-2",
    h2: "text-2xl font-bold mb-4 mt-8 text-purple-800 flex items-center before:content-[''] before:block before:w-2 before:h-6 before:bg-purple-600 before:mr-3",
    h3: "text-xl font-bold mb-3 mt-6 text-purple-700",
    h4: "text-lg font-bold mb-2 mt-4 text-purple-600",
    p: "mb-4 leading-relaxed text-gray-700",
    blockquote: "relative p-4 my-6 border-l-4 border-purple-500 bg-purple-50 text-purple-900 rounded-r",
    list: "list-disc list-inside mb-4 space-y-1 text-gray-700 marker:text-purple-500",
    link: "text-purple-600 font-medium hover:text-purple-800",
    code: "bg-purple-100 text-purple-800 px-1.5 rounded text-sm font-mono break-words",
    img: "rounded-lg shadow-md my-6 max-w-full mx-auto",
    hr: "my-8 border-purple-100",
    strong: "font-bold text-purple-900"
  },
  [ThemeType.BLUE]: {
    h1: "text-3xl font-extrabold mb-6 text-blue-900 text-center uppercase tracking-wide",
    h2: "text-2xl font-bold mb-4 mt-8 text-white bg-blue-600 px-4 py-2 rounded-lg shadow-md inline-block",
    h3: "text-xl font-bold mb-3 mt-6 text-blue-800 border-b border-blue-200 inline-block pb-1",
    h4: "text-lg font-bold mb-2 mt-4 text-blue-700",
    p: "mb-4 leading-7 text-gray-700",
    blockquote: "border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 text-blue-800 shadow-inner",
    list: "list-square list-inside mb-4 space-y-1 text-gray-700 marker:text-blue-500",
    link: "text-blue-600 underline",
    code: "bg-blue-50 text-blue-700 px-1 rounded border border-blue-200 text-sm font-mono break-words",
    img: "rounded shadow-lg my-6 max-w-full mx-auto ring-4 ring-blue-50",
    hr: "my-8 border-blue-200",
    strong: "font-bold text-blue-900"
  },
  [ThemeType.ORANGE]: {
    h1: "text-3xl font-bold mb-6 text-orange-900 border-b border-orange-300 pb-4",
    h2: "text-2xl font-bold mb-4 mt-8 text-orange-800 border-l-8 border-orange-500 pl-3",
    h3: "text-xl font-bold mb-3 mt-6 text-orange-700",
    h4: "text-lg font-bold mb-2 mt-4 text-orange-600 uppercase tracking-widest text-sm",
    p: "mb-4 leading-7 text-gray-700",
    blockquote: "border-t-2 border-b-2 border-orange-200 py-4 my-6 text-center text-orange-800 bg-orange-50 italic",
    list: "list-decimal list-inside mb-4 space-y-1 text-gray-700 marker:text-orange-600 marker:font-bold",
    link: "text-orange-600 hover:text-orange-700 border-b border-orange-400",
    code: "bg-orange-100 text-orange-800 px-1.5 rounded text-sm font-mono break-words",
    img: "rounded-xl shadow-orange-200 shadow-lg my-6 max-w-full mx-auto",
    hr: "my-8 border-orange-200",
    strong: "font-bold text-orange-900"
  }
};
