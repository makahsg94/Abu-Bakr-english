import { isAuthed, json, unauthorized, badRequest, serverError, slugify } from '../_utils.js';

function rowToPost(r) {
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt,
    content: r.content,
    cover_image: r.cover_image,
    author: r.author,
    published: !!r.published,
    created_at: r.created_at,
    updated_at: r.updated_at
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  if (method === 'GET') {
    const slug = url.searchParams.get('slug');
    const id = url.searchParams.get('id');
    try {
      if (slug) {
        const r = await env.DB.prepare('SELECT * FROM posts WHERE slug = ?').bind(slug).first();
        if (!r) return json({ error: 'Not found' }, 404);
        // hide unpublished from public
        const authed = await isAuthed(request, env);
        if (!r.published && !authed) return json({ error: 'Not found' }, 404);
        return json({ post: rowToPost(r) });
      }
      if (id) {
        const r = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first();
        if (!r) return json({ error: 'Not found' }, 404);
        const authed = await isAuthed(request, env);
        if (!r.published && !authed) return json({ error: 'Not found' }, 404);
        return json({ post: rowToPost(r) });
      }
      const authed = await isAuthed(request, env);
      const limitRaw = parseInt(url.searchParams.get('limit') || '', 10);
      const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : null;
      let stmt;
      if (authed) {
        stmt = env.DB.prepare('SELECT * FROM posts ORDER BY created_at DESC');
      } else {
        stmt = env.DB.prepare('SELECT * FROM posts WHERE published = 1 ORDER BY created_at DESC');
      }
      const { results } = await stmt.all();
      const all = results || [];
      return json({ posts: (limit ? all.slice(0, limit) : all).map(rowToPost) });
    } catch (e) {
      return serverError(e && e.message);
    }
  }

  if (method === 'POST') {
    if (!(await isAuthed(request, env))) return unauthorized();
    let body;
    try { body = await request.json(); } catch (e) { return badRequest('Invalid JSON'); }
    const title = (body.title || '').trim();
    const content = (body.content || '').trim();
    if (!title) return badRequest('Title required');
    if (!content) return badRequest('Content required');
    const slug = slugify(body.slug || title);
    const excerpt = (body.excerpt || '').trim();
    const cover = (body.cover_image || '').trim();
    const published = body.published === false ? 0 : 1;
    const author = (body.author || 'Abu Bakr Mukhtar').trim();
    if (content.length > 200000) return badRequest('Content is too long (max 200k characters)');
    if (cover.length > 900000) return badRequest('Cover image is too large — please use a smaller image');
    if (excerpt.length > 1000) return badRequest('Excerpt is too long (max 1000 characters)');
    try {
      const res = await env.DB.prepare(
        'INSERT INTO posts (title, slug, excerpt, content, cover_image, author, published) VALUES (?,?,?,?,?,?,?)'
      ).bind(title, slug, excerpt, content, cover, author, published).run();
      const id = res.meta && res.meta.last_row_id;
      const r = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first();
      return json({ post: rowToPost(r) }, 201);
    } catch (e) {
      if (String(e && e.message).includes('UNIQUE')) return badRequest('Slug already exists');
      return serverError(e && e.message);
    }
  }

  if (method === 'PUT') {
    if (!(await isAuthed(request, env))) return unauthorized();
    let body;
    try { body = await request.json(); } catch (e) { return badRequest('Invalid JSON'); }
    const id = body.id;
    if (!id) return badRequest('id required');
    const existing = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first();
    if (!existing) return json({ error: 'Not found' }, 404);
    const title = (body.title !== undefined ? body.title : existing.title).trim();
    const slug = slugify(body.slug !== undefined ? body.slug : existing.slug);
    const excerpt = body.excerpt !== undefined ? String(body.excerpt).trim() : existing.excerpt;
    const content = body.content !== undefined ? String(body.content).trim() : existing.content;
    const cover = body.cover_image !== undefined ? String(body.cover_image).trim() : existing.cover_image;
    const published = body.published === undefined ? existing.published : (body.published ? 1 : 0);
    const author = body.author !== undefined ? String(body.author).trim() : existing.author;
    if (content.length > 200000) return badRequest('Content is too long (max 200k characters)');
    if (cover.length > 900000) return badRequest('Cover image is too large — please use a smaller image');
    if (excerpt.length > 1000) return badRequest('Excerpt is too long (max 1000 characters)');
    try {
      await env.DB.prepare(
        'UPDATE posts SET title=?, slug=?, excerpt=?, content=?, cover_image=?, author=?, published=?, updated_at=datetime(\'now\') WHERE id=?'
      ).bind(title, slug, excerpt, content, cover, author, published, id).run();
      const r = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first();
      return json({ post: rowToPost(r) });
    } catch (e) {
      if (String(e && e.message).includes('UNIQUE')) return badRequest('Slug already exists');
      return serverError(e && e.message);
    }
  }

  if (method === 'DELETE') {
    if (!(await isAuthed(request, env))) return unauthorized();
    const id = url.searchParams.get('id') || (await (async () => { try { const b = await request.json(); return b.id; } catch(e){return null;} })());
    if (!id) return badRequest('id required');
    try {
      await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
      return json({ ok: true });
    } catch (e) {
      return serverError(e && e.message);
    }
  }

  return json({ error: 'Method not allowed' }, 405);
}