'use server';

import fs from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';

export interface GeminiSettings {
  apiKey?: string;
  model: string;
  isCustomModel?: boolean;
  customModelName?: string;
}

const SETTINGS_FILE_PATH = path.join(process.cwd(), '.gemini-settings.json');
const ENV_FILE_PATH = path.join(process.cwd(), '.env');

/**
 * Mask an API key for safe UI display (e.g., AQ.Ab8...1Xeg)
 */
function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 10) return '••••••••';
  return `${key.slice(0, 8)}••••••••${key.slice(-4)}`;
}

/**
 * Reads Gemini settings from .gemini-settings.json or falls back to .env
 */
export async function getGeminiSettings(): Promise<GeminiSettings & { isConfigured: boolean; maskedKey: string }> {
  let storedSettings: GeminiSettings | null = null;

  try {
    const fileContent = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8');
    storedSettings = JSON.parse(fileContent);
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.warn('Error reading .gemini-settings.json:', error);
    }
  }

  const envKey = process.env.GEMINI_API_KEY || process.env.EBOOK_AI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || '';
  const apiKey = storedSettings?.apiKey ?? envKey;

  const defaultModel = process.env.MENU_SCAN_AI_MODEL || process.env.EBOOK_AI_MODEL || 'googleai/gemini-2.5-flash';
  const model = storedSettings?.model || defaultModel;
  const isCustomModel = storedSettings?.isCustomModel ?? false;
  const customModelName = storedSettings?.customModelName ?? '';

  return {
    apiKey,
    model,
    isCustomModel,
    customModelName,
    isConfigured: Boolean(apiKey && apiKey.trim().length > 0),
    maskedKey: maskApiKey(apiKey),
  };
}

/**
 * Updates .env file with new key/value pairs
 */
async function syncToEnvFile(updates: Record<string, string>): Promise<void> {
  try {
    let envContent = '';
    try {
      envContent = await fs.readFile(ENV_FILE_PATH, 'utf-8');
    } catch (e: any) {
      if (e.code !== 'ENOENT') throw e;
    }

    let updatedContent = envContent;

    for (const [key, val] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(updatedContent)) {
        updatedContent = updatedContent.replace(regex, `${key}=${val}`);
      } else {
        updatedContent = updatedContent.trimEnd() + `\n${key}=${val}\n`;
      }
    }

    await fs.writeFile(ENV_FILE_PATH, updatedContent, 'utf-8');
  } catch (err) {
    console.warn('Could not sync Gemini settings to .env file:', err);
  }
}

/**
 * Saves Gemini settings to file, runtime process.env, and .env
 */
export async function saveGeminiSettings(settings: {
  apiKey?: string;
  model: string;
  isCustomModel?: boolean;
  customModelName?: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const effectiveModel = settings.isCustomModel && settings.customModelName?.trim()
      ? settings.customModelName.trim()
      : settings.model || 'googleai/gemini-2.5-flash';

    const cleanApiKey = settings.apiKey?.trim() || '';

    const payload: GeminiSettings = {
      apiKey: cleanApiKey,
      model: effectiveModel,
      isCustomModel: Boolean(settings.isCustomModel),
      customModelName: settings.customModelName?.trim() || '',
    };

    // 1. Save to JSON file
    await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');

    // 2. Update current Node.js process.env in runtime
    if (cleanApiKey) {
      process.env.GEMINI_API_KEY = cleanApiKey;
      process.env.EBOOK_AI_API_KEY = cleanApiKey;
    }
    process.env.MENU_SCAN_AI_MODEL = effectiveModel;
    process.env.EBOOK_AI_MODEL = effectiveModel;

    // 3. Persist to .env
    const envUpdates: Record<string, string> = {
      MENU_SCAN_AI_MODEL: effectiveModel,
      EBOOK_AI_MODEL: effectiveModel,
    };
    if (cleanApiKey) {
      envUpdates.GEMINI_API_KEY = cleanApiKey;
      envUpdates.EBOOK_AI_API_KEY = cleanApiKey;
    }
    await syncToEnvFile(envUpdates);

    revalidatePath('/m-admin/settings');
    revalidatePath('/', 'layout');

    return {
      success: true,
      message: 'Gemini API settings saved successfully.',
    };
  } catch (error: any) {
    console.error('Error saving Gemini settings:', error);
    return {
      success: false,
      error: error?.message || 'Could not save Gemini settings.',
    };
  }
}

/**
 * Tests connection to Google Gemini REST API directly without heavy Genkit bundling
 */
export async function testGeminiConnection(
  apiKey?: string,
  model?: string
): Promise<{ success: boolean; latencyMs?: number; reply?: string; error?: string }> {
  try {
    const current = await getGeminiSettings();
    const keyToUse = apiKey?.trim() || current.apiKey;
    const modelToUse = model?.trim() || current.model || 'googleai/gemini-2.5-flash';

    if (!keyToUse) {
      return {
        success: false,
        error: 'Please provide or configure a Gemini API key first.',
      };
    }

    const startTime = Date.now();
    const cleanModel = (modelToUse || 'gemini-2.5-flash').replace(/^googleai\//, '').replace(/^models\//, '');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cleanModel)}:generateContent?key=${encodeURIComponent(keyToUse)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: 'Respond with: "MenuSnap AI OK"' }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 10,
          temperature: 0.1,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data?.error?.message || `Google API error (Status ${response.status})`;
      return {
        success: false,
        error: msg,
      };
    }

    const latencyMs = Date.now() - startTime;
    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'MenuSnap AI OK';

    return {
      success: true,
      latencyMs,
      reply: replyText,
    };
  } catch (error: any) {
    console.error('Gemini test connection failed:', error);
    return {
      success: false,
      error: error?.message || 'Failed to connect to Google Gemini. Please check your network or API key.',
    };
  }
}

/**
 * Dynamic helper for other server actions (scan-menu, ebook-studio, etc.)
 */
export async function getEffectiveGeminiConfig(): Promise<{ apiKey: string; model: string }> {
  const settings = await getGeminiSettings();
  return {
    apiKey: settings.apiKey || '',
    model: settings.model || 'googleai/gemini-2.5-flash',
  };
}
