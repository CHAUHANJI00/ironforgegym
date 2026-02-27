const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, '../routes/athlete.js'), 'utf8');

test('profile CRUD has strict validators', () => {
  assert.match(src, /const profileValidation = \[/);
  assert.match(src, /body\('website'\).*isURL\(\)/s);
  assert.match(src, /router\.put\('\/profile', profileValidation/s);
});

test('training update has strict validators', () => {
  assert.match(src, /const trainingValidation = \[/);
  assert.match(src, /body\('preferred_time'\).*isIn\(\['morning', 'afternoon', 'evening', 'night'\]\)/s);
  assert.match(src, /router\.put\('\/training', trainingValidation/s);
});

test('delete routes validate integer ids', () => {
  assert.match(src, /const idParamValidation = \[param\('id'\)\.isInt\(\{ min: 1 \}\)/);
  assert.match(src, /router\.delete\('\/achievements\/:id', idParamValidation/s);
  assert.match(src, /router\.delete\('\/stats\/:id', idParamValidation/s);
});
