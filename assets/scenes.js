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
 *   ring    node ids around the 3D loop, in order; floating = extra cards.
 *   edges   from -> to; across = arc over the ring; float = short drop.
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
    custo: { value: 1.12, fmt: 'brl' },
    aprovacoes: { value: 2 },
    entregues: { value: 3 }
  },
  ring: ['widget', 'painel', 'triagem', 'issue', 'impl', 'pr', 'revisao'],
  floating: [
    { id: 'cli', wide: [2.2, 2.35, -3.9], narrow: [-0.95, 4.9, -1.2] },
    { id: 'mcp', wide: [5.3, 2.35, -3.2], narrow: [0.95, 4.9, -1.2] }
  ],
  nodes: [
    { id: 'widget', role: 'client', at: [2, 1], order: 0,
      meters: [{ kind: 'stat', stat: 'feedbacks' }, { kind: 'text', key: 't1' }] },
    { id: 'painel', role: 'core', at: [2, 2], order: 1,
      meters: [{ kind: 'stat', stat: 'fila' }, { kind: 'stat', stat: 'anexos' }] },
    { id: 'cli', role: 'core', small: true, at: [1, 2], order: 2, half: true,
      meters: [{ kind: 'stat', stat: 'cli' }] },
    { id: 'mcp', role: 'core', small: true, at: [3, 2], order: 3, half: true,
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
    { id: 'cli-p', from: 'cli', to: 'painel', float: true },
    { id: 'mcp-p', from: 'mcp', to: 'painel', float: true },
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
    { t: 15.0, status: { cli: 'rodando' }, packet: 'cli-p', dur: 1.2, add: { cli: 1 }, log: { n: 'cli', k: 'c1' } },
    { t: 16.3, status: { cli: 'concluído', mcp: 'rodando' }, packet: 'mcp-p', dur: 1.2, add: { mcp: 1 },
      log: { n: 'mcp', k: 'm1' } },
    { t: 17.8, status: { mcp: 'concluído', revisao: 'rodando' }, add: { aprovacoes: 1 }, log: { n: 'revisao', k: 'r1' } },
    { t: 18.4, packet: 'ok', dur: 1.8, step: 'impl' },
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
    { t: 33.4, status: { revisao: 'concluído' }, add: { prs: -1 }, log: { n: 'revisao', k: 'r3' } },
    { t: 34.0, packet: 'r-w', dur: 2.4 },
    { t: 36.4, pulse: 'widget', add: { entregues: 1 }, log: { n: 'widget', k: 'w3' } }
  ]
};
