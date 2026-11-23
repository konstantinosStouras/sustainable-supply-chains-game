import { mkdir, copyFile } from 'node:fs/promises';
// Explicit public allowlist: private research, runtime state and server files cannot enter Hosting.
const files = ['earbuds.png', 'shoes.png', 'ebike.png', 'index.html', 'theme.mjs', 'theme.css', 'social-preview-v2.jpg', 'google-g.png', 'sscm-circle.svg', 'styles.css', 'app.mjs', 'firebase-config.mjs', 'src/message-sounds.mjs', 'src/typing-presence.mjs', 'src/operational-reports.mjs', 'src/supply-performance.mjs', 'src/engine.mjs', 'src/model-choices.mjs', 'src/phases.mjs', 'src/opponents.mjs', 'src/solo.mjs', 'src/test-client.mjs', 'src/session-updates.mjs', 'src/test-worker.mjs', 'src/test-classroom.mjs', 'src/firebase-client.mjs', 'notes/model.md'];
for (const file of files) {
  const target = new URL(`../dist/${file}`, import.meta.url);
  await mkdir(new URL('.', target), { recursive: true });
  await copyFile(new URL(`../${file}`, import.meta.url), target);
}
console.log(`Prepared ${files.length} public files in dist/.`);
