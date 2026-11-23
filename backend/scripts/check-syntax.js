/**
 * Vérification statique rapide : `node --check` sur tous les fichiers backend.
 * Utilisation : npm run check
 */
const { readdirSync, statSync } = require('fs');
const { join, resolve } = require('path');
const { spawnSync } = require('child_process');

const root = resolve(__dirname, '..');
const targets = ['server.js', 'src', 'scripts'];

const files = [];
const walk = (entry) => {
  const full = join(root, entry);
  const stat = statSync(full);
  if (stat.isDirectory()) {
    for (const child of readdirSync(full)) walk(join(entry, child));
    return;
  }
  if (entry.endsWith('.js')) files.push(entry);
};

targets.forEach(walk);

let failed = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', join(root, file)], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    failed += 1;
    console.error(`❌ ${file}\n${result.stderr}`);
  }
}

if (failed) {
  console.error(`\n${failed} fichier(s) en erreur.`);
  process.exit(1);
}

console.log(`✅ ${files.length} fichier(s) JavaScript valide(s).`);
