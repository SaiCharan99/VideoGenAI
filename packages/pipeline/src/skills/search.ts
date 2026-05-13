export interface SearchResult {
  id: string;
  title: string;
  url: string;
  description: string;
  age: string | undefined;
}

export async function braveSearch(query: string, count = 8): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) throw new Error('BRAVE_SEARCH_API_KEY is not set');

  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(count));
  url.searchParams.set('text_decorations', 'false');

  const res = await fetch(url.toString(), {
    headers: { 'X-Subscription-Token': apiKey, Accept: 'application/json' },
  });

  if (!res.ok) throw new Error(`Brave search failed: ${res.status} ${await res.text()}`);

  const data = (await res.json()) as {
    web?: { results?: { title: string; url: string; description: string; age?: string }[] };
  };

  return (data.web?.results ?? []).map((r, i) => ({
    id: `src_${i + 1}`,
    title: r.title,
    url: r.url,
    description: r.description,
    age: r.age,
  }));
}

export async function fetchPageText(url: string, maxChars = 4000): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'VideoGenAI/1.0 (research bot)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return '';
    const html = await res.text();
    // Strip tags, collapse whitespace
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
