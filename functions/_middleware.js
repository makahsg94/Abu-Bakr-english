// Backend/config files must never be served as public assets (Pages side;
// worker.js has its own BLOCKED list for the Workers deployment).
const BLOCKED = [
  /^\/worker\.js$/i,
  /^\/worker\.js\.map$/i,
  /^\/wrangler(\.worker)?\.toml$/i,
  /^\/schema\.sql$/i,
  /^\/(CMS-SETUP|DEPLOY)\.md$/i,
  /^\/\.assetsignore$/i,
  /^\/\.gitignore$/i,
  /^\/_routes\.json$/i
];

export async function onRequest(context) {
  const path = new URL(context.request.url).pathname;
  if (BLOCKED.some(function (re) { return re.test(path); })) {
    return new Response('Not Found', { status: 404 });
  }
  return context.next();
}
