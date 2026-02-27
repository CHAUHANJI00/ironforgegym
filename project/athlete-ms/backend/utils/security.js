const crypto = require('crypto');

const TOKEN_COOKIE = 'ams_token';
const CSRF_COOKIE = 'ams_csrf';

function getCookieOptions() {
  const prod = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: prod,
    sameSite: prod ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

function getCsrfCookieOptions() {
  const prod = process.env.NODE_ENV === 'production';
  return {
    httpOnly: false,
    secure: prod,
    sameSite: prod ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

function issueSessionCookies(res, token) {
  const csrf = crypto.randomBytes(24).toString('hex');
  res.cookie(TOKEN_COOKIE, token, getCookieOptions());
  res.cookie(CSRF_COOKIE, csrf, getCsrfCookieOptions());
  return csrf;
}

module.exports = {
  TOKEN_COOKIE,
  CSRF_COOKIE,
  getCookieOptions,
  getCsrfCookieOptions,
  issueSessionCookies,
};
