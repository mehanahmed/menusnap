'use server';

import { z } from 'zod';
import { saveUserDraftAction, UserDraftItem } from '@/app/actions/user-drafts';
import pool from '@/lib/mysql';
import { checkClientSubscription } from '@/app/actions/clients';
import { getEffectiveGeminiConfig } from '@/app/actions/gemini-settings';

const ScannedItemSchema = z.object({
  name: z.string().describe("The clean, readable name of the menu item / food / service"),
  price: z.number().describe("The price as a positive numeric number (digits only, e.g. 250). If not listed, use 0."),
  category: z.string().describe("The section, course, or category name this item belongs to, e.g. Starters, Main Course, Biryani, Pasta, Drinks, Dessert"),
  description: z.string().optional().describe("Ingredients, portion size, spicy level or description if visible"),
});

const ScannedMenuResponseSchema = z.object({
  detectedMenuTitle: z.string().optional().describe("Restaurant or Parlour brand title visible on the menu, if any"),
  items: z.array(ScannedItemSchema).describe("List of all extracted items found on the menu"),
});

export interface ScanMenuActionResult {
  success: boolean;
  error?: string;
  draft?: any;
  itemsCount?: number;
  remainingScans?: number | 'unlimited';
}

export async function scanMenuImageAction(formData: FormData): Promise<ScanMenuActionResult> {
  try {
    const { apiKey: effectiveKey, model: configuredModel } = await getEffectiveGeminiConfig();
    const apiKey = effectiveKey || process.env.GEMINI_API_KEY || process.env.EBOOK_AI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY in your .env file to enable AI menu scanning."
      };
    }

    const files = formData.getAll('images') as File[];
    if (!files || files.length === 0) {
      return {
        success: false,
        error: "Please upload at least one menu image to scan."
      };
    }

    const businessName = (formData.get('businessName') as string) || '';
    const businessType = ((formData.get('businessType') as string) || 'restaurant') as 'restaurant' | 'parlour';
    const customDraftName = (formData.get('draftName') as string) || '';
    const whatsappNumber = (formData.get('whatsappNumber') as string) || '';
    const email = (formData.get('email') as string) || '';
    const clientIdStr = formData.get('clientId') as string;
    const clientId = clientIdStr ? parseInt(clientIdStr, 10) : undefined;

    // Check AI scan quota from client subscription & package limits
    const subCheck = await checkClientSubscription(whatsappNumber, email);
    const isAdmin = subCheck.isAdmin ?? false;
    const validImageCount = files.filter(f => f instanceof File && f.size > 0).length;

    if (!isAdmin) {
      const isUnlimited = subCheck.limits?.isAiScanUnlimited ?? false;
      const aiLimit = subCheck.limits?.aiScanLimit ?? 0;
      const aiUsed = subCheck.limits?.aiScansUsed ?? 0;

      if (!isUnlimited) {
        if (aiLimit <= 0) {
          return {
            success: false,
            error: "Your current plan does not include AI menu image scanning. Please upgrade your package to process menu images."
          };
        }

        if (aiUsed + validImageCount > aiLimit) {
          const remaining = Math.max(0, aiLimit - aiUsed);
          return {
            success: false,
            error: `AI Menu Scan limit reached. Your package allows ${aiLimit} image(s) (${remaining} remaining, but trying to scan ${validImageCount}). Please upgrade your package to scan more menu images.`
          };
        }
      }
    }

    // Convert uploaded files to base64 media contents for Genkit
    const mediaParts: ({ text: string } | { media: { url: string; contentType: string } })[] = [];

    const instructions = `
You are an expert menu digitizer and OCR specialist.
Your task is to analyze the provided menu image(s) (photos of physical menus, flyers, board menus, or price lists) and extract EVERY dish, drink, service, or food item listed.

Rules:
1. Extract ALL items found in the image.
2. For each item:
   - "name": Clean name of the dish (e.g. "Chicken Biryani", "Beef Bacon Burger", "Thai Clear Soup").
   - "price": Clean numeric price (digits only, e.g. 250, 450). Ignore currency symbols like ৳, $, Tk, etc. If multiple sizes/portions exist (e.g. Regular 200, Large 350), create separate items like "Dish Name (Regular)" and "Dish Name (Large)".
   - "category": The section heading the item belongs to (e.g. "Appetizers", "Soups", "Burgers", "Pasta", "Rice & Noodles", "Beverages", "Dessert").
   - "description": Any portion or ingredient details listed under the dish name, if visible.
3. Ignore non-menu text such as restaurant address, phone numbers, opening hours, Wi-Fi password, or page numbers.
4. Output strict JSON matching the schema provided.
`;

    mediaParts.push({ text: instructions });

    for (const file of files) {
      if (!(file instanceof File) || file.size === 0) continue;
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const contentType = file.type || 'image/jpeg';
      mediaParts.push({
        media: {
          contentType,
          url: `data:${contentType};base64,${base64}`
        }
      });
    }

    if (mediaParts.length <= 1) {
      return {
        success: false,
        error: "No valid image files were provided."
      };
    }

    // Import Genkit and Google AI
    const [{ genkit }, { googleAI }] = await Promise.all([
      import('genkit'),
      import('@genkit-ai/googleai')
    ]);

    const ai = genkit({
      plugins: [googleAI({ apiKey })]
    });

    const preferredModel = configuredModel || process.env.MENU_SCAN_AI_MODEL || 'googleai/gemini-flash-lite-latest';
    const fallbackModels = [
      preferredModel,
      'googleai/gemini-3.5-flash-lite',
      'googleai/gemini-3.5-flash',
      'googleai/gemini-flash-lite-latest'
    ];

    // Deduplicate candidate models
    const uniqueModels = Array.from(new Set(fallbackModels));

    let result = null;
    let lastError: any = null;

    for (const modelToTry of uniqueModels) {
      try {
        result = await ai.generate({
          model: modelToTry,
          prompt: mediaParts,
          output: {
            schema: ScannedMenuResponseSchema
          },
          config: {
            temperature: 0.2,
            maxOutputTokens: 16384,
          }
        });
        if (result?.output?.items && result.output.items.length > 0) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[MenuScanner] Model ${modelToTry} attempt failed: ${err.message}. Trying next candidate...`);
      }
    }

    if (!result || !result.output || !Array.isArray(result.output.items) || result.output.items.length === 0) {
      return {
        success: false,
        error: lastError?.message || "Could not detect any menu items in the uploaded image. Please ensure the menu text and prices are clearly visible."
      };
    }

    const scannedItems = result.output.items;

    // Convert to UserDraftItem structure
    const draftItems: UserDraftItem[] = scannedItems.map((item, idx) => {
      const categoryName = item.category?.trim() || 'General';
      const categorySlug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'general';

      return {
        id: `scanned-${Date.now()}-${idx + 1}`,
        name: item.name.trim(),
        price: Math.max(0, Number(item.price) || 0),
        category: categoryName,
        categoryId: categorySlug,
        description: item.description?.trim() || null,
      };
    });

    const now = new Date();
    const formattedDate = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
    const defaultTitle = result.output.detectedMenuTitle?.trim() 
      ? `${result.output.detectedMenuTitle.trim()} (Scanned)`
      : `Scanned Menu - ${formattedDate}`;

    const draftName = customDraftName.trim() || defaultTitle;
    const draftId = `draft-${Date.now()}`;
    const totalPrice = draftItems.reduce((acc, curr) => acc + (curr.price || 0), 0);

    const fullDraftRecord = {
      id: draftId,
      name: draftName,
      createdAt: now.toISOString(),
      itemCount: draftItems.length,
      primaryTag: businessType,
      price: totalPrice,
      previewAvatars: draftItems.slice(0, 3).map(i => i.name.charAt(0).toUpperCase()),
      items: draftItems,
    };

    // Save to MySQL so admin can see and track it
    try {
      await saveUserDraftAction({
        draftId,
        draftName,
        businessName: businessName || (businessType === 'parlour' ? 'Anonymous Parlour' : 'Anonymous Restaurant'),
        businessType,
        whatsappNumber: whatsappNumber || undefined,
        email: email || undefined,
        clientId: clientId || undefined,
        primaryTag: businessType,
        items: draftItems,
        itemCount: draftItems.length,
      });
    } catch (dbErr) {
      console.error('Failed to sync scanned draft to MySQL database:', dbErr);
    }

    // Update user AI scans count in clients table
    if (!isAdmin && (clientId || whatsappNumber || email)) {
      try {
        await (pool as any).execute(
          `UPDATE clients SET ai_scans_used = COALESCE(ai_scans_used, 0) + ? 
           WHERE (id = ? AND ? > 0) 
              OR (whatsapp_number = ? AND ? != '') 
              OR (email = ? AND ? != '')`,
          [
            validImageCount,
            clientId || 0,
            clientId || 0,
            whatsappNumber || '',
            whatsappNumber || '',
            email || '',
            email || ''
          ]
        );
      } catch (countErr) {
        console.error('Failed to increment client ai_scans_used:', countErr);
      }
    }

    const isUnlimitedPlan = isAdmin || (subCheck.limits?.isAiScanUnlimited ?? false);
    const updatedRemaining = isUnlimitedPlan
      ? 'unlimited'
      : Math.max(0, (subCheck.limits?.aiScanLimit ?? 0) - ((subCheck.limits?.aiScansUsed ?? 0) + validImageCount));

    return {
      success: true,
      draft: fullDraftRecord,
      itemsCount: draftItems.length,
      remainingScans: updatedRemaining
    };
  } catch (error: any) {
    console.error('Error scanning menu image:', error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred while scanning the menu image with AI."
    };
  }
}
