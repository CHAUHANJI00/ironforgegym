const { CSRF_COOKIE } = require('../utils/security');

function csrfMiddleware(req, res, next) {
  const method = req.method.toUpperCase();
  const unsafe = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  if (!unsafe) return next();

  const hasBearer = !!(req.headers.authorization || req.headers['x-auth-token']);
  const hasCookieSession = !!req.cookies?.ams_token;

  // Keep backward compatibility for explicit bearer clients.
  if (!hasCookieSession || hasBearer) return next();

  const csrfFromHeader = req.headers['x-csrf-token'];
  const csrfFromCookie = req.cookies?.[CSRF_COOKIE];

  if (!csrfFromHeader || !csrfFromCookie || csrfFromHeader !== csrfFromCookie) {
    return res.status(403).json({ success: false, message: 'CSRF validation failed.' });
  }

  return next();
}

module.exports = csrfMiddleware;
