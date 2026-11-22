// Dynamic sitemap for the Pages deployment (the Workers deployment builds it
// in worker.js instead).
import { buildSitemap } from './_sitemap.js';

export async function onRequestGet(context) {
  const xml = await buildSitemap(context.env);
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600'
    }
  });
}
