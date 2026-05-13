import { z } from 'zod';

export interface SearchResult {
  id: string;
  title: string;
  url: string;
  description: string;
  age: string | undefined;
}

const braveResultSchema = z.object({
  web: z
    .object({
      results: z
        .array(
          z.object({
            title: z.string(),
            url: z.string().url(),
            description: z.string(),
            age: z.string().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
});

export async function braveSearch(query: string, count = 8): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) throw new Error('BRAVE_SEARCH_API_KEY is not set');

  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(count));
  url.searchParams.set('text_decorations', 'false');

  const res = await fetch(url.toString(), {
    headers: { 'X-Subscription-Token': apiKey, Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`Brave search failed: ${res.status} ${await res.text()}`);

  const parsed = braveResultSchema.safeParse(await res.json());
  if (!parsed.success)
    throw new Error(`Brave search: unexpected response shape — ${parsed.error.message}`);

  return (parsed.data.web?.results ?? []).map((r, i) => ({
    id: `src_${i + 1}`,
    title: r.title,
    url: r.url,
    description: r.description,
    age: r.age,
  }));
}

const PRIVATE_HOSTNAME =
  /^(localhost|127\.\d+\.\d+\.\d+|::1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)$/i;

function isSafeUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return (
      (u.protocol === 'http:' || u.protocol === 'https:') && !PRIVATE_HOSTNAME.test(u.hostname)
    );
  } catch {
    return false;
  }
}

export async function fetchPageText(url: string, maxChars = 4000): Promise<string> {
  if (!isSafeUrl(url)) return '';
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'VideoGenAI/1.0 (research bot)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return '';
    const html = await res.text();
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxChars);
  } catch {
    return '';
  }
}
