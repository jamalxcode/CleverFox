// Decides what a workflow run does, so cron-job.org can start every run the same way:
//  - "full": refresh everything (X scan, Hugging Face and Ollama import, benchmarks, providers, App Store, re-check);
//  - "x": the quick scan between refreshes (X announcements and praise, then fill in new models and datasets);
//  - "none": build and deploy what's committed (a push).
// A run that isn't forced does a full refresh if the last one was 20 or more hours ago.
// Usage: node tools/mode.mjs <event> <requested mode: auto|full|x>   (prints the mode; writes it to $GITHUB_OUTPUT)
import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATE = join(root, 'data', 'imported', 'run-state.json');
export const FULL_EVERY_HOURS = 20;

export function decide(event, requested, state, now = new Date()) {
  if (event === 'push') return 'none';
  if (requested === 'full' || requested === 'x') return requested;
  const last = state?.last_full ? (now - new Date(state.last_full)) / 3600000 : Infinity;
  return last >= FULL_EVERY_HOURS ? 'full' : 'x';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [event = 'workflow_dispatch', requested = 'auto'] = process.argv.slice(2);
  const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {};
  const mode = decide(event, requested, state);
  if (mode === 'full') { mkdirSync(dirname(STATE), { recursive: true }); writeFileSync(STATE, JSON.stringify({ ...state, last_full: new Date().toISOString() }, null, 1) + '\n'); }
  if (mode !== 'none') { const s = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {}; writeFileSync(STATE, JSON.stringify({ ...s, last_run: new Date().toISOString(), last_mode: mode }, null, 1) + '\n'); }
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `mode=${mode}\n`);
  console.log(`Run mode: ${mode}`);
}
