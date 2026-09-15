// Server-side proxy for arXiv's public API.
// arXiv's export API doesn't return an Access-Control-Allow-Origin header, so
// direct browser calls from another domain are blocked. Fetching it here,
// server-side, sidesteps that entirely.

function extractTag(xmlChunk, tag) {
  const match = xmlChunk.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].trim().replace(/\s+/g, ' ') : '';
}

exports.handler = async function (event) {
  const limit = event.queryStringParameters?.limit || 1;
  try {
    const url = `https://export.arxiv.org/api/query?search_query=cat:cs.LG&sortBy=submittedDate&sortOrder=descending&max_results=${limit}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let res;
    try {
      res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'SignalSheetDemo/1.0 (portfolio project; contact: none)' },
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) throw new Error(`arXiv API returned ${res.status}`);
    const text = await res.text();

    const entryChunks = text.split('<entry>').slice(1).map((chunk) => '<entry>' + chunk);
    if (!entryChunks.length) throw new Error('arXiv returned no entries');

    const mapped = entryChunks.map((chunk) => {
      const title = extractTag(chunk, 'title');
      const summary = extractTag(chunk, 'summary');
      const id = extractTag(chunk, 'id'); // e.g. http://arxiv.org/abs/2501.12345v1
      return {
        cat: 'Papers',
        time: 'live',
        headline: title,
        sub: summary.length > 150 ? summary.slice(0, 150) + '…' : summary,
        url: id || undefined,
      };
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapped),
    };
  } catch (err) {
    const message = err.name === 'AbortError' ? 'arXiv did not respond within 8 seconds' : err.message;
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: message }),
    };
  }
};
