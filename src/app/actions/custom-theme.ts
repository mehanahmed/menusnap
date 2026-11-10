"use server";

import pool from '@/lib/mysql';

export interface CustomThemeConfig {
  bgImageUrl?: string | null;
  shadeId: 'charcoal' | 'wine' | 'espresso' | 'white' | 'gold' | 'cream';
  updatedAt?: string;
}

let columnsEnsured = false;
async function ensureCustomThemeColumns() {
  if (columnsEnsured) return;
  try {
    const [clientCols]: any = await pool.query("SHOW COLUMNS FROM clients LIKE 'custom_theme_json'");
    if (!clientCols || clientCols.length === 0) {
      await pool.query("ALTER TABLE clients ADD COLUMN custom_theme_json LONGTEXT NULL");
    }
  } catch {}
  try {
    const [draftCols]: any = await pool.query("SHOW COLUMNS FROM user_drafts LIKE 'custom_theme_json'");
    if (!draftCols || draftCols.length === 0) {
      await pool.query("ALTER TABLE user_drafts ADD COLUMN custom_theme_json LONGTEXT NULL");
    }
  } catch {}
  columnsEnsured = true;
}

/**
 * Saves or updates a client's single custom design theme.
 * If draftId is provided, also attaches to the specific draft in user_drafts.
 */
export async function saveClientCustomThemeAction(params: {
  clientId?: number | null;
  whatsappNumber?: string | null;
  email?: string | null;
  draftId?: string | null;
  themeConfig: CustomThemeConfig;
}): Promise<{ success: boolean; themeConfig?: CustomThemeConfig; error?: string }> {
  try {
    await ensureCustomThemeColumns();
    const { clientId, whatsappNumber, email, draftId, themeConfig } = params;
    const cleanConfig: CustomThemeConfig = {
      bgImageUrl: themeConfig.bgImageUrl || null,
      shadeId: themeConfig.shadeId || 'charcoal',
      updatedAt: new Date().toISOString(),
    };
    const jsonStr = JSON.stringify(cleanConfig);

    const cleanPhone = (whatsappNumber || '').trim();
    const cleanEmail = (email || '').trim();

    // 1. Update clients table if client identifier exists
    if (clientId || cleanPhone || cleanEmail) {
      try {
        await pool.execute(
          `UPDATE clients 
           SET custom_theme_json = ? 
           WHERE (id = ? AND ? IS NOT NULL) 
              OR (whatsapp_number = ? AND ? != '') 
              OR (email = ? AND ? != '')`,
          [jsonStr, clientId || null, clientId || null, cleanPhone, cleanPhone, cleanEmail, cleanEmail]
        );
      } catch (err) {
        console.warn('Error saving custom theme to clients table:', err);
      }
    }

    // 2. Also save to user_drafts table if draftId provided
    if (draftId) {
      try {
        await pool.execute(
          `UPDATE user_drafts 
           SET custom_theme_json = ? 
           WHERE draft_id = ? OR id = ?`,
          [jsonStr, draftId, isNaN(Number(draftId)) ? 0 : Number(draftId)]
        );
      } catch (draftErr) {
        console.warn('Error saving custom theme to user_drafts table:', draftErr);
      }
    }

    return { success: true, themeConfig: cleanConfig };
  } catch (error: any) {
    console.error('saveClientCustomThemeAction error:', error);
    return { success: false, error: error.message || 'Failed to save custom theme' };
  }
}

/**
 * Fetches the saved custom design theme for a client or draft.
 */
export async function getClientCustomThemeAction(params: {
  clientId?: number | null;
  whatsappNumber?: string | null;
  email?: string | null;
  draftId?: string | null;
}): Promise<{ success: boolean; themeConfig?: CustomThemeConfig | null; error?: string }> {
  try {
    await ensureCustomThemeColumns();
    const { clientId, whatsappNumber, email, draftId } = params;
    const cleanPhone = (whatsappNumber || '').trim();
    const cleanEmail = (email || '').trim();

    // 1. Try fetching from specific draft first
    if (draftId) {
      try {
        const [draftRows]: any = await pool.execute(
          `SELECT custom_theme_json FROM user_drafts 
           WHERE (draft_id = ? OR id = ?) AND custom_theme_json IS NOT NULL 
           LIMIT 1`,
          [draftId, isNaN(Number(draftId)) ? 0 : Number(draftId)]
        );
        if (draftRows && draftRows.length > 0 && draftRows[0].custom_theme_json) {
          const parsed = JSON.parse(draftRows[0].custom_theme_json);
          return { success: true, themeConfig: parsed };
        }
      } catch (dErr) {
        console.warn('Draft custom theme query note:', dErr);
      }
    }

    // 2. Fallback to client profile saved custom design
    if (clientId || cleanPhone || cleanEmail) {
      try {
        const [clientRows]: any = await pool.execute(
          `SELECT custom_theme_json FROM clients 
           WHERE ((id = ? AND ? IS NOT NULL) OR (whatsapp_number = ? AND ? != '') OR (email = ? AND ? != '')) 
             AND custom_theme_json IS NOT NULL 
           ORDER BY id DESC LIMIT 1`,
          [clientId || null, clientId || null, cleanPhone, cleanPhone, cleanEmail, cleanEmail]
        );
        if (clientRows && clientRows.length > 0 && clientRows[0].custom_theme_json) {
          const parsed = JSON.parse(clientRows[0].custom_theme_json);
          return { success: true, themeConfig: parsed };
        }
      } catch (cErr) {
        console.warn('Client custom theme query note:', cErr);
      }
    }

    return { success: true, themeConfig: null };
  } catch (error: any) {
    console.error('getClientCustomThemeAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch custom theme' };
  }
}

/**
 * Deletes or clears the background image from a client's custom design.
 */
export async function deleteClientCustomBackgroundAction(params: {
  clientId?: number | null;
  whatsappNumber?: string | null;
  email?: string | null;
  draftId?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await getClientCustomThemeAction(params);
    const updatedConfig: CustomThemeConfig = {
      bgImageUrl: null,
      shadeId: existing.themeConfig?.shadeId || 'charcoal',
      updatedAt: new Date().toISOString(),
    };

    return await saveClientCustomThemeAction({
      ...params,
      themeConfig: updatedConfig,
    });
  } catch (error: any) {
    console.error('deleteClientCustomBackgroundAction error:', error);
    return { success: false, error: error.message || 'Failed to delete background' };
  }
}

