
import { GoogleGenAI } from "@google/genai";
import { AISettings } from "../types";

// --- Helpers ---

const getSettings = (overrides?: AISettings) => {
  if (overrides) return overrides;
  return {
    provider: 'google-free',
    baseUrl: '',
    apiKey: '',
    model: ''
  } as AISettings;
};

// --- Google GenAI SDK (Official) ---
const streamGoogleGenAI = async (
  systemPrompt: string,
  userPrompt: string,
  settings: AISettings,
  onChunk?: (text: string) => void
): Promise<string> => {
  try {
    if (!settings.apiKey) {
      throw new Error("API Key is required for Google Gemini.");
    }

    const ai = new GoogleGenAI({ apiKey: settings.apiKey });
    // Use user model or fallback.
    const modelName = settings.model || 'gemini-2.5-flash';

    const response = await ai.models.generateContentStream({
      model: modelName,
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }
      ],
      config: {
        temperature: 0.1,
      }
    });

    let fullText = "";
    for await (const chunk of response) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        if (onChunk) onChunk(text);
      }
    }
    return fullText;

  } catch (error: any) {
    console.error("Google SDK Error:", error);
    if (error.message?.includes('404') || error.status === 404) {
      throw new Error(`Model '${settings.model}' not found (404). Please check the Model Name in Settings.`);
    }
    throw new Error(`Google Gemini API Error: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// --- OpenAI / Custom Compatible Fetch ---
const customFetchStream = async (
  systemPrompt: string,
  userPrompt: string, 
  settings: AISettings, 
  onChunk?: (text: string) => void
): Promise<string> => {
  try {
    let baseUrl = settings.baseUrl.trim();
    if (!baseUrl) throw new Error("Base URL is required for Custom provider");

    // Robust URL construction
    let fetchUrl: string;

    // Check if the user already provided the full endpoint
    if (baseUrl.endsWith('/chat/completions')) {
        fetchUrl = baseUrl;
    } else {
        // Remove trailing slash for cleaner append
        const cleanBase = baseUrl.replace(/\/+$/, '');
        fetchUrl = `${cleanBase}/chat/completions`;
    }

    // Default to gpt-4o for OpenAI endpoint compatibility if not specified
    const modelToUse = settings.model || "gpt-4o";

    console.log("[Translate] POST URL:", fetchUrl);
    console.log("[Translate] Model:", modelToUse);

    // FIX: OpenAI models sometimes ignore context if not explicitly asked to process the following content.
    // especially if the content is just a markdown code block.
    const augmentedUserPrompt = `Please translate the following Markdown content:\n\n${userPrompt}`;

    const response = await fetch(fetchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: modelToUse, 
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: augmentedUserPrompt }
        ],
        stream: true,
        temperature: 0.1 
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Translate] Error Body:", errText);
      
      let errorMessage = `API Error (${response.status})`;
      
      // Try to parse JSON error for better message
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error && errJson.error.message) {
             errorMessage += `: ${errJson.error.message}`;
        } else if (errJson.message) {
             errorMessage += `: ${errJson.message}`;
        }
      } catch (e) {
        errorMessage += `: ${errText.substring(0, 100)}`;
      }

      if (response.status === 404) {
        throw new Error(`Model '${modelToUse}' not found (404). Please check your Model Name. (Note: gemini-2.5-flash may not support OpenAI endpoint yet, try gemini-1.5-flash).`);
      }

      throw new Error(errorMessage);
    }

    if (!response.body) return "";

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      buffer = lines.pop() || ""; 

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
            const jsonPart = trimmed.slice(5).trim();
            if (jsonPart === '[DONE]') continue;
            if (!jsonPart) continue;

            try {
                const data = JSON.parse(jsonPart);
                const content = data.choices?.[0]?.delta?.content || "";
                if (content) {
                    fullText += content;
                    if (onChunk) onChunk(content);
                }
            } catch (e) {
                // Ignore parse errors for partial chunks
            }
        }
      }
    }
    
    return fullText;
  } catch (error) {
    console.error("Custom Stream Error:", error);
    throw error;
  }
};

// --- Google Free Translation API (Fallback) ---
const googleTranslateFree = async (text: string, onChunk?: (text: string) => void): Promise<string> => {
  try {
    // For very long texts, split into chunks to avoid URL length limits
    const maxLength = 2000; // Safe limit for URL length
    if (text.length > maxLength) {
      // Split by lines to avoid breaking words
      const lines = text.split('\n');
      let chunks: string[] = [];
      let currentChunk = '';

      for (const line of lines) {
        if ((currentChunk + '\n' + line).length > maxLength && currentChunk) {
          chunks.push(currentChunk);
          currentChunk = line;
        } else {
          currentChunk = currentChunk ? currentChunk + '\n' + line : line;
        }
      }
      if (currentChunk) chunks.push(currentChunk);

      let fullTranslated = '';
      for (const chunk of chunks) {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(chunk)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Google Free API Error: ${response.status}`);

        const data = await response.json();
        if (Array.isArray(data) && Array.isArray(data[0])) {
          const translatedText = data[0].map((segment: any) => segment[0]).join('');
          fullTranslated += translatedText;
        } else {
          fullTranslated += chunk; // Fallback to original if translation fails
        }
      }

      if (onChunk) onChunk(fullTranslated);
      return fullTranslated;
    } else {
      // Standard translation for shorter texts
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Google Free API Error: ${response.status}`);

      const data = await response.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translatedText = data[0].map((segment: any) => segment[0]).join('');
        if (onChunk) onChunk(translatedText);
        return translatedText;
      }
      return text;
    }
  } catch (error) {
    console.warn("Free Translation Failed", error);
    return text;
  }
};

// --- Main Service Functions ---

export const streamResponse = async (
  prompt: string, 
  context?: string,
  onChunk?: (text: string) => void,
  settings?: AISettings
): Promise<string> => {
  const config = getSettings(settings);
  const systemPrompt = "You are a helpful AI assistant.";
  const fullPrompt = prompt + (context ? `\n\nContext:\n${context}` : "");

  if (config.provider === 'google-sdk' && config.apiKey) {
      return streamGoogleGenAI(systemPrompt, fullPrompt, config, onChunk);
  }
  
  if (config.provider === 'custom') {
    return customFetchStream(systemPrompt, fullPrompt, config, onChunk);
  }

  return "Please configure a valid AI Provider (Google Gemini SDK or Custom) in settings to use the AI Assistant.";
};

export const translateMarkdownToChinese = async (
  markdown: string, 
  onChunk?: (text: string) => void,
  settings?: AISettings
): Promise<string> => {
  const config = getSettings(settings);

  // Optimized System Prompt to reduce hallucinations
  const systemPrompt = `You are a strict translation engine. Translate the following Markdown text to Simplified Chinese (Zh-CN).

STRICT INSTRUCTIONS:
1. Output ONLY the translated text.
2. DO NOT start with "Here is the translation" or "Translation:".
3. DO NOT wrap the output in markdown code fences (like \`\`\`markdown) unless the input text itself is inside them.
4. Keep all existing markdown formatting (#, *, -, links, images) EXACTLY as they are.
5. Do NOT translate content inside code blocks or inline code.
6. If the text is already Chinese, return it exactly as is.
7. Translate concisely and professionally.`;

  // 1. Google Gemini SDK
  if (config.provider === 'google-sdk') {
      return streamGoogleGenAI(systemPrompt, markdown, config, onChunk);
  }

  // 2. Custom LLM
  if (config.provider === 'custom') {
    return customFetchStream(systemPrompt, markdown, config, onChunk);
  }

  // 3. Google Free (Default)
  return googleTranslateFree(markdown, onChunk);
};
