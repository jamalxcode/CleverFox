// "Use it online": which API providers serve each model, with prices. Two official, public sources:
//  - Hugging Face's Inference Providers mapping (provider, its model id, price per million tokens);
//  - OpenRouter's model list (its model id, the Hugging Face id it maps to, prices, free variants).
// Output: data/imported/providers.json, keyed by Hugging Face model id (lowercase). Keeps the last
// file if a source fails or shrinks below 80%.
//
// Usage: node tools/providers.mjs   (behind a proxy: NODE_USE_ENV_PROXY=1)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'data', 'imported', 'providers.json');
const HF_URL = 'https://huggingface.co/api/models?inference_provider=all&limit=1000&expand[]=inferenceProviderMapping';
const OR_URL = 'https://openrouter.ai/api/v1/models';
export const RULES = { hfPages: 15, shrink: 0.8 };

// Provider names as Hugging Face writes them -> display name and our host listing, where we have one.
export const PROVIDERS = {
  'hf-inference': ['Hugging Face', 'cf:host:hugging-face-inference-providers'], groq: ['Groq', 'cf:host:groq'], cerebras: ['Cerebras', 'cf:host:cerebras-inference'],
  hyperbolic: ['Hyperbolic', 'cf:host:hyperbolic'], nebius: ['Nebius', 'cf:host:nebius'], ovhcloud: ['OVHcloud', 'cf:host:ovhcloud'], scaleway: ['Scaleway', 'cf:host:scaleway'],
  'zai-org': ['Z.ai', 'cf:host:z-ai-api'], together: ['Together AI', null], deepinfra: ['DeepInfra', null], novita: ['Novita AI', null], 'fireworks-ai': ['Fireworks AI', null],
  'featherless-ai': ['Featherless', null], baseten: ['Baseten', null], 'fal-ai': ['fal', null], wavespeed: ['WaveSpeed', null], nscale: ['Nscale', null], replicate: ['Replicate', null],
  cohere: ['Cohere', null], publicai: ['Public AI', null], sambanova: ['SambaNova', null], openrouter: ['OpenRouter', 'cf:host:openrouter'],
};

const getJson = async (url, fetchImpl, tries = 3) => {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetchImpl(url, { headers: { accept: 'application/json', 'user-agent': 'CleverFox/1.0 (+https://jamalxcode.github.io/CleverFox/)' } });
      if (res.status === 429) { await new Promise((r) => setTimeout(r, 5000 * (i + 1))); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { data: await res.json(), next: (res.headers.get?.('link') || '').match(/<([^>]+)>;\s*rel="next"/)?.[1] || null };
    } catch (e) { if (i === tries - 1) throw e; await new Promise((r) => setTimeout(r, 2000 * (i + 1))); }
  }
  return { data: null, next: null };
};

// Hugging Face mapping -> { hfId: [{provider, name, host_id, model_id, input, output, context, task}] }
export function fromHf(models) {
  const out = {};
  for (const m of models || []) {
    const live = (m.inferenceProviderMapping || []).filter((p) => p.status === 'live');
    if (!live.length) continue;
    out[m.id.toLowerCase()] = live.map((p) => ({
      provider: p.provider, name: PROVIDERS[p.provider]?.[0] || p.provider, host_id: PROVIDERS[p.provider]?.[1] || null,
      model_id: p.providerId, task: p.task, input: p.providerDetails?.pricing?.input ?? null, output: p.providerDetails?.pricing?.output ?? null,
      context: p.providerDetails?.context_length ?? null, via: 'huggingface',
      url: `https://huggingface.co/${m.id}?inference_provider=${encodeURIComponent(p.provider)}`,
    }));
  }
  return out;
}

// OpenRouter list -> same shape; prices there are per token as strings.
export function fromOpenRouter(list) {
  const out = {};
  for (const m of list || []) {
    const hf = (m.hugging_face_id || '').toLowerCase();
    if (!hf) continue;
    const perM = (v) => (v == null || v === '' || isNaN(+v)) ? null : +(+v * 1e6).toFixed(4);
    const input = perM(m.pricing?.prompt); const output = perM(m.pricing?.completion);
    (out[hf] ||= []).push({ provider: 'openrouter', name: 'OpenRouter', host_id: 'cf:host:openrouter', model_id: m.id, task: 'conversational',
      input, output, context: m.context_length ?? null, free: input === 0 && output === 0, via: 'openrouter', url: `https://openrouter.ai/${m.id}` });
  }
  return out;
}

export async function run({ fetchImpl = fetch, prev = null, now = new Date().toISOString().replace(/\.\d+Z$/, 'Z'), log = console.log } = {}) {
  let hf = null; let or = null;
  try {
    const all = []; let url = HF_URL;
    for (let i = 0; url && i < RULES.hfPages; i++) { const { data, next } = await getJson(url, fetchImpl); all.push(...(data || [])); url = next; }
    hf = fromHf(all);
    log(`Providers: Hugging Face mapping for ${Object.keys(hf).length} models`);
  } catch (e) { log(`Providers: Hugging Face failed (${e.message}); keeping the last data`); }
  try {
    const { data } = await getJson(OR_URL, fetchImpl);
    or = fromOpenRouter(data?.data);
    log(`Providers: OpenRouter lists ${Object.keys(or).length} models with a Hugging Face id`);
  } catch (e) { log(`Providers: OpenRouter failed (${e.message}); keeping the last data`); }
  const keep = (fresh, old, label) => {
    if (!fresh) return old || {};
    if (old && Object.keys(fresh).length < Object.keys(old).length * RULES.shrink) { log(`Providers: ${label} shrank; keeping the last data`); return old; }
    return fresh;
  };
  return {
    sources: { huggingface: { url: HF_URL, observed_at: hf ? now : prev?.sources?.huggingface?.observed_at || null }, openrouter: { url: OR_URL, observed_at: or ? now : prev?.sources?.openrouter?.observed_at || null } },
    huggingface: keep(hf, prev?.huggingface, 'Hugging Face'), openrouter: keep(or, prev?.openrouter, 'OpenRouter'),
  };
}

async function main() {
  mkdirSync(dirname(OUT), { recursive: true });
  const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null;
  const out = await run({ prev });
  writeFileSync(OUT, JSON.stringify(out) + '\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
