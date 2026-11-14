/*
 * Alpha Tester scenes: the structure of every story the site tells.
 * Played by assets/loop.js (and drawn in 3D by assets/hero3d.js).
 *
 * No text lives here: every word is in assets/i18n/<locale>.json, found by
 * convention from the ids below (i18n prefix "hero"):
 *   hero.node.<id>.title | short | sub | cap[]   hero.node.<id>.m.<meter>
 *   hero.edge.<id>.title | cap[]                 hero.step.<id> (caption)
 *   hero.legend.<role>                           hero.log.<k>
 * Rail labels are common.rail.<step id>.
 *
 * Structure:
 *   nodes   cards. role = colour (client | core | agent | github | human);
 *           at / order / half = place in the flat fallback layout.
 *   ring    the loop's steps, in order, on the 3D carousel (the running one
 *           turns to the front); satellites = fixed cards outside it.
 *   edges   from -> to; across = arc over the ring.
 *   steps   the progress rail; focus = the card the camera goes to.
 *   events  what happens at t seconds: status, bar ("node.meter": 0-100
 *           over dur), add (counters, kept across loops), packet (an edge),
 *           step, pulse, log ({n: node, k: key under hero.log}).
 *           {stat} in a text prints a counter.
 * The "Como funciona" cards take their captions and task logs from
 * como.<card>.cap / como.<card>.log in the same locale files.
 */
window.AlphaScenes = window.AlphaScenes || {};

