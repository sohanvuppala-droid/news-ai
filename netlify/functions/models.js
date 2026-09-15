// Server-side proxy for Hugging Face's trending models API.
// Runs on Netlify's servers, so there's no browser CORS restriction here —
// CORS only applies to requests made from a browser tab, not server-to-server calls.

function formatCount(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return String(n);
}

exports.handler = async function (event) {
  const limit = event.queryStringParameters?.limit || 2;
  try {
    const res = await fetch(`https://huggingface.co/api/models?sort=trendingScore&direction=-1&limit=${limit}`);
    if (!res.ok) throw new Error(`Hugging Face API returned ${res.status}`);
    const data = await res.json();
    const mapped = data.map((m) => ({
      cat: 'Models',
      time: 'live',
      headline: m.id || m.modelId,
      sub: [m.pipeline_tag, m.likes != null ? `${m.likes} likes` : null].filter(Boolean).join(' · '),
      extra: m.downloads != null ? `${formatCount(m.downloads)} ↓` : '',
      url: `https://huggingface.co/${m.id || m.modelId}`,
    }));
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
