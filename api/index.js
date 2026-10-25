let app = null;

export default async function handler(req, res) {
  try {
    if (!app) {
      const serverMod = await import('../server/server.js');
      app = serverMod.default;
    }
    return app(req, res);
  } catch (err) {
    console.error('[API bootstrap failed]', err);
    return res.status(500).json({
      error: 'API initialization failed',
      details: err?.message || String(err),
      stack: err?.stack || null,
      requestId: req.headers['x-vercel-id'] || null
    });
  }
}
