const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

// On importe l'application Express SANS lancer server.js :
// pas de connexion MongoDB, pas de cron. La route /api/health est autonome.
const app = require('../src/app');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('GET /api/health répond 200 avec success=true', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.success, true);
  assert.match(body.message, /API/i);
  assert.ok(!Number.isNaN(Date.parse(body.timestamp)), 'timestamp ISO attendu');
});

test('une route inconnue répond 404 en JSON', async () => {
  const response = await fetch(`${baseUrl}/api/route-inexistante`);
  assert.equal(response.status, 404);

  const body = await response.json();
  assert.equal(body.success, false);
  assert.match(body.message, /introuvable/i);
});
