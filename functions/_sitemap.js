const SITE = 'https://abubakr-english.pages.dev';

const STATIC_PAGES = [
  { loc: '/', priority: '1.0', freq: 'weekly' },
  { loc: '/blog', priority: '0.8', freq: 'daily' },
  { loc: '/contact', priority: '0.7', freq: 'monthly' },
  { loc: '/flashcards', priority: '0.7', freq: 'weekly' },
  { loc: '/tools', priority: '0.7', freq: 'weekly' },
  { loc: '/course-general', priority: '0.8', freq: 'monthly' },
  { loc: '/course-business', priority: '0.8', freq: 'monthly' },
  { loc: '/course-academic', priority: '0.8', freq: 'monthly' },
  { loc: '/course-ielts', priority: '0.8', freq: 'monthly' },
  { loc: '/course-sat', priority: '0.8', freq: 'monthly' },
  { loc: '/ilac-conference', priority: '0.6', freq: 'yearly' },
  { loc: '/test-sat', priority: '0.6', freq: 'monthly' },
  { loc: '/daily-challenge', priority: '0.6', freq: 'monthly' },
  { loc: '/speaking', priority: '0.6', freq: 'monthly' },
  { loc: '/test', priority: '0.6', freq: 'monthly' },
  { loc: '/test-business', priority: '0.6', freq: 'monthly' },
  { loc: '/test-ielts', priority: '0.6', freq: 'monthly' },
  { loc: '/weekly-exam', priority: '0.6', freq: 'monthly' },
  { loc: '/test-toefl', priority: '0.6', freq: 'monthly' }
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function escXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

async function buildSitemap(env) {
  let posts = [];
  try {
    const res = await env.DB.prepare('SELECT slug, created_at, updated_at FROM posts WHERE published = 1 ORDER BY created_at DESC').all();
    posts = res.results || [];
  } catch (e) {
    posts = [];
  }

  const now = today();
  const urls = [];

  for (const p of STATIC_PAGES) {
    urls.push({ loc: SITE + p.loc, priority: p.priority, freq: p.freq });
  }

  for (const post of posts) {
    const lastmod = String(post.updated_at || post.created_at || '').slice(0, 10) || now;
    urls.push({
      loc: SITE + '/post?slug=' + encodeURIComponent(post.slug),
      lastmod: lastmod,
      priority: '0.7',
      freq: 'monthly'
    });
  }

  const body = urls.map(u => [
    '  <url>',
    `    <loc>${escXml(u.loc)}</loc>`,
    u.lastmod ? `    <lastmod>${escXml(u.lastmod)}</lastmod>` : null,
    `    <changefreq>${u.freq}</changefreq>`,
    `    <priority>${u.priority}</priority>`,
    '  </url>'
  ].filter(Boolean).join('\n')).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export { buildSitemap, SITE };
