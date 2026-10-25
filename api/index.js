let appPromise;

export default async function handler(req, res) {
  try {
    appPromise ||= import('../server/server.js').then(({ default: app }) => app);
    const app = await appPromise;
    return app(req, res);
  } catch (err) {
    console.error('[API bootstrap failed]', err);
    return res.status(500).json({
      error: 'API initialization failed',
      requestId: req.headers['x-vercel-id'] || null
    });
  }
}
