const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('frontend profile rendering keeps escaping helper for user content', () => {
  const profilePath = path.join(__dirname, '../../frontend/profile.html');
  const src = fs.readFileSync(profilePath, 'utf8');

  assert.match(src, /function esc\(value\)/);
  assert.match(src, /\$\{esc\(a\.title\)\}/);
  assert.match(src, /\$\{esc\(s\.notes \|\| '—'\)\}/);
});
