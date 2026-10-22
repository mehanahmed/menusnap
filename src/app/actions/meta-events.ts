'use server';

import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export interface MetaPixelSettings {
  isEnabled: boolean;
  pixelId?: string;
  accessToken?: string;
  testEventCode?: string;
  graphVersion?: string;
}

const SETTINGS_FILE_PATH = path.join(process.cwd(), '.meta-pixel-settings.json');

/**
 * Retrieves Meta Pixel settings from the JSON file.
 */
export async function getMetaPixelSettings(): Promise<MetaPixelSettings> {
  try {
    const fileContent = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return { isEnabled: false, pixelId: '', accessToken: '', testEventCode: '' };
    }
    console.error('Error reading Meta Pixel settings:', error);
    throw new Error('Could not read settings file.');
  }
}

/**
 * Saves Meta Pixel settings to the JSON file.
 * @param settings The settings to save.
 */
export async function saveMetaPixelSettings(settings: MetaPixelSettings): Promise<void> {
  try {
    if (settings.isEnabled && !settings.pixelId) {
      throw new Error("Pixel ID is required when tracking is enabled.");
    }
    const data = JSON.stringify(settings, null, 2);
    await fs.writeFile(SETTINGS_FILE_PATH, data, 'utf-8');
  } catch (error: any) {
    console.error('Error saving Meta Pixel settings:', error);
    throw new Error(error.message || 'Could not save settings file.');
  }
}

/**
 * Sends a server-side event to the Meta Conversions API.
 * Uses the enhanced CAPI engine with SHA-256 hashing and deduplication.
 */
export async function sendServerEvent(
  eventName: string,
  eventData: Record<string, any> = {}
) {
  const { sendMetaCapiEvent } = await import('@/lib/meta-capi');
  const eventId = eventData.event_id || randomUUID();

  return sendMetaCapiEvent({
    eventName: eventName as any,
    eventId,
    eventSourceUrl: eventData.event_source_url,
    userData: eventData.user_data || {},
    customData: eventData.custom_data || {},
  });
}
