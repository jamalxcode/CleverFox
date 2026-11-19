// Slim list records: what the list needs (cards, filters, search, sorting, picks). Full records load per listing.
// Shared by tools/build.mjs and the tests (tools/test-slim.mjs).

// Memory figures from the parameter count (no file size known) are rough estimates.
export const isEstimate = (hw) => !!hw?.options?.length && hw.options.every((o) => /^parameter/i.test(o.basis || ''));

function slimClaim(c) { return c && typeof c === 'object' && !Array.isArray(c) && 'value' in c ? { value: c.value } : c; }
function slimAccess(a) {
  if (!a) return a;
  return {
    countries_available: slimClaim(a.countries_available), countries_unavailable: slimClaim(a.countries_unavailable),
    free: slimClaim(a.free), no_card_needed: a.no_card_needed,
    payment_methods: Array.isArray(a.payment_methods?.value) ? { value: a.payment_methods.value.map((m) => ({ method: m.method })) } : slimClaim(a.payment_methods),
  };
}
export function slim(r) {
  // Apps and hosts are few: their list record keeps the whole access block (sources, notes, prices, App Store
  // countries), so badges, sorting and picks use the same facts the detail shows. Only internal notes and
  // the evidence list are left out; the full record still loads when the card opens.
  if (r.type === 'app' || r.type === 'host') { const { research_notes, evidence_urls, ...rest } = r; return JSON.parse(JSON.stringify(rest)); }
  const pop = r.popularity || [];
  const o = {
    id: r.id, type: r.type, name: r.name, publisher: r.publisher, publisher_name: r.publisher_name, family: r.family,
    description: r.description, tasks: r.tasks, first_seen_at: r.first_seen_at, copy_of: r.copy_of ? r.copy_of.id : undefined, copies: r.copies?.length || undefined, listing_status: r.listing_status?.value === 'removed_at_source' ? { value: 'removed_at_source', checked_at: r.listing_status.checked_at } : undefined, warning: r.warning, verification_status: r.verification_status,
    languages: slimClaim(r.languages), publisher_region: slimClaim(r.publisher_region), availability: slimClaim(r.availability),
    license: slimClaim(r.license), parameters: slimClaim(r.parameters), local_ready: r.local_ready, size_category: r.size_category,
    answers: r.answers && { good_for: r.answers.good_for, no_barriers: r.answers.no_barriers, barriers: r.answers.barriers, x_praised: r.answers.x_praised, online: r.answers.online, online_free: r.answers.online_free, online_no_card: r.answers.online_no_card,
      uncensored: r.answers.uncensored, benchmarks: r.answers.benchmarks, independent: r.answers.independent, free: r.answers.free, gate: r.answers.gate, license_kind: r.answers.license_kind },
    hardware: r.hardware && { min_memory_gb: r.hardware.min_memory_gb, recommended_gb: r.hardware.recommended_gb, estimate: isEstimate(r.hardware) || undefined },
    platforms: r.platforms && Object.fromEntries(Object.keys(r.platforms).map((k) => [k, []])),
    popularity: pop.length ? [{ downloads_30d: pop.reduce((n, p) => n + (p.downloads_30d || 0) + pullsN(p.pulls), 0), likes: pop.reduce((n, p) => n + (p.likes || 0), 0), ...(pop.some((p) => p.runs) ? { runs: pop.reduce((n, p) => n + (p.runs || 0), 0) } : {}) }] : undefined,
    independent_benchmarks: (r.independent_benchmarks || []).filter((x) => ['epoch_eci', 'aa_intelligence'].includes(x.id)).map((x) => ({ id: x.id, display: x.display })),
    distributions: (r.distributions || []).filter((d) => d.access || d.availability === 'downloadable').slice(0, 3).map((d) => ({ source: d.source, availability: d.availability, access: slimAccess(d.access) })),
    paper_urls: r.paper_urls?.length ? [r.paper_urls[0]] : undefined,
    variants: r.variants?.length ? r.variants.length : undefined,
    signals: r.signals,
    online_from: r.online?.length ? (r.online.find((p) => p.free) ? 0 : Math.min(...r.online.map((p) => p.output ?? Infinity).filter(Number.isFinite))) : undefined,
  };
  return JSON.parse(JSON.stringify(o));
}
function pullsN(s) { const m = String(s || '').match(/^([\d.]+)([KMB]?)$/); return m ? +m[1] * ({ K: 1e3, M: 1e6, B: 1e9 }[m[2]] || 1) : 0; }
