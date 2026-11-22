const SITE = 'https://abubakrmukhtar.com';

const STATIC_PAGES = [
  { loc: '/', priority: '1.0', freq: 'weekly' },
  { loc: '/blog.html', priority: '0.8', freq: 'daily' },
  { loc: '/contact.html', priority: '0.7', freq: 'monthly' },
  { loc: '/flashcards.html', priority: '0.7', freq: 'weekly' },
  { loc: '/tools.html', priority: '0.7', freq: 'weekly' },
  { loc: '/course-general.html', priority: '0.8', freq: 'monthly' },
  { loc: '/course-business.html', priority: '0.8', freq: 'monthly' },
  { loc: '/course-academic.html', priority: '0.8', freq: 'monthly' },
  { loc: '/course-ielts.html', priority: '0.8', freq: 'monthly' },
  { loc: '/course-sat.html', priority: '0.8', freq: 'monthly' },
  { loc: '/ilac-conference.html', priority: '0.6', freq: 'yearly' }
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
    urls.push({ loc: SITE + p.loc, lastmod: now, priority: p.priority, freq: p.freq });
  }

  for (const post of posts) {
    const lastmod = String(post.updated_at || post.created_at || '').slice(0, 10) || now;
    urls.push({
      loc: SITE + '/post.html?slug=' + encodeURIComponent(post.slug),
      lastmod: lastmod,
      priority: '0.7',
      freq: 'monthly'
    });
  }

  const body = urls.map(u => [
    '  <url>',
    `    <loc>${escXml(u.loc)}</loc>`,
    `    <lastmod>${escXml(u.lastmod)}</lastmod>`,
    `    <changefreq>${u.freq}</changefreq>`,
    `    <priority>${u.priority}</priority>`,
    '  </url>'
  ].join('\n')).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export { buildSitemap, SITE };
