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
    const res = await fetch(url);
    if (!res.ok) throw new Error(`arXiv API returned ${res.status}`);
    const text = await res.text();

    const entryChunks = text.split('<entry>').slice(1).map((chunk) => '<entry>' + chunk);
    if (!entryChunks.length) throw new Error('arXiv returned no entries');

    const mapped = entryChunks.map((chunk) => {
      const title = extractTag(chunk, 'title');
      const summary = extractTag(chunk, 'summary');
      return {
        cat: 'Papers',
        time: 'live',
        headline: title,
        sub: summary.length > 150 ? summary.slice(0, 150) + '…' : summary,
      };
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapped),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
