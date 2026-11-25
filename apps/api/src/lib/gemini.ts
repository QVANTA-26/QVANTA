import axios from 'axios';

export interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

export interface GeminiContent {
  role?: 'user' | 'model';
  parts: GeminiPart[];
}

/**
 * Preferred model first (GEMINI_MODEL, else the rolling `gemini-flash-latest`
 * alias), then fallbacks. Free-tier keys frequently see 503 "high demand" and
 * retired model names, so trying the next candidate keeps replies working.
 */
export function geminiModelCandidates(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim() || 'gemini-flash-latest';
  return Array.from(
    new Set([preferred, 'gemini-flash-latest', 'gemini-3.8-flash', 'gemini-flash-lite-latest'])
  );
}

/**
 * Calls the Generative Language REST API for a single turn, retrying the next
 * candidate model whenever Google reports the current one as missing or
 * overloaded. Returns the concatenated text of the first successful response.
 */
export async function generateGeminiText(options: {
  contents: GeminiContent[];
  systemInstruction?: string;
  maxOutputTokens: number;
  temperature: number;
  timeoutMs: number;
}): Promise<string> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  let lastError: unknown;
  for (const model of geminiModelCandidates()) {
    try {
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          contents: options.contents,
          ...(options.systemInstruction
            ? { systemInstruction: { role: 'system', parts: [{ text: options.systemInstruction }] } }
            : {}),
          generationConfig: { maxOutputTokens: options.maxOutputTokens, temperature: options.temperature },
        },
        { timeout: options.timeoutMs, headers: { 'Content-Type': 'application/json' } }
      );

      const text = res.data?.candidates?.[0]?.content?.parts
        ?.map((part: GeminiPart) => part.text ?? '')
        .join('\n')
        .trim();

      if (text) {
        return text;
      }
      lastError = new Error(`Gemini (${model}) returned an empty response`);
    } catch (error) {
      lastError = error;
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      // Retry the next model only on availability errors; surface anything else.
      if (status !== 404 && status !== 429 && status !== 503) {
        break;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
