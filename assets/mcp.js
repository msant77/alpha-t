/*
 * The MCP page ("/mcp/", unlisted): the same flat diagram and story engine as
 * the home page's Tech Level (assets/tech.js, assets/loop.js), with other data.
 * Where the product's MCP server stands today (the client's own subscription,
 * three tiers of tools, GitHub through the client's own GitHub MCP) and where
 * the roadmap goes (dashed paths and dimmed boxes are not built yet).
 *
 * Boxes are [x, y, w, h] on a wide canvas (size) and a narrow one (sizeN).
 * Optional `cls` on a group, node or edge adds one CSS class (is-dim,
 * is-later, is-dashed). Text: mcp.* in the locale files (group.<id>,
 * node.<id>.title|short|sub|cap, edge.<id>.label|title|cap, step.<id>,
 * stepLabel.<id>, scenario.<id>, log.<k>).
 * Three scenarios, one per rail step: s1 today, from the client's chair
 * (0-12 s), s2 the client implements (12.5-25 s), s3 where it goes, one
 * roadmap item at a time (25.5-40 s).
 */
window.AlphaScenes = window.AlphaScenes || {};
window.AlphaScenes.mcp = {
  i18n: 'mcp',
  duration: 40,
  logLines: 4,
  stepLabels: true,
  narrowBelow: 560,
  size: [1000, 760],
  sizeN: [360, 1510],
  groups: [
    { id: 'tenant', kind: 'lane', box: [8, 8, 150, 532], boxN: [8, 8, 344, 206] },
    { id: 'server', kind: 'agent', box: [236, 8, 192, 532], boxN: [8, 230, 344, 274] },
    { id: 'tiers', kind: 'pipeline', box: [244, 50, 176, 262], boxN: [20, 266, 320, 226] },
    { id: 'platform', kind: 'platform', box: [508, 8, 188, 532], boxN: [8, 520, 344, 252] },
    { id: 'hosted', kind: 'lane', cls: 'is-dim', box: [780, 8, 212, 206], boxN: [8, 964, 344, 162] },
    { id: 'github', kind: 'lane', box: [780, 230, 212, 310], boxN: [8, 788, 344, 160] },
    { id: 'roadmap', kind: 'pipeline', box: [8, 556, 984, 196], boxN: [8, 1142, 344, 358] }
  ],
  nodes: [
    { id: 'ci', icon: 'play', role: 'client', box: [16, 104, 134, 58], boxN: [20, 156, 320, 46] },
    { id: 'ide', icon: 'pen', role: 'client', box: [16, 174, 134, 58], boxN: [20, 104, 320, 46] },
    { id: 'cc', icon: 'terminal', role: 'client', box: [16, 244, 134, 58], boxN: [20, 52, 320, 46] },
    { id: 't0', icon: 'search', role: 'core', step: true, box: [252, 104, 160, 58], boxN: [32, 314, 296, 48] },
    { id: 't1', icon: 'tag', role: 'core', step: true, box: [252, 174, 160, 58], boxN: [32, 372, 296, 48] },
    { id: 't2', icon: 'issue', role: 'core', step: true, box: [252, 244, 160, 58], boxN: [32, 430, 296, 48] },
    { id: 'panel', icon: 'file', role: 'core', box: [516, 72, 172, 64], boxN: [20, 556, 320, 56] },
    { id: 'api', icon: 'server', role: 'core', box: [516, 190, 172, 80], boxN: [20, 626, 320, 56] },
    { id: 'db', icon: 'db', role: 'core', box: [516, 330, 172, 58], boxN: [20, 696, 320, 56] },
    { id: 'gh-issue', icon: 'issue', role: 'github', box: [788, 276, 196, 58], boxN: [20, 826, 320, 52] },
    { id: 'gh-pr', icon: 'pr', role: 'github', box: [788, 420, 196, 58], boxN: [20, 888, 320, 52] },
    { id: 'h-tri', icon: 'search', role: 'agent', box: [788, 72, 196, 58], boxN: [20, 1014, 320, 48] },
    { id: 'h-imp', icon: 'branch', role: 'agent', box: [788, 142, 196, 58], boxN: [20, 1070, 320, 48] },
    { id: 'r1', icon: 'plug', role: 'core', step: true, status: 'concluído', box: [24, 590, 304, 46], boxN: [20, 1180, 156, 56] },
    { id: 'r2', icon: 'shield', role: 'core', step: true, status: 'concluído', box: [348, 590, 304, 46], boxN: [184, 1180, 156, 56] },
    { id: 'r3', icon: 'pr', role: 'core', step: true, box: [672, 590, 304, 46], boxN: [20, 1244, 156, 56] },
    { id: 'r4', icon: 'key', role: 'core', step: true, box: [24, 644, 304, 46], boxN: [184, 1244, 156, 56] },
    { id: 'r5', icon: 'branch', role: 'core', step: true, box: [348, 644, 304, 46], boxN: [20, 1308, 156, 56] },
    { id: 'r6', icon: 'send', role: 'core', step: true, box: [672, 644, 304, 46], boxN: [184, 1308, 156, 56] },
    { id: 'r7', icon: 'search', role: 'core', step: true, cls: 'is-later', box: [24, 698, 304, 46], boxN: [20, 1372, 156, 56] },
    { id: 'r8', icon: 'server', role: 'core', step: true, cls: 'is-later', box: [348, 698, 304, 46], boxN: [184, 1372, 156, 56] },
    { id: 'r9', icon: 'file', role: 'core', step: true, cls: 'is-later', box: [672, 698, 304, 46], boxN: [20, 1436, 156, 56] }
  ],
  edges: [
    { id: 'e-ci-t0', from: 'ci', to: 't0', fs: 'r', ts: 'l', fsN: 'l', tsN: 'l', viaN: 17 },
    { id: 'e-ide-t1', from: 'ide', to: 't1', fs: 'r', ts: 'l', fsN: 'l', tsN: 'l', viaN: 15 },
    { id: 'e-cc-t0', from: 'cc', to: 't0', fs: 'r', ts: 'l', fo: 0.25, to2: 0.8, via: 197, label: true, lp: [197, 232],
      fsN: 'l', tsN: 'l', viaN: 11 },
    { id: 'e-cc-t2', from: 'cc', to: 't2', fs: 'r', ts: 'l', label: true, lp: [194, 289],
      fsN: 'l', tsN: 'l', viaN: 13 },
    { id: 'e-t0-api', from: 't0', to: 'api', fs: 'r', ts: 'l', to2: 0.3, via: 452,
      fsN: 'r', tsN: 'r', viaN: 342 },
    { id: 'e-t2-api', from: 't2', to: 'api', fs: 'r', ts: 'l', fo: 0.35, to2: 0.85, via: 478,
      fsN: 'r', tsN: 'r', viaN: 345 },
    { id: 'e-t2-himp', from: 't2', to: 'h-imp', fs: 'r', ts: 'l', fo: 0.8, via: 490, label: true, lp: [616, 187], la: 'start',
      fsN: 'r', tsN: 'r', viaN: 348 },
    { id: 'e-api-panel', from: 'api', to: 'panel', fs: 't', ts: 'b', fsN: 't', tsN: 'b' },
    { id: 'e-api-db', from: 'api', to: 'db', fs: 'b', ts: 't', fsN: 'b', tsN: 't' },
    { id: 'e-api-issue', from: 'api', to: 'gh-issue', fs: 'r', ts: 'l', fo: 0.4, via: 718,
      fsN: 'l', tsN: 'l', viaN: 14 },
    { id: 'e-gh-mcp', from: 'cc', to: 'gh-pr', fs: 'b', ts: 'b', viaY: 510, label: true, lp: [468, 504],
      fsN: 'l', tsN: 'l', viaN: 10 },
    { id: 'e-pr-panel', from: 'gh-pr', to: 'panel', fs: 'l', ts: 'r', via: 740, cls: 'is-dashed', label: true, lp: [740, 398],
      fsN: 'r', tsN: 'r', viaN: 351 },
    { id: 'e-htri-himp', from: 'h-tri', to: 'h-imp', fs: 'b', ts: 't', fsN: 'b', tsN: 't' }
  ],
  steps: [{ id: 's1' }, { id: 's2' }, { id: 's3' }],
  events: [
    // s1 · today, from the client's chair: read, then status and issue through the tiers
    { t: 0.2, step: 's1' },
    { t: 0.3, status: { r1: 'concluído', r2: 'concluído' } },
    { t: 0.6, status: { cc: 'rodando' } },
    { t: 0.9, packet: 'e-cc-t0', dur: 0.9 },
    { t: 1.8, status: { t0: 'rodando' } },
    { t: 2.2, packet: 'e-t0-api', dur: 0.8 },
    { t: 3.0, status: { api: 'rodando' }, packet: 'e-api-db', dur: 0.6 },
    { t: 3.6, status: { db: 'concluído' } },
    { t: 3.8, packet: 'e-t0-api', back: true, dur: 0.7 },
    { t: 4.5, status: { api: 'concluído', t0: 'concluído' }, packet: 'e-cc-t0', back: true, dur: 0.8, log: { n: 't0', k: 'l1' } },
    { t: 5.3, status: { cc: 'concluído' }, log: { n: 't0', k: 'l2' } },
    { t: 6.0, status: { cc: 'rodando' }, packet: 'e-cc-t2', dur: 0.8 },
    { t: 6.8, status: { t2: 'rodando' }, packet: 'e-t2-api', dur: 0.7 },
    { t: 7.5, status: { api: 'rodando' }, packet: 'e-api-panel', dur: 0.7, log: { n: 't2', k: 'l3' } },
    { t: 8.2, status: { panel: 'concluído', api: 'concluído' } },
    { t: 8.7, packet: 'e-t2-api', dur: 0.7, log: { n: 't2', k: 'l4' } },
    { t: 9.4, status: { api: 'rodando' }, packet: 'e-api-issue', dur: 0.9 },
    { t: 10.3, status: { 'gh-issue': 'concluído', api: 'concluído', t2: 'concluído', cc: 'concluído' }, log: { n: 'gh-issue', k: 'l5' } },

    // s2 · the client implements with their own agent and GitHub MCP; the PR does not reach the panel yet
    { t: 12.5, step: 's2' },
    { t: 12.6, status: { r1: 'concluído', r2: 'concluído' } },
    { t: 13.0, status: { cc: 'rodando' }, log: { n: 'cc', k: 'b1' } },
    { t: 13.5, packet: 'e-gh-mcp', dur: 1.9 },
    { t: 15.4, status: { 'gh-pr': 'rodando' } },
    { t: 16.4, status: { 'gh-pr': 'concluído', cc: 'concluído' }, log: { n: 'gh-pr', k: 'b2' } },
    { t: 17.6, status: { r3: 'rodando' } },
    { t: 18.2, packet: 'e-pr-panel', dur: 1.8, log: { n: 'r3', k: 'b3' } },
    { t: 20.2, status: { r3: 'ignorado' } },

    // s3 · where it goes: one roadmap item at a time lights its place in the diagram
    { t: 25.5, step: 's3' },
    { t: 25.6, status: { r1: 'concluído', r2: 'concluído' } },
    { t: 26.2, status: { r3: 'rodando' }, packet: 'e-pr-panel', dur: 1.5, log: { n: 'r3', k: 'p1' } },
    { t: 28.2, status: { r3: 'aguardando', r4: 'rodando' }, pulse: 'api', log: { n: 'r4', k: 'p2' } },
    { t: 30.2, status: { r4: 'aguardando', r5: 'rodando' }, packet: 'e-t2-himp', dur: 1.6, log: { n: 'r5', k: 'p3' } },
    { t: 32.2, status: { r5: 'aguardando', r6: 'rodando' }, pulse: 'panel', log: { n: 'r6', k: 'p4' } },
    { t: 34.2, status: { r6: 'aguardando', r7: 'rodando' }, log: { n: 'r7', k: 'p5' } },
    { t: 35.0, status: { r7: 'aguardando', r8: 'rodando' } },
    { t: 35.8, status: { r8: 'aguardando', r9: 'rodando' } },
    { t: 36.6, status: { r9: 'aguardando' } }
  ]
};
