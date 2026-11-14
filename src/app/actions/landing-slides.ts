"use server";

import pool from "@/lib/mysql";
import { revalidatePath } from "next/cache";

export interface FeatureSlide {
  id: number;
  tag: string;
  title: string;
  description: string;
  benefits: string[];
  image_url: string;
  cta_text: string;
  cta_url: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_SLIDES: Omit<FeatureSlide, "id" | "created_at" | "updated_at">[] = [
  {
    tag: "Menu Intelligence & Research",
    title: "হাজারো ফুড আইটেম ও লাইভ প্রাইস রিসার্চ এক ক্লিকে",
    description: "রেস্তোরাঁর জন্য সঠিক আইটেম সিলেক্ট করা এবং বাজারদর যাচাই করা এখন সবচেয়ে সহজ। Appetizer থেকে শুরু করে Biriyani — ক্যাটাগরি অনুযায়ী রেস্তোরাঁ রেফারেন্স ব্রাউজ করুন।",
    benefits: [
      "500+ Restaurant & Parlor Menu References",
      "Category-wise Price Spread & Comparison",
      "One-click Add to MagicTab Workspace",
      "Search Thousands of Local Food Items",
    ],
    image_url: "/images/landing/features/feature-magictab.jpg",
    cta_text: "Explore Menu References",
    cta_url: "#pricing",
    sort_order: 1,
    is_active: true,
  },
  {
    tag: "Smart Drafts & AI Menu Scan",
    title: "AI দিয়ে মেনু স্ক্যান করুন এবং আনলিমিটেড ড্রাফট সেভ রাখুন",
    description: "কাগজের মেনু বা ইমেজ এক ক্লিকে AI স্ক্যান করে এডিটেবল ড্রাফটে রূপান্তর করুন। ক্লায়েন্ট বা পার্টনারের সাথে লাইভ শেয়ার লিঙ্ক তৈরি করুন এবং যেকোনো সময় রিস্টোর করুন।",
    benefits: [
      "Scan Physical Menus with Google AI Scanner",
      "Instant Shareable Client Review Links",
      "Unlimited Cloud Saved Menu Drafts",
      "Restore & Switch Versions with One Tap",
    ],
    image_url: "/images/landing/features/feature-drafts.png",
    cta_text: "Start Building Draft",
    cta_url: "#pricing",
    sort_order: 2,
    is_active: true,
  },
  {
    tag: "Live QR Ordering & Kitchen Sync",
    title: "টেবিল QR স্ক্যান থেকে লাইভ অর্ডার ও কিচেন ম্যানেজমেন্ট",
    description: "কাস্টমার টেবিল থেকে QR কোড স্ক্যান করে সরাসরি অর্ডার দিতে পারবে। কিচেন ও ক্যাশিয়ার রিয়েল-টাইমে অর্ডার নোটিফিকেশন, টেবিল নম্বর এবং লাইভ রেভিনিউ ট্র্যাক করতে পারবে।",
    benefits: [
      "Instant Table QR Code Menu Ordering",
      "Live Order Status Sync (Pending, Kitchen, Done)",
      "Daily Order Summary & Instant Revenue Analytics",
      "Print-Ready Digital Receipt Generation",
    ],
    image_url: "/images/landing/features/feature-qr-orders.png",
    cta_text: "See QR System",
    cta_url: "#pricing",
    sort_order: 3,
    is_active: true,
  },
  {
    tag: "Recipe Costing & Profit Margin",
    title: "প্রতি প্লেটের কাঁচামাল খরচ এবং নিখুঁত লাভ বের করুন",
    description: "কুকিং ইনগ্রেডিয়েন্টস ও মার্কেট রেট ইনপুট দিন — সিস্টেম প্রতিটি ডিশের রিয়েল কিচেন কস্ট, সেলস প্রাইস এবং নেট প্রফিট মার্জিন শতাংশ সহ অটোমেটিক ক্যালকুলেট করে দেবে।",
    benefits: [
      "Automated Ingredient & Portion Cost Calculator",
      "Live Kitchen Cost vs Selling Price Breakdown",
      "Visual Cost & Net Profit Share Chart",
      "Instant Recipe Costing Slip Printout",
    ],
    image_url: "/images/landing/features/feature-calculation.jpg",
    cta_text: "Calculate Your Profit",
    cta_url: "#pricing",
    sort_order: 4,
    is_active: true,
  },
];

async function ensureSlidesTableExists() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS landing_feature_slides (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tag VARCHAR(100) NOT NULL DEFAULT '',
      title VARCHAR(255) NOT NULL,
      description TEXT,
      benefits JSON,
      image_url VARCHAR(500) NOT NULL,
      cta_text VARCHAR(100) DEFAULT '',
      cta_url VARCHAR(500) DEFAULT '',
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Seed default items if table is empty
  const [rows]: any = await pool.query("SELECT COUNT(*) as count FROM landing_feature_slides");
  if (rows && rows[0]?.count === 0) {
    for (const slide of DEFAULT_SLIDES) {
      await pool.query(
        `INSERT INTO landing_feature_slides 
        (tag, title, description, benefits, image_url, cta_text, cta_url, sort_order, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          slide.tag,
          slide.title,
          slide.description,
          JSON.stringify(slide.benefits || []),
          slide.image_url,
          slide.cta_text,
          slide.cta_url,
          slide.sort_order,
          slide.is_active ? 1 : 0,
        ]
      );
    }
  }
}

function parseSlideRow(row: any): FeatureSlide {
  let benefits: string[] = [];
  if (row.benefits) {
    if (typeof row.benefits === "string") {
      try {
        benefits = JSON.parse(row.benefits);
      } catch {
        benefits = [];
      }
    } else if (Array.isArray(row.benefits)) {
      benefits = row.benefits;
    }
  }

  return {
    id: row.id,
    tag: row.tag || "",
    title: row.title || "",
    description: row.description || "",
    benefits,
    image_url: row.image_url || "",
    cta_text: row.cta_text || "",
    cta_url: row.cta_url || "",
    sort_order: Number(row.sort_order) || 0,
    is_active: Boolean(row.is_active),
    created_at: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

/**
 * Public action: Get active feature slides sorted by sort_order
 */
export async function getPublicFeatureSlidesAction(): Promise<{
  success: boolean;
  data?: FeatureSlide[];
  error?: string;
}> {
  try {
    await ensureSlidesTableExists();
    const [rows]: any = await pool.query(
      "SELECT * FROM landing_feature_slides WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"
    );
    const data = (rows || []).map(parseSlideRow);
    return { success: true, data };
  } catch (err: any) {
    console.error("getPublicFeatureSlidesAction error:", err);
    // Return default static slides if DB fails so landing page never breaks
    const fallback = DEFAULT_SLIDES.map((s, idx) => ({ ...s, id: idx + 1 }));
    return { success: true, data: fallback };
  }
}

/**
 * Admin action: Get all slides (active and inactive)
 */
export async function getAllFeatureSlidesAdminAction(): Promise<{
  success: boolean;
  data?: FeatureSlide[];
  error?: string;
}> {
  try {
    await ensureSlidesTableExists();
    const [rows]: any = await pool.query(
      "SELECT * FROM landing_feature_slides ORDER BY sort_order ASC, id ASC"
    );
    const data = (rows || []).map(parseSlideRow);
    return { success: true, data };
  } catch (err: any) {
    console.error("getAllFeatureSlidesAdminAction error:", err);
    return { success: false, error: err?.message || "Failed to fetch slides" };
  }
}

/**
 * Admin action: Create a new feature slide
 */
export async function createFeatureSlideAction(slideData: {
  tag?: string;
  title: string;
  description?: string;
  benefits?: string[];
  image_url: string;
  cta_text?: string;
  cta_url?: string;
  sort_order?: number;
  is_active?: boolean;
}): Promise<{
  success: boolean;
  data?: FeatureSlide;
  error?: string;
}> {
  try {
    if (!slideData.title?.trim()) {
      return { success: false, error: "Title is required" };
    }
    if (!slideData.image_url?.trim()) {
      return { success: false, error: "Image is required" };
    }

    await ensureSlidesTableExists();

    const [result]: any = await pool.query(
      `INSERT INTO landing_feature_slides 
      (tag, title, description, benefits, image_url, cta_text, cta_url, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        slideData.tag || "",
        slideData.title.trim(),
        slideData.description || "",
        JSON.stringify(slideData.benefits || []),
        slideData.image_url.trim(),
        slideData.cta_text || "",
        slideData.cta_url || "",
        slideData.sort_order ?? 0,
        slideData.is_active === false ? 0 : 1,
      ]
    );

    revalidatePath("/");
    revalidatePath("/m-admin/feature-slides");

    return {
      success: true,
      data: {
        id: result.insertId,
        tag: slideData.tag || "",
        title: slideData.title.trim(),
        description: slideData.description || "",
        benefits: slideData.benefits || [],
        image_url: slideData.image_url.trim(),
        cta_text: slideData.cta_text || "",
        cta_url: slideData.cta_url || "",
        sort_order: slideData.sort_order ?? 0,
        is_active: slideData.is_active !== false,
      },
    };
  } catch (err: any) {
    console.error("createFeatureSlideAction error:", err);
    return { success: false, error: err?.message || "Failed to create slide" };
  }
}

/**
 * Admin action: Update an existing slide
 */
export async function updateFeatureSlideAction(
  id: number,
  slideData: Partial<{
    tag: string;
    title: string;
    description: string;
    benefits: string[];
    image_url: string;
    cta_text: string;
    cta_url: string;
    sort_order: number;
    is_active: boolean;
  }>
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!id) return { success: false, error: "Invalid slide ID" };
    await ensureSlidesTableExists();

    const updates: string[] = [];
    const values: any[] = [];

    if (slideData.tag !== undefined) {
      updates.push("tag = ?");
      values.push(slideData.tag);
    }
    if (slideData.title !== undefined) {
      updates.push("title = ?");
      values.push(slideData.title.trim());
    }
    if (slideData.description !== undefined) {
      updates.push("description = ?");
      values.push(slideData.description);
    }
    if (slideData.benefits !== undefined) {
      updates.push("benefits = ?");
      values.push(JSON.stringify(slideData.benefits));
    }
    if (slideData.image_url !== undefined) {
      updates.push("image_url = ?");
      values.push(slideData.image_url.trim());
    }
    if (slideData.cta_text !== undefined) {
      updates.push("cta_text = ?");
      values.push(slideData.cta_text);
    }
    if (slideData.cta_url !== undefined) {
      updates.push("cta_url = ?");
      values.push(slideData.cta_url);
    }
    if (slideData.sort_order !== undefined) {
      updates.push("sort_order = ?");
      values.push(slideData.sort_order);
    }
    if (slideData.is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(slideData.is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return { success: true };
    }

    values.push(id);
    await pool.query(
      `UPDATE landing_feature_slides SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    revalidatePath("/");
    revalidatePath("/m-admin/feature-slides");

    return { success: true };
  } catch (err: any) {
    console.error("updateFeatureSlideAction error:", err);
    return { success: false, error: err?.message || "Failed to update slide" };
  }
}

/**
 * Admin action: Delete a slide
 */
export async function deleteFeatureSlideAction(id: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!id) return { success: false, error: "Invalid slide ID" };
    await ensureSlidesTableExists();
    await pool.query("DELETE FROM landing_feature_slides WHERE id = ?", [id]);

    revalidatePath("/");
    revalidatePath("/m-admin/feature-slides");

    return { success: true };
  } catch (err: any) {
    console.error("deleteFeatureSlideAction error:", err);
    return { success: false, error: err?.message || "Failed to delete slide" };
  }
}

