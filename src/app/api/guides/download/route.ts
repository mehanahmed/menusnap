import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import pool from "@/lib/mysql";

export const dynamic = "force-dynamic";

/**
 * Direct file download API route.
 * Forces automatic browser file download (Content-Disposition: attachment)
 * without redirecting users to external viewers like Google Drive.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const guideId = searchParams.get("id");
    const customFile = searchParams.get("file");

    let fileUrl: string | null = null;
    let guideTitle = "Free Guide";

    // 1. If guide ID is provided, query database for guide file_url and title
    if (guideId) {
      const [rows]: any = await pool.execute(
        "SELECT title, file_url FROM free_guides WHERE id = ? LIMIT 1",
        [guideId]
      );
      if (rows && rows.length > 0) {
        fileUrl = rows[0].file_url || null;
        guideTitle = rows[0].title || "Free Guide";
      }
    }

    if (!fileUrl && customFile) {
      fileUrl = customFile;
    }

    // Default fallback to the bundled guide in public folder
    if (!fileUrl) {
      fileUrl = "/Business Growth Guide By Color Hut.pdf";
    }

    // Sanitize filename for Content-Disposition header
    const safeFilename = guideTitle
      .replace(/[\/\\?%*:|"<>]/g, "_")
      .trim()
      .concat(".pdf");

    // Case A: Local file stored in public/ (e.g. /Business Growth Guide... or /uploads/guides/...)
    if (fileUrl.startsWith("/") || !fileUrl.startsWith("http")) {
      const relativePath = fileUrl.startsWith("/") ? fileUrl.slice(1) : fileUrl;
      const decodedRelativePath = decodeURIComponent(relativePath);
      const localFilePath = path.join(process.cwd(), "public", decodedRelativePath);

      try {
        const fileStat = await fs.stat(localFilePath);
        if (fileStat.isFile()) {
          const fileBuffer = await fs.readFile(localFilePath);
          return new Response(fileBuffer, {
            status: 200,
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${encodeURIComponent(
                safeFilename
              )}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`,
              "Content-Length": fileBuffer.byteLength.toString(),
              "Cache-Control": "public, max-age=3600",
            },
          });
        }
      } catch (err) {
        console.warn(`Local file not found at ${localFilePath}, checking fallback...`);
      }

      // If specific local file wasn't found, try the primary default guide
      const fallbackPath = path.join(
        process.cwd(),
        "public",
        "Business Growth Guide By Color Hut.pdf"
      );
      try {
        const fallbackBuffer = await fs.readFile(fallbackPath);
        return new Response(fallbackBuffer, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${encodeURIComponent(
              safeFilename
            )}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`,
            "Content-Length": fallbackBuffer.byteLength.toString(),
          },
        });
      } catch (fbErr) {
        return NextResponse.json(
          { error: "Local guide PDF file not found on server." },
          { status: 404 }
        );
      }
    }

    // Case B: Google Drive URL - stream directly so user never sees or shares the Drive link
    const driveMatch = fileUrl.match(/(?:file\/d\/|id=)([a-zA-Z0-9_-]{25,})/);
    if (driveMatch && driveMatch[1]) {
      const driveFileId = driveMatch[1];
      const directDriveUrl = `https://drive.google.com/uc?export=download&id=${driveFileId}&confirm=t`;

      const driveRes = await fetch(directDriveUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (driveRes.ok) {
        const arrayBuffer = await driveRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return new Response(buffer, {
          status: 200,
          headers: {
            "Content-Type": driveRes.headers.get("content-type") || "application/pdf",
            "Content-Disposition": `attachment; filename="${encodeURIComponent(
              safeFilename
            )}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`,
            "Content-Length": buffer.byteLength.toString(),
          },
        });
      }
    }

    // Case C: Any other remote URL - stream with attachment header
    const remoteRes = await fetch(fileUrl);
    if (remoteRes.ok) {
      const arrayBuffer = await remoteRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": remoteRes.headers.get("content-type") || "application/pdf",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(
            safeFilename
          )}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`,
          "Content-Length": buffer.byteLength.toString(),
        },
      });
    }

    // If remote fetch failed, redirect as final fallback
    return NextResponse.redirect(fileUrl);
  } catch (error: any) {
    console.error("Guide download route error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to download guide file." },
      { status: 500 }
    );
  }
}