window.AlphaScenes.hero = {
  i18n: 'hero',
  duration: 40,
  cols: 3,
  wideMin: 700,
  logLines: 4,
  legend: [{ role: 'client' }, { role: 'core' }, { role: 'agent' }, { role: 'github' }, { role: 'human' }],
  stats: {
    feedbacks: { value: 17 },
    fila: { value: 0 },
    anexos: { value: 31 },
    cli: { value: 4 },
    mcp: { value: 9 },
    triagens: { value: 16 },
    issues: { value: 6 },
    issueNo: { value: 41 },
    prs: { value: 2 },
    prNo: { value: 17 },
    custo: { value: 1.12, fmt: 'money' },
    aprovacoes: { value: 2 },
    entregues: { value: 3 }
  },
  ring: ['widget', 'painel', 'triagem', 'issue', 'impl', 'pr', 'revisao'],
  // tools that are not steps: fixed cards outside the 3D carousel, tied to the Painel
  satellites: ['cli', 'mcp'],
  satelliteAnchor: 'painel',
  nodes: [
    { id: 'widget', role: 'client', at: [2, 1], order: 0,
      meters: [{ kind: 'stat', stat: 'feedbacks' }, { kind: 'text', key: 't1' }] },
    { id: 'painel', role: 'core', at: [2, 2], order: 1,
      meters: [{ kind: 'stat', stat: 'fila' }, { kind: 'stat', stat: 'anexos' }] },
    { id: 'cli', icon: 'terminal', role: 'core', small: true, at: [1, 2], order: 2, half: true,
      meters: [{ kind: 'stat', stat: 'cli' }] },
    { id: 'mcp', icon: 'plug', role: 'core', small: true, at: [3, 2], order: 3, half: true,
      meters: [{ kind: 'stat', stat: 'mcp' }] },
    { id: 'triagem', role: 'agent', at: [2, 3], order: 4,
      meters: [{ kind: 'bar', id: 'seg' }, { kind: 'bar', id: 'dup' }, { kind: 'bar', id: 'cls' },
               { kind: 'stat', stat: 'triagens' }] },
    { id: 'issue', role: 'github', at: [3, 4], order: 5,
      meters: [{ kind: 'stat', stat: 'issues' }, { kind: 'text', key: 't1' }] },
    { id: 'impl', role: 'agent', at: [1, 4], order: 6,
      meters: [{ kind: 'bar', id: 'clone' }, { kind: 'bar', id: 'edit' }, { kind: 'bar', id: 'check' },
               { kind: 'stat', stat: 'custo' }] },
    { id: 'pr', role: 'github', at: [1, 5], order: 7,
      meters: [{ kind: 'stat', stat: 'prs' }, { kind: 'text', key: 't1' }] },
    { id: 'revisao', role: 'human', at: [2, 5], order: 8,
      meters: [{ kind: 'stat', stat: 'aprovacoes' }, { kind: 'stat', stat: 'entregues' }] }
  ],
  edges: [
    { id: 'w-p', from: 'widget', to: 'painel' },
    { id: 'cli-p', from: 'cli', to: 'painel' },
    { id: 'mcp-p', from: 'mcp', to: 'painel' },
    { id: 'p-t', from: 'painel', to: 'triagem' },
    { id: 't-i', from: 'triagem', to: 'issue' },
    { id: 'i-m', from: 'issue', to: 'impl' },
    { id: 'ok', from: 'revisao', to: 'impl', across: true },
    { id: 'm-pr', from: 'impl', to: 'pr' },
    { id: 'pr-r', from: 'pr', to: 'revisao' },
    { id: 'r-w', from: 'revisao', to: 'widget', route: 'side' }
  ],
  steps: [
    { id: 'relato', focus: 'widget' },
    { id: 'triagem', focus: 'triagem' },
    { id: 'issue', focus: 'issue' },
    { id: 'impl', focus: 'impl' },
    { id: 'revisao', focus: 'revisao' }
  ],
  events: [
    { t: 0.4, step: 'relato', status: { widget: 'rodando' }, log: { n: 'widget', k: 'w1' } },
    { t: 1.7, log: { n: 'widget', k: 'w2' } },
    { t: 2.6, packet: 'w-p', dur: 1.6, add: { feedbacks: 1 } },
    { t: 4.2, status: { widget: 'concluído', painel: 'rodando' }, add: { fila: 1, anexos: 1 },
      log: { n: 'painel', k: 'p1' } },
    { t: 5.1, packet: 'p-t', dur: 1.5, log: { n: 'painel', k: 'p2' } },
    { t: 6.6, step: 'triagem', status: { painel: 'aguardando', triagem: 'rodando' }, bar: { 'triagem.seg': 100 }, dur: 1.8 },
    { t: 8.5, bar: { 'triagem.dup': 100 }, dur: 1.8, log: { n: 'triagem', k: 't1' } },
    { t: 10.4, bar: { 'triagem.cls': 100 }, dur: 1.4, log: { n: 'triagem', k: 't2' } },
    { t: 11.9, add: { triagens: 1, custo: 0.04 }, log: { n: 'triagem', k: 't3' } },
    { t: 12.4, packet: 't-i', dur: 1.6, add: { issueNo: 1, fila: -1 } },
    { t: 14.0, step: 'issue', status: { triagem: 'concluído', issue: 'concluído' }, add: { issues: 1 },
      log: { n: 'issue', k: 'i1' } },
    { t: 16.2, status: { revisao: 'rodando' }, add: { aprovacoes: 1 }, log: { n: 'revisao', k: 'r1' } },
    { t: 17.6, packet: 'ok', dur: 1.8, step: 'impl' },
    { t: 19.4, packet: 'i-m', dur: 1.5 },
    { t: 21.0, status: { revisao: 'aguardando', impl: 'rodando' }, bar: { 'impl.clone': 100 }, dur: 1.2,
      log: { n: 'impl', k: 'x1' } },
    { t: 22.3, bar: { 'impl.edit': 100 }, dur: 3.0 },
    { t: 25.4, bar: { 'impl.check': 100 }, dur: 1.4, log: { n: 'impl', k: 'x2' } },
    { t: 26.9, add: { custo: 0.38 }, log: { n: 'impl', k: 'x3' } },
    { t: 27.4, packet: 'm-pr', dur: 1.5, add: { prNo: 1 } },
    { t: 28.9, status: { impl: 'concluído', pr: 'concluído' }, add: { prs: 1 }, log: { n: 'pr', k: 'pr1' } },
    { t: 29.8, packet: 'pr-r', dur: 1.5, step: 'revisao' },
    { t: 31.3, status: { revisao: 'rodando' }, log: { n: 'revisao', k: 'r2' } },
    // during the review the satellites answer: the CLI lists, the MCP server serves a tool call
    { t: 31.8, status: { cli: 'rodando' }, packet: 'cli-p', dur: 1.3, add: { cli: 1 }, log: { n: 'cli', k: 'c1' } },
    { t: 32.7, status: { cli: 'concluído', mcp: 'rodando' }, packet: 'mcp-p', dur: 1.3, add: { mcp: 1 },
      log: { n: 'mcp', k: 'm1' } },
    { t: 33.9, status: { mcp: 'concluído', revisao: 'concluído' }, add: { prs: -1 }, log: { n: 'revisao', k: 'r3' } },
    { t: 34.4, packet: 'r-w', dur: 2.4 },
    { t: 36.8, pulse: 'widget', add: { entregues: 1 }, log: { n: 'widget', k: 'w3' } }
  ]
};

