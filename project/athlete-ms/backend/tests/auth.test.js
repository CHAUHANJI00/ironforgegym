const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('auth route sets httpOnly session cookie and has logout endpoint', () => {
  const src = fs.readFileSync(path.join(__dirname, '../routes/auth.js'), 'utf8');
  assert.match(src, /issueSessionCookies\(res, token\)/);
  assert.match(src, /router\.post\('\/logout'/);
  const sec = fs.readFileSync(path.join(__dirname, '../utils/security.js'), 'utf8');
  assert.match(sec, /maxAge: 7 \* 24 \* 60 \* 60 \* 1000/);
});
