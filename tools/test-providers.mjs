// Offline tests for tools/providers.mjs.
import assert from 'node:assert/strict';
import { fromHf, fromOpenRouter, run } from './providers.mjs';

const hf = fromHf([{ id: 'Qwen/Q-8B', inferenceProviderMapping: [
  { provider: 'groq', providerId: 'q-8b', status: 'live', task: 'conversational', providerDetails: { pricing: { input: 0.1, output: 0.3 }, context_length: 32768 } },
  { provider: 'novita', providerId: 'qwen/q-8b', status: 'staging', task: 'conversational' }] }, { id: 'x/none', inferenceProviderMapping: [] }]);
assert.deepEqual(Object.keys(hf), ['qwen/q-8b']);
assert.equal(hf['qwen/q-8b'].length, 1, 'only live providers');
assert.equal(hf['qwen/q-8b'][0].host_id, 'cf:host:groq');
assert.equal(hf['qwen/q-8b'][0].output, 0.3);

const or = fromOpenRouter([{ id: 'qwen/q-8b:free', hugging_face_id: 'Qwen/Q-8B', pricing: { prompt: '0', completion: '0' } },
  { id: 'qwen/q-8b', hugging_face_id: 'Qwen/Q-8B', pricing: { prompt: '0.0000001', completion: '0.0000004' } }, { id: 'closed/model', hugging_face_id: '' }]);
assert.equal(or['qwen/q-8b'].length, 2);
assert.equal(or['qwen/q-8b'][0].free, true);
assert.equal(or['qwen/q-8b'][1].output, 0.4);

// A failing source keeps the last data; a shrunken one too.
const prev = { huggingface: { a: [], b: [], c: [] }, openrouter: { a: [] }, sources: {} };
const out = await run({ prev, fetchImpl: async () => { throw new Error('down'); }, log: () => {} });
assert.deepEqual(Object.keys(out.huggingface), ['a', 'b', 'c']);
const fake = async (url) => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => (url.includes('openrouter') ? { data: [] } : [{ id: 'a/a', inferenceProviderMapping: [{ provider: 'groq', status: 'live' }] }]) });
const out2 = await run({ prev, fetchImpl: fake, log: () => {} });
assert.deepEqual(Object.keys(out2.huggingface), ['a', 'b', 'c'], 'shrunk below 80%: kept');
console.log('All provider tests passed.');
