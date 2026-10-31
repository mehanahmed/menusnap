import { NextResponse } from 'next/server';

// Server-side in-memory translation cache (per language)
const serverCache = new Map<string, string>();

async function fetchFromGoogle(texts: string[], targetLang: string): Promise<string[]> {
  if (texts.length === 0) return [];

  // Try dict-chrome-ex client first, fallback to gtx
  const clients = ['dict-chrome-ex', 'gtx'];

  for (const client of clients) {
    try {
      const joined = texts.join('\n');
      const url = `https://translate.googleapis.com/translate_a/single?client=${client}&sl=auto&tl=${encodeURIComponent(
        targetLang
      )}&dt=t&q=${encodeURIComponent(joined)}`;

      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: '*/*',
        },
      });

      if (!res.ok) continue;

      const data = await res.json();
      if (!data || !Array.isArray(data[0])) continue;

      const translatedFull = data[0].map((x: any) => (Array.isArray(x) && x[0] ? x[0] : '')).join('');
      const translatedLines = translatedFull.split('\n');

      return texts.map((orig, i) => {
        const trans = translatedLines[i] ? translatedLines[i].trim() : '';
        return trans || orig;
      });
    } catch {
      // Try next client
    }
  }

  // Fallback: return originals if all attempts fail
  return [...texts];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { texts, targetLang } = body;

    if (!texts || !Array.isArray(texts) || !targetLang || targetLang === 'en') {
      return NextResponse.json({ translations: texts || [] });
    }

    const results: string[] = new Array(texts.length);
    const toFetchIndices: number[] = [];
    const toFetchTexts: string[] = [];

    // 1. Check server in-memory cache
    texts.forEach((text, i) => {
      const clean = typeof text === 'string' ? text.trim() : '';
      if (!clean) {
        results[i] = text || '';
        return;
      }
      const cacheKey = `${targetLang}:${clean.toLowerCase()}`;
      if (serverCache.has(cacheKey)) {
        results[i] = serverCache.get(cacheKey)!;
      } else {
        toFetchIndices.push(i);
        toFetchTexts.push(clean);
      }
    });

    // 2. Fetch missing translations in small batches of 15 to prevent URL length limits and rate-limiting
    if (toFetchTexts.length > 0) {
      const CHUNK_SIZE = 15;
      for (let c = 0; c < toFetchTexts.length; c += CHUNK_SIZE) {
        const chunkIndices = toFetchIndices.slice(c, c + CHUNK_SIZE);
        const chunkTexts = toFetchTexts.slice(c, c + CHUNK_SIZE);

        const translatedChunk = await fetchFromGoogle(chunkTexts, targetLang);

        chunkTexts.forEach((origText, idx) => {
          const translated = translatedChunk[idx] || origText;
          const globalIndex = chunkIndices[idx];
          results[globalIndex] = translated;

          // Only cache if translation actually succeeded and is not identical to English
          if (translated && translated.trim().toLowerCase() !== origText.trim().toLowerCase()) {
            serverCache.set(`${targetLang}:${origText.toLowerCase()}`, translated);
          }
        });
      }
    }

    return NextResponse.json({ translations: results });
  } catch (error: any) {
    console.error('Translation route error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to translate' }, { status: 500 });
  }
}