/*
 * "Tech Level": the same loop as a flat architecture diagram (assets/tech.js).
 * Boxes are [x, y, w, h] on a wide canvas (size) and a narrow one (sizeN).
 * Edge sides: fs / ts = r l t b (narrow: fsN / tsN); fo / to2 = where on that
 * side, 0 to 1; via / viaN = x of the vertical leg. Text: tech.* in the
 * locale files (group.<id>, node.<id>.title|short|sub|cap, edge.<id>.label|
 * title|cap, step.<id>, stepLabel.<id>, log.<k>).
 * Three scenarios, one per rail step: s1 feedback -> triage -> issue (0-10 s),
 * s2 approval -> implementation -> draft PR (10.5-21 s), s3 a duplicate:
 * no new issue, +1 on the original, status back in the painel (21.5-32 s).
 */
window.AlphaScenes.tech = {
  i18n: 'tech',
  duration: 32,
  logLines: 4,
  stepLabels: true,
  narrowBelow: 560,
  size: [1000, 600],
  sizeN: [360, 1180],
  groups: [
    { id: 'events', kind: 'lane', box: [8, 8, 166, 584], boxN: [8, 8, 344, 150] },
    { id: 'platform', kind: 'platform', box: [186, 8, 622, 584], boxN: [8, 170, 344, 868] },
    { id: 'agent', kind: 'agent', box: [420, 40, 244, 540], boxN: [20, 420, 320, 600] },
    { id: 'tri', kind: 'pipeline', box: [432, 70, 220, 226], boxN: [30, 450, 300, 226] },
    { id: 'imp', kind: 'pipeline', box: [432, 318, 220, 252], boxN: [30, 690, 300, 316] },
    { id: 'results', kind: 'lane', box: [820, 8, 172, 584], boxN: [8, 1050, 344, 120] }
  ],
  nodes: [
    { id: 'ev-fb', icon: 'send', role: 'client', box: [18, 100, 146, 58], boxN: [18, 40, 104, 58] },
    { id: 'ev-acc', icon: 'check', role: 'human', box: [18, 300, 146, 58], boxN: [128, 40, 104, 58] },
    { id: 'ev-impl', icon: 'play', role: 'human', box: [18, 400, 146, 58], boxN: [238, 40, 104, 58] },
    { id: 'api', icon: 'server', role: 'core', box: [200, 100, 160, 64], boxN: [24, 200, 312, 60] },
    { id: 'cli', role: 'core', box: [200, 196, 76, 52], boxN: [24, 274, 96, 52] },
    { id: 'mcp', role: 'core', box: [284, 196, 76, 52], boxN: [128, 274, 96, 52] },
    { id: 'db', icon: 'db', role: 'core', box: [200, 290, 160, 58], boxN: [232, 274, 104, 52] },
    { id: 'keys', icon: 'key', role: 'core', box: [690, 52, 116, 46], boxN: [24, 344, 150, 52] },
    { id: 'model', icon: 'spark', role: 'agent', box: [690, 116, 116, 62], boxN: [186, 344, 150, 56] },
    { id: 't1', icon: 'search', role: 'agent', step: true, box: [442, 100, 200, 40], boxN: [40, 478, 280, 40] },
    { id: 't2', icon: 'tag', role: 'agent', step: true, box: [442, 148, 200, 40], boxN: [40, 524, 280, 40] },
    { id: 't3', icon: 'issue', role: 'agent', step: true, box: [442, 196, 200, 40], boxN: [40, 570, 280, 40] },
    { id: 't4', icon: 'coin', role: 'agent', step: true, box: [442, 244, 200, 40], boxN: [40, 616, 280, 40] },
    { id: 'i1', icon: 'branch', role: 'agent', step: true, box: [442, 348, 200, 38], boxN: [40, 718, 280, 40] },
    { id: 'i2', icon: 'file', role: 'agent', step: true, box: [442, 392, 200, 38], boxN: [40, 772, 280, 40] },
    { id: 'i3', icon: 'pen', role: 'agent', step: true, box: [442, 436, 200, 38], boxN: [40, 826, 280, 40] },
    { id: 'i4', icon: 'shield', role: 'agent', step: true, box: [442, 480, 200, 38], boxN: [40, 880, 280, 40] },
    { id: 'i5', icon: 'pr', role: 'agent', step: true, box: [442, 524, 200, 38], boxN: [40, 934, 280, 40] },
    { id: 'r-issue', icon: 'issue', role: 'github', box: [832, 196, 148, 58], boxN: [18, 1082, 104, 66] },
    { id: 'r-comment', icon: 'comment', role: 'github', box: [832, 300, 148, 58], boxN: [128, 1082, 104, 66] },
    { id: 'r-pr', icon: 'pr', role: 'github', box: [832, 512, 148, 58], boxN: [238, 1082, 104, 66] }
  ],
  edges: [
    { id: 'e-fb', from: 'ev-fb', via: 180, lp: [183, 92], to: 'api', fs: 'r', ts: 'l', to2: 0.3, label: true,
      fsN: 'b', tsN: 't', toN: 0.2 },
    { id: 'e-acc', from: 'ev-acc', via: 180, to: 'api', fs: 'r', ts: 'l', to2: 0.6, 
      fsN: 'b', tsN: 't', toN: 0.5 },
    { id: 'e-impl', from: 'ev-impl', via: 180, to: 'api', fs: 'r', ts: 'l', to2: 0.85, 
      fsN: 'b', tsN: 't', toN: 0.8 },
    { id: 'e-db', from: 'api', to: 'db', fs: 'b', ts: 't', fo: 0.5, to2: 0.5, foN: 0.833, toN: 0.5 },
    { id: 'e-cli', from: 'cli', to: 'api', fs: 't', ts: 'b', to2: 0.24, toN: 0.155 },
    { id: 'e-mcp', from: 'mcp', to: 'api', fs: 't', ts: 'b', to2: 0.77, toN: 0.49 },
    { id: 'e-hook', from: 'api', via: 400, lp: [400, 108], to: 't1', fs: 'r', ts: 'l', fo: 0.3, label: true,
      fsN: 'l', tsN: 'l', foN: 0.3, viaN: 12 },
    { id: 'e-ev', from: 'api', via: 390, lp: [386, 384], la: 'end', to: 'i1', fs: 'r', ts: 'l', fo: 0.8, label: true,
      fsN: 'l', tsN: 'l', foN: 0.8, viaN: 17 },
    { id: 'e-keys', from: 'keys', lp: [748, 106], la: 'start', to: 'model', fs: 'b', ts: 't', label: true, fsN: 'r', tsN: 'l' },
    { id: 'e-mtri', from: 't2', via: 666, lp: [742, 196], to: 'model', fs: 'r', ts: 'l', to2: 0.5, label: true,
      fsN: 'r', tsN: 'r', viaN: 346 },
    { id: 'e-mimp', from: 'i3', via: 676, to: 'model', fs: 'r', ts: 'l', to2: 0.8, 
      fsN: 'r', tsN: 'r', toN: 0.8, viaN: 352 },
    { id: 'e-issue', from: 't3', via: 814, lp: [742, 232], to: 'r-issue', fs: 'r', ts: 'l', label: true,
      fsN: 'l', tsN: 'l', viaN: 7 },
    { id: 'e-comment', from: 'tri', via: 814, lp: [742, 278], to: 'r-comment', fs: 'r', ts: 'l', fo: 0.95, label: true,
      fsN: 'b', tsN: 't' },
    { id: 'e-pr', from: 'i5', via: 814, lp: [742, 535], to: 'r-pr', fs: 'r', ts: 'l', label: true,
      fsN: 'r', tsN: 'r', viaN: 355 }
  ],
  steps: [{ id: 's1' }, { id: 's2' }, { id: 's3' }],
  events: [
    { t: 0.2, step: 's1' },
    { t: 0.3, status: { 'ev-fb': 'rodando' }, log: { n: 'ev-fb', k: 'w1' } },
    { t: 0.8, packet: 'e-fb', dur: 1.0 },
    { t: 1.8, status: { 'ev-fb': 'concluído', api: 'rodando' }, log: { n: 'api', k: 'a1' } },
    { t: 2.2, packet: 'e-db', dur: 0.7 },
    { t: 2.9, status: { db: 'concluído' } },
    { t: 3.1, packet: 'e-hook', dur: 1.0 },
    { t: 4.1, status: { api: 'concluído', t1: 'rodando' }, log: { n: 't1', k: 't1' } },
    { t: 4.9, status: { t1: 'concluído', t2: 'rodando' }, packet: 'e-mtri', dur: 0.8 },
    { t: 5.7, status: { model: 'concluído' }, packet: 'e-mtri', back: true, dur: 0.8 },
    { t: 6.5, status: { t2: 'concluído', t3: 'rodando' }, log: { n: 't2', k: 't2' } },
    { t: 6.9, packet: 'e-issue', dur: 1.0 },
    { t: 7.9, status: { t3: 'concluído', 'r-issue': 'concluído' }, log: { n: 'r-issue', k: 'i1' } },
    { t: 8.2, status: { t4: 'rodando' } },
    { t: 8.9, status: { t4: 'concluído', mcp: 'rodando' }, packet: 'e-mcp', dur: 0.8, log: { n: 't4', k: 't4' } },
    { t: 9.7, status: { mcp: 'concluído' }, log: { n: 'mcp', k: 'm1' } },

    { t: 10.5, step: 's2' },
    { t: 10.8, status: { 'ev-acc': 'rodando' }, log: { n: 'ev-acc', k: 'c1' } },
    { t: 11.2, packet: 'e-acc', dur: 0.9 },
    { t: 12.1, status: { 'ev-acc': 'concluído', api: 'rodando', 'ev-impl': 'rodando' }, log: { n: 'ev-impl', k: 'p1' } },
    { t: 12.4, packet: 'e-impl', dur: 0.9 },
    { t: 13.3, status: { 'ev-impl': 'concluído', keys: 'rodando' }, packet: 'e-keys', dur: 0.7 },
    { t: 13.6, packet: 'e-ev', dur: 1.0 },
    { t: 14.0, status: { keys: 'concluído' } },
    { t: 14.6, status: { api: 'concluído', i1: 'rodando' }, log: { n: 'i1', k: 'x1' } },
    { t: 15.4, status: { i1: 'concluído', i2: 'rodando' } },
    { t: 16.0, status: { i2: 'concluído', i3: 'rodando' }, packet: 'e-mimp', dur: 0.8 },
    { t: 16.8, status: { model: 'concluído' }, packet: 'e-mimp', back: true, dur: 0.8 },
    { t: 17.7, status: { i3: 'concluído', i4: 'rodando' }, log: { n: 'i4', k: 'x2' } },
    { t: 18.6, status: { i4: 'concluído', i5: 'rodando' } },
    { t: 18.9, packet: 'e-pr', dur: 1.0 },
    { t: 19.9, status: { i5: 'concluído', 'r-pr': 'concluído' }, log: { n: 'r-pr', k: 'pr1' } },

    { t: 21.5, step: 's3' },
    { t: 21.8, status: { 'ev-fb': 'rodando' }, log: { n: 'ev-fb', k: 'w2' } },
    { t: 22.2, packet: 'e-fb', dur: 0.9 },
    { t: 23.1, status: { 'ev-fb': 'concluído', api: 'rodando' } },
    { t: 23.4, packet: 'e-hook', dur: 1.0 },
    { t: 24.4, status: { api: 'concluído', t1: 'rodando' } },
    { t: 25.1, status: { t1: 'concluído', t2: 'rodando' }, packet: 'e-mtri', dur: 0.7 },
    { t: 25.8, status: { model: 'concluído' }, packet: 'e-mtri', back: true, dur: 0.7 },
    { t: 26.6, status: { t2: 'concluído', t3: 'ignorado' }, log: { n: 't2', k: 'd1' } },
    { t: 27.0, packet: 'e-comment', dur: 1.0 },
    { t: 28.0, status: { 'r-comment': 'concluído' }, log: { n: 'r-comment', k: 'd2' } },
    { t: 28.3, packet: 'e-hook', back: true, dur: 1.0 },
    { t: 29.3, status: { api: 'concluído', t4: 'rodando' }, log: { n: 'api', k: 'd3' } },
    { t: 29.9, status: { t4: 'concluído', cli: 'rodando' }, packet: 'e-cli', dur: 0.8 },
    { t: 30.7, status: { cli: 'concluído' }, log: { n: 'cli', k: 'c2' } }
  ]
};
