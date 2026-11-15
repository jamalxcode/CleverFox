// Offline tests for tools/xpost.mjs.
import assert from 'node:assert/strict';
import { oauthHeader, composePost } from './xpost.mjs';

// X's own documented OAuth 1.0a example ("Creating a signature").
const { signature } = oauthHeader({ method: 'POST', url: 'https://api.twitter.com/1.1/statuses/update.json',
  params: { include_entities: 'true', status: 'Hello Ladies + Gentlemen, a signed OAuth request!' },
  key: 'xvz1evFS4wEEPTGEFPHBog', secret: 'kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw',
  token: '370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb', tokenSecret: 'LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE',
  nonce: 'kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg', timestamp: 1318622958 });
assert.equal(signature, 'hCtSmYh+iHYCEqBWrE7C7hYmtUk=');

const rec = (type, name, day, dl = 0) => ({ type, name, first_seen_at: `${day}T00:00:00Z`, warning: 'none', popularity: [{ downloads_30d: dl }] });
const records = [rec('model', 'Old One', '2026-11-01'), rec('model', 'Alpha-7B', '2026-11-14', 900), rec('model', 'Beta-3B', '2026-11-15', 50), rec('app', 'Chatty', '2026-11-13'), rec('host', 'GPUs R Us', '2026-11-12')];
const text = composePost(records, new Date('2026-11-16T06:00:00Z'));
assert.ok(text.startsWith('New on CleverFox this week: 2 models, 1 app, 1 hosting or API provider.'), text);
assert.ok(text.includes('Chatty') && text.endsWith('https://jamalxcode.github.io/CleverFox/new/'));
assert.ok(!text.includes('Old One'), 'the first day (initial import) is not new');
assert.ok(text.length - 'https://jamalxcode.github.io/CleverFox/new/'.length + 23 <= 280);
assert.equal(composePost([rec('model', 'Old One', '2026-11-01')], new Date('2026-11-16')), null);
console.log('All X posting tests passed.');
