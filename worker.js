import { onRequestPost as loginPost, onRequestGet as loginGet } from './functions/api/login.js';
import { onRequestPost as logoutPost, onRequestGet as logoutGet } from './functions/api/logout.js';
import { onRequest as postsHandler } from './functions/api/posts.js';
import { buildSitemap } from './functions/_sitemap.js';

function methodNotAllowed() {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

// backend files must never be served as public assets
const BLOCKED = [
  /^\/functions\//i,
  /^\/worker\.js$/i,
  /^\/schema\.sql$/i,
  /^\/wrangler(\.worker)?\.toml$/i,
  /^\/(CMS-SETUP|DEPLOY)\.md$/i,
  /^\/\.assetsignore$/i,
  /^\/\.gitignore$/i,
  /^\/_routes\.json$/i
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (BLOCKED.some(function (re) { return re.test(path); })) {
      return new Response('Not Found', { status: 404 });
    }

    // API routes
    if (path === '/api/login' || path === '/api/login/') {
      const context = { request, env, ctx, params: {} };
      if (request.method === 'POST') return loginPost(context);
      if (request.method === 'GET') return loginGet(context);
      return methodNotAllowed();
    }

    if (path === '/api/logout' || path === '/api/logout/') {
      const context = { request, env, ctx, params: {} };
      if (request.method === 'POST') return logoutPost(context);
      if (request.method === 'GET') return logoutGet(context);
      return methodNotAllowed();
    }

    if (path === '/api/posts' || path === '/api/posts/') {
      return postsHandler({ request, env, ctx, params: {} });
    }

    if (path === '/sitemap.xml') {
      const xml = await buildSitemap(env);
      return new Response(xml, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=600'
        }
      });
    }

    // Everything else: static assets
    return env.ASSETS.fetch(request);
  }
};