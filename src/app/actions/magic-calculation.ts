'use server';

import pool from '@/lib/mysql';
import {
  IngredientItem,
  RecipeItem,
  CostingSettings,
  DEFAULT_SETTINGS,
  SAMPLE_INGREDIENTS,
  SAMPLE_RECIPES,
} from '@/types/magic-calculation';

/**
 * Ensures the client_magic_calculations table exists in MySQL.
 */
export async function ensureMagicCalculationsTable(): Promise<void> {
  try {
    await (pool as any).execute(`
      CREATE TABLE IF NOT EXISTS client_magic_calculations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NULL,
        business_name VARCHAR(255) NOT NULL,
        whatsapp_number VARCHAR(50) NULL,
        email VARCHAR(255) NULL,
        ingredients LONGTEXT NOT NULL,
        recipes LONGTEXT NOT NULL,
        settings LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_client (client_id),
        INDEX idx_phone (whatsapp_number),
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } catch (err) {
    console.error('Error in ensureMagicCalculationsTable:', err);
    throw err;
  }
}

export interface MagicCalcData {
  ingredients: Record<string, IngredientItem>;
  recipes: Record<string, RecipeItem>;
  settings: CostingSettings;
  updatedAt?: string;
}

export interface ClientQuery {
  clientId?: number;
  whatsappNumber?: string;
  email?: string;
}

export interface SaveMagicCalcPayload {
  clientId?: number;
  businessName?: string;
  whatsappNumber?: string;
  email?: string;
  ingredients: Record<string, IngredientItem>;
  recipes: Record<string, RecipeItem>;
  settings: CostingSettings;
}

/**
 * Fetches the saved calculations for a client from MySQL.
 */
export async function getMagicCalculationAction(query: ClientQuery): Promise<{
  success: boolean;
  data?: MagicCalcData;
  error?: string;
}> {
  try {
    await ensureMagicCalculationsTable();

    const cleanPhone = (query.whatsappNumber || '').trim();
    const cleanEmail = (query.email || '').trim().toLowerCase();
    const clientId = Number(query.clientId) || null;

    if (!clientId && !cleanPhone && !cleanEmail) {
      // Return default sample data for unauthenticated visitors
      return {
        success: true,
        data: {
          ingredients: SAMPLE_INGREDIENTS,
          recipes: SAMPLE_RECIPES,
          settings: DEFAULT_SETTINGS,
        },
      };
    }

    const [rows]: any = await (pool as any).execute(
      `SELECT id, ingredients, recipes, settings, updated_at 
       FROM client_magic_calculations 
       WHERE (client_id = ? AND ? IS NOT NULL) 
          OR (whatsapp_number = ? AND ? != '') 
          OR (email = ? AND ? != '') 
       ORDER BY id DESC LIMIT 1`,
      [clientId, clientId, cleanPhone, cleanPhone, cleanEmail, cleanEmail]
    );

    if (!rows || rows.length === 0) {
      return {
        success: true,
        data: {
          ingredients: SAMPLE_INGREDIENTS,
          recipes: SAMPLE_RECIPES,
          settings: DEFAULT_SETTINGS,
        },
      };
    }

    const row = rows[0];
    let ingredients = SAMPLE_INGREDIENTS;
    let recipes = SAMPLE_RECIPES;
    let settings = DEFAULT_SETTINGS;

    try {
      ingredients = JSON.parse(row.ingredients);
    } catch {}

    try {
      recipes = JSON.parse(row.recipes);
    } catch {}

    try {
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(row.settings) };
    } catch {}

    return {
      success: true,
      data: {
        ingredients,
        recipes,
        settings,
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      },
    };
  } catch (error: any) {
    console.error('getMagicCalculationAction error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch calculation data.',
    };
  }
}

/**
 * Saves or updates client calculations in MySQL.
 */
export async function saveMagicCalculationAction(payload: SaveMagicCalcPayload): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    await ensureMagicCalculationsTable();

    const cleanPhone = (payload.whatsappNumber || '').trim();
    const cleanEmail = (payload.email || '').trim().toLowerCase();
    const clientId = Number(payload.clientId) || null;
    const businessName = (payload.businessName || 'My Restaurant').trim();

    const ingredientsJson = JSON.stringify(payload.ingredients || {});
    const recipesJson = JSON.stringify(payload.recipes || {});
    const settingsJson = JSON.stringify(payload.settings || DEFAULT_SETTINGS);

    // Look for existing row
    const [existingRows]: any = await (pool as any).execute(
      `SELECT id FROM client_magic_calculations 
       WHERE (client_id = ? AND ? IS NOT NULL) 
          OR (whatsapp_number = ? AND ? != '') 
          OR (email = ? AND ? != '') 
       ORDER BY id DESC LIMIT 1`,
      [clientId, clientId, cleanPhone, cleanPhone, cleanEmail, cleanEmail]
    );

    if (existingRows && existingRows.length > 0) {
      const existingId = existingRows[0].id;
      await (pool as any).execute(
        `UPDATE client_magic_calculations 
         SET business_name = ?, 
             ingredients = ?, 
             recipes = ?, 
             settings = ?, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [businessName, ingredientsJson, recipesJson, settingsJson, existingId]
      );
    } else {
      await (pool as any).execute(
        `INSERT INTO client_magic_calculations 
          (client_id, business_name, whatsapp_number, email, ingredients, recipes, settings) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clientId, businessName, cleanPhone || null, cleanEmail || null, ingredientsJson, recipesJson, settingsJson]
      );
    }

    return {
      success: true,
      message: 'Costing and pricing calculations saved successfully.',
    };
  } catch (error: any) {
    console.error('saveMagicCalculationAction error:', error);
    return {
      success: false,
      error: error.message || 'Failed to save calculation.',
    };
  }
}

/**
 * Deletes all calculation data for this client from MySQL.
 */
export async function deleteMagicCalculationAction(query: ClientQuery): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await ensureMagicCalculationsTable();

    const cleanPhone = (query.whatsappNumber || '').trim();
    const cleanEmail = (query.email || '').trim().toLowerCase();
    const clientId = Number(query.clientId) || null;

    if (!clientId && !cleanPhone && !cleanEmail) {
      return { success: true };
    }

    await (pool as any).execute(
      `DELETE FROM client_magic_calculations 
       WHERE (client_id = ? AND ? IS NOT NULL) 
          OR (whatsapp_number = ? AND ? != '') 
          OR (email = ? AND ? != '')`,
      [clientId, clientId, cleanPhone, cleanPhone, cleanEmail, cleanEmail]
    );

    return { success: true };
  } catch (error: any) {
    console.error('deleteMagicCalculationAction error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete calculation data.',
    };
  }
}
