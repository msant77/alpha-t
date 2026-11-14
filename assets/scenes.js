/*
 * Alpha Tester scenes: every story the site tells, as data.
 * Played by assets/loop.js (and drawn in 3D by assets/hero3d.js).
 * Edit the story, the captions and the log lines here; nothing else changes.
 *
 * Format, in short:
 *   nodes   cards. role = colour (client | core | agent | github | human);
 *           cap = the caption lines shown when someone points at the card;
 *           at / order / half = place in the flat fallback layout.
 *   ring    node ids around the 3D loop, in order; floating = extra cards.
 *   edges   from -> to, with a caption; across = arc over the ring.
 *   steps   the progress rail; focus = the card the camera goes to.
 *   events  what happens at t seconds: status, bar ("node.meter": 0-100
 *           over dur), add (counters, kept across loops), packet (an edge),
 *           step, pulse, log ({n: node, text}).  {stat} prints a counter.
 */
window.AlphaScenes = window.AlphaScenes || {};

window.AlphaScenes.hero = {
  title: 'o ciclo',
  duration: 40,
  cols: 3,
  wideMin: 700,
  logLines: 4,
  legend: [
    { role: 'client', label: 'site do cliente' },
    { role: 'core', label: 'painel · CLI · MCP' },
    { role: 'agent', label: 'agentes' },
    { role: 'github', label: 'GitHub' },
    { role: 'human', label: 'seu time' }
  ],
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
    { id: 'widget', role: 'client', title: 'Widget', short: 'widget', sub: 'no site do cliente',
      at: [2, 1], order: 0,
      meters: [{ kind: 'stat', stat: 'feedbacks', label: 'feedbacks hoje' },
               { kind: 'text', text: 'tela · console · ambiente' }],
      cap: ['Quem testa marca a região e o relato leva a tela, o console e o ambiente.',
            'Chave pública: só envia feedback. Sem conexão, espera na fila do navegador.'] },
    { id: 'painel', role: 'core', title: 'Painel', short: 'painel', sub: 'empresas · projetos',
      at: [2, 2], order: 1,
      meters: [{ kind: 'stat', stat: 'fila', label: 'na fila' },
               { kind: 'stat', stat: 'anexos', label: 'anexos' }],
      cap: ['Empresas, projetos e membros com papéis; feedback com filtros e histórico.',
            'Capturas em armazenamento privado. Avisa os agentes por um webhook assinado.'] },
    { id: 'cli', role: 'core', title: 'at CLI', short: 'at', sub: 'chave secreta', small: true,
      at: [1, 2], order: 2, half: true,
      meters: [{ kind: 'stat', stat: 'cli', label: 'chamadas' }],
      cap: ['O feedback no terminal, com a chave secreta do projeto: lista, lê, faz a triagem e abre issues.',
            'Em breve.'] },
    { id: 'mcp', role: 'core', title: 'Servidor MCP', short: 'mcp', sub: 'níveis T0 a T2', small: true,
      at: [3, 2], order: 3, half: true,
      meters: [{ kind: 'stat', stat: 'mcp', label: 'ferramentas' }],
      cap: ['Para qualquer agente que fale MCP: T0 lê, T1 anota, T2 propõe.',
            'Nenhuma ferramenta devolve quem reportou. Em breve.'] },
    { id: 'triagem', role: 'agent', title: 'Agente de triagem', short: 'triagem', sub: 'chave e teto do projeto',
      at: [2, 3], order: 4,
      meters: [{ kind: 'bar', id: 'seg', label: 'segurança' },
               { kind: 'bar', id: 'dup', label: 'duplicados' },
               { kind: 'bar', id: 'cls', label: 'classifica' },
               { kind: 'stat', stat: 'triagens', label: 'triagens' }],
      cap: ['Segurança primeiro: o texto de quem testa é dado, nunca instrução.',
            'Depois duplicados, tipo e tamanho, dentro do orçamento diário do projeto. Em breve.'] },
    { id: 'issue', role: 'github', title: 'Issue no GitHub', short: 'github', sub: 'alpha-t · type:bug · size:S',
      at: [3, 4], order: 5,
      meters: [{ kind: 'stat', stat: 'issues', label: 'issues hoje' },
               { kind: 'text', text: 'última: #{issueNo}' }],
      cap: ['Uma issue por feedback, no repositório do projeto, com etiquetas.',
            'Token fine-grained de um só repositório, cifrado no painel.'] },
    { id: 'impl', role: 'agent', title: 'Implementador', short: 'implementador', sub: 'aprovado no painel',
      at: [1, 4], order: 6,
      meters: [{ kind: 'bar', id: 'clone', label: 'clone raso' },
               { kind: 'bar', id: 'edit', label: 'edição' },
               { kind: 'bar', id: 'check', label: 'verificações' },
               { kind: 'stat', stat: 'custo', label: 'custo hoje' }],
      cap: ['Só começa com a aprovação de um owner ou admin, dentro de um limite de custo.',
            'Clone raso, até três rodadas, HTML e links verificados. Em breve.'] },
    { id: 'pr', role: 'github', title: 'PR em rascunho', short: 'github', sub: 'alpha-t/issue-{issueNo}',
      at: [1, 5], order: 7,
      meters: [{ kind: 'stat', stat: 'prs', label: 'PRs abertos' },
               { kind: 'text', text: 'nunca faz merge' }],
      cap: ['Um PR em rascunho por job, num branch próprio.',
            'Nunca no branch padrão, nunca com push forçado, nunca com merge. Em breve.'] },
    { id: 'revisao', role: 'human', title: 'Revisão humana', short: 'seu time', sub: 'aprova · revisa · faz o merge',
      at: [2, 5], order: 8,
      meters: [{ kind: 'stat', stat: 'aprovacoes', label: 'aprovações' },
               { kind: 'stat', stat: 'entregues', label: 'entregues' }],
      cap: ['Seu time aprova o job, revisa o diff e faz o merge.',
            'Quem reportou vê “Entregue” no widget.'] }
  ],
  edges: [
    { id: 'w-p', from: 'widget', to: 'painel', title: 'feedback + captura',
      cap: ['HTTPS com a chave pública do projeto, a captura junto.'] },
    { id: 'cli-p', from: 'cli', to: 'painel', float: true, title: 'at → painel',
      cap: ['Chave secreta com escopo manage; 30 requisições por minuto.'] },
    { id: 'mcp-p', from: 'mcp', to: 'painel', float: true, title: 'MCP → painel',
      cap: ['Ferramentas acima do nível máximo nem aparecem.'] },
    { id: 'p-t', from: 'painel', to: 'triagem', title: 'webhook assinado',
      cap: ['Só ids: o agente relê o feedback na fonte antes de agir.'] },
    { id: 't-i', from: 'triagem', to: 'issue', title: 'issue no GitHub',
      cap: ['Com o token do projeto; etiquetas que faltam são criadas, as que existem ficam.'] },
    { id: 'i-m', from: 'issue', to: 'impl', title: 'issue aceita',
      cap: ['O implementador lê a issue de tamanho S, aceita e aprovada.'] },
    { id: 'ok', from: 'revisao', to: 'impl', across: true, title: 'aprovação',
      cap: ['O owner confirma o limite de custo. Nada mais inicia um job.'] },
    { id: 'm-pr', from: 'impl', to: 'pr', title: 'push + PR em rascunho',
      cap: ['Branch alpha-t/issue-N; o PR fecha a issue quando alguém fizer o merge.'] },
    { id: 'pr-r', from: 'pr', to: 'revisao', title: 'revisão',
      cap: ['O PR espera o seu time, com o resultado das verificações.'] },
    { id: 'r-w', from: 'revisao', to: 'widget', route: 'side', title: 'nova versão',
      cap: ['Merge e deploy feitos por pessoas; o status volta para quem reportou.'] }
  ],
  steps: [
    { id: 'relato', label: 'Relato', focus: 'widget',
      cap: ['O relato chega com contexto: tela, console e ambiente.'] },
    { id: 'triagem', label: 'Triagem', focus: 'triagem',
      cap: ['Segurança, duplicados, tipo e tamanho.'] },
    { id: 'issue', label: 'Issue', focus: 'issue',
      cap: ['Uma issue por feedback, com etiquetas.'] },
    { id: 'impl', label: 'Implementação', focus: 'impl',
      cap: ['Um PR em rascunho, depois de uma aprovação.'] },
    { id: 'revisao', label: 'Revisão', focus: 'revisao',
      cap: ['Seu time revisa e faz o merge.'] }
  ],
  events: [
    { t: 0.4, step: 'relato', status: { widget: 'rodando' }, log: { n: 'widget', text: 'botão aberto em /checkout · tipo bug' } },
    { t: 1.7, log: { n: 'widget', text: 'região marcada 412×180 · 2 erros do console' } },
    { t: 2.6, packet: 'w-p', dur: 1.6, add: { feedbacks: 1 } },
    { t: 4.2, status: { widget: 'concluído', painel: 'rodando' }, add: { fila: 1, anexos: 1 },
      log: { n: 'painel', text: 'feedback recebido · captura guardada' } },
    { t: 5.1, packet: 'p-t', dur: 1.5, log: { n: 'painel', text: 'webhook assinado → agente de triagem' } },
    { t: 6.6, step: 'triagem', status: { painel: 'aguardando', triagem: 'rodando' }, bar: { 'triagem.seg': 100 }, dur: 1.8 },
    { t: 8.5, bar: { 'triagem.dup': 100 }, dur: 1.8, log: { n: 'triagem', text: 'segurança: veredito limpo' } },
    { t: 10.4, bar: { 'triagem.cls': 100 }, dur: 1.4, log: { n: 'triagem', text: 'duplicados: nenhum em 20 issues abertas' } },
    { t: 11.9, add: { triagens: 1, custo: 0.04 }, log: { n: 'triagem', text: 'type:bug · size:S · R$ 0,04' } },
    { t: 12.4, packet: 't-i', dur: 1.6, add: { issueNo: 1, fila: -1 } },
    { t: 14.0, step: 'issue', status: { triagem: 'concluído', issue: 'concluído' }, add: { issues: 1 },
      log: { n: 'issue', text: 'issue #{issueNo} aberta · alpha-t, type:bug, size:S' } },
    { t: 15.0, status: { cli: 'rodando' }, packet: 'cli-p', dur: 1.2, add: { cli: 1 },
      log: { n: 'cli', text: 'feedback list --status triaged · 1 item' } },
    { t: 16.3, status: { cli: 'concluído', mcp: 'rodando' }, packet: 'mcp-p', dur: 1.2, add: { mcp: 1 },
      log: { n: 'mcp', text: 'get_feedback (T0) · sem dados de quem reportou' } },
    { t: 17.8, status: { mcp: 'concluído', revisao: 'rodando' }, add: { aprovacoes: 1 },
      log: { n: 'revisao', text: 'owner aprova o job · limite R$ 2,00' } },
    { t: 18.4, packet: 'ok', dur: 1.8, step: 'impl' },
    { t: 19.4, packet: 'i-m', dur: 1.5 },
    { t: 21.0, status: { revisao: 'aguardando', impl: 'rodando' }, bar: { 'impl.clone': 100 }, dur: 1.2,
      log: { n: 'impl', text: 'clone raso do branch padrão · 3,2 MB' } },
    { t: 22.3, bar: { 'impl.edit': 100 }, dur: 3.0 },
    { t: 25.4, bar: { 'impl.check': 100 }, dur: 1.4, log: { n: 'impl', text: 'rodada 1/3 · 2 arquivos estáticos' } },
    { t: 26.9, add: { custo: 0.38 }, log: { n: 'impl', text: 'HTML válido · 0 links quebrados · R$ 0,38' } },
    { t: 27.4, packet: 'm-pr', dur: 1.5, add: { prNo: 1 } },
    { t: 28.9, status: { impl: 'concluído', pr: 'concluído' }, add: { prs: 1 },
      log: { n: 'pr', text: 'PR em rascunho #{prNo} · alpha-t/issue-{issueNo}' } },
    { t: 29.8, packet: 'pr-r', dur: 1.5, step: 'revisao' },
    { t: 31.3, status: { revisao: 'rodando' }, log: { n: 'revisao', text: 'revisa o diff e as verificações' } },
    { t: 33.4, status: { revisao: 'concluído' }, add: { prs: -1 },
      log: { n: 'revisao', text: 'merge feito por uma pessoa · deploy' } },
    { t: 34.0, packet: 'r-w', dur: 2.4 },
    { t: 36.4, pulse: 'widget', add: { entregues: 1 },
      log: { n: 'widget', text: 'status “Entregue” para quem reportou' } }
  ]
};

/*
 * "Como funciona": one card per step. caps = the caption of each object in
 * the card (data-cap="id" in como-funciona/index.html); log = the card's task
 * log, typed in order while its micro-animation plays.
 */
window.AlphaScenes.como = {
  widget: {
    caps: {
      fab: { title: 'Botão de feedback', lines: ['Um botão no seu app web: tipo (bug, melhoria, sugestão), título e descrição.', 'Tag script ou import ESM, com a chave pública at_pub_.'] },
      captura: { title: 'Captura', lines: ['Marque elementos, recorte uma região ou capture a página inteira.', 'Anexos PNG, JPEG, WebP, GIF ou PDF, até 5 MB.'] },
      console: { title: 'Console', lines: ['Erros do console, erros não tratados e promessas rejeitadas vão junto do relato.'] },
      ambiente: { title: 'Ambiente', lines: ['Página, elemento marcado e posição, navegador, tamanho da janela e horário.'] },
      fila: { title: 'Sem conexão', lines: ['O relato espera numa fila no navegador e sai quando a conexão volta, sem duplicar.'] }
    },
    log: ['abrir o widget', 'marcar a região', 'anexar o console', 'enviar com contexto']
  },
  painel: {
    caps: {
      org: { title: 'Empresas e projetos', lines: ['Cada empresa tem seus projetos; cada projeto, membros com papéis owner, admin, editor e viewer.'] },
      lista: { title: 'Feedback', lines: ['Filtros por status, tipo e prioridade; mudança de status com histórico e notas internas.'] },
      anexos: { title: 'Anexos', lines: ['Guardados em armazenamento privado, abertos no painel e na issue por links assinados.'] },
      chaves: { title: 'Chaves de API', lines: ['Pública para o widget, secreta para servidor e terminal.', 'Aparecem uma vez e podem ser revogadas na hora.'] },
      tracker: { title: 'Meus feedbacks', lines: ['Quem reportou acompanha: Enviado, Em análise, Em andamento, Resolvido, Entregue.', 'Sem login: o vínculo fica no navegador.'] }
    },
    log: ['receber o feedback', 'guardar a captura', 'mover para triado', 'avisar quem reportou']
  },
  triagem: {
    caps: {
      seguranca: { title: 'Triagem de segurança', lines: ['O texto de quem testa é dado, nunca instrução.', 'Sem veredito limpo, não há issue.'] },
      duplicados: { title: 'Duplicados', lines: ['Compara com feedbacks e issues abertas do projeto, até em outro idioma.', 'Um repetido vira +1 na issue original.'] },
      etiquetas: { title: 'Tipo e tamanho', lines: ['Etiquetas alpha-t, type:… e size:…', 'Cria as que faltam, nunca altera as que já existem.'] },
      orcamento: { title: 'Orçamento por projeto', lines: ['Um teto diário para tudo o que o agente gasta no projeto, com chave própria cifrada.', 'No teto, o feedback espera o dia seguinte; os outros projetos seguem.'] },
      privacidade: { title: 'Sem dados pessoais', lines: ['O agente nunca lê o nome nem o e-mail de quem reportou.'] }
    },
    log: ['triagem de segurança', 'procurar duplicados', 'classificar e estimar', 'abrir a issue']
  },
  github: {
    caps: {
      token: { title: 'Um token por projeto', lines: ['Fine-grained, restrito a um repositório: Metadata e Issues.', 'Contents e Pull requests só para o implementador; Workflows nunca.'] },
      cifrado: { title: 'Guardado cifrado', lines: ['Cifrado ao salvar e nunca devolvido ao navegador: o painel mostra só os quatro últimos caracteres.'] },
      criar: { title: 'Criar issue', lines: ['À mão em cada feedback, ou automática quando o feedback é aceito.', 'Uma issue por feedback.'] },
      corpo: { title: 'Corpo da issue', lines: ['Tipo, prioridade, página, descrição, anexos e ambiente, com as etiquetas do projeto.', 'Num repositório público, a issue também é pública.'] },
      autor: { title: 'Autor', lines: ['Issues e PRs saem em nome da conta que criou o token; uma conta dedicada à automação evita nomes pessoais.'] }
    },
    log: ['ler o token cifrado', 'montar o corpo', 'aplicar etiquetas', 'issue #42 aberta']
  },
  implementador: {
    caps: {
      aprovacao: { title: 'Aprovação no painel', lines: ['Só um owner ou admin inicia, num feedback aceito que já tem issue.', 'Nem etiqueta nem agendamento disparam um job.'] },
      clone: { title: 'Clone raso', lines: ['Só o branch padrão, numa pasta temporária apagada no fim; acima de 50 MB, não clona.', 'Nada do repositório é executado.'] },
      diff: { title: 'O que pode mudar', lines: ['Na primeira versão, conteúdo estático: HTML, CSS, textos e imagens, em issues de tamanho S.', 'Nunca código, build, CI ou scripts novos.'] },
      verificacoes: { title: 'Verificações', lines: ['HTML válido nos arquivos alterados e nenhum link interno quebrado; até três rodadas.'] },
      custo: { title: 'Limite de custo', lines: ['Para no limite do job ou no orçamento do dia, o que vier primeiro; prazo de 15 minutos.', 'Chave do próprio projeto: sem chave, sem execução.'] }
    },
    log: ['aprovar o job', 'clone raso', 'editar arquivos estáticos', 'verificar HTML e links']
  },
  revisao: {
    caps: {
      pr: { title: 'PR em rascunho', lines: ['Um por job, num branch próprio; nunca no branch padrão, nunca com push forçado.'] },
      merge: { title: 'Merge', lines: ['Sempre do seu time: o Alpha Tester nunca faz merge.'] },
      falha: { title: 'Se falhar', lines: ['Nenhum PR; um comentário na issue com o motivo, e os detalhes só no painel.'] },
      entregue: { title: 'Entregue', lines: ['Quem reportou vê o status mudar no widget.'] }
    },
    log: ['push do branch', 'abrir PR em rascunho', 'revisão do seu time', 'status: Entregue']
  },
  terminal: {
    caps: {
      cli: { title: 'at', lines: ['feedback list, show, set e issue.', 'Nunca imprime a chave, só fala HTTPS e não segue redirecionamentos.'] },
      chave: { title: 'Chave secreta do projeto', lines: ['at_sec_…, criada no painel por um admin, mostrada uma vez, revogável na hora.', 'Nunca numa página web ou num repositório.'] },
      escopos: { title: 'Escopos', lines: ['ingest só envia feedback.', 'manage age como editor do projeto e nunca gerencia chaves, membros ou o GitHub.'] },
      niveis: { title: 'Níveis do MCP', lines: ['T0 lê, T1 anota, T2 propõe mudanças de status e abre a issue.', 'Acima do nível máximo, a ferramenta nem aparece.'] },
      auditoria: { title: 'Auditoria', lines: ['Cada escrita fica num registro local.', 'Nenhuma ferramenta devolve quem reportou; o texto de quem testa chega marcado como dado.'] }
    },
    log: ['configurar a chave', 'listar feedback novo', 'chamar ferramentas MCP', 'registrar a escrita']
  },
  seguranca: {
    caps: {
      fora: { title: 'Fora do Alpha Tester', lines: ['A chave pública só envia feedback; a secreta fica em servidores e terminais.'] },
      cofre: { title: 'Chaves cifradas', lines: ['Tokens do GitHub e chaves de modelo cifrados (AES-256-GCM) e nunca devolvidos.', 'Chaves de API guardadas só como hash.'] },
      empresas: { title: 'Dados por empresa', lines: ['Cada consulta é filtrada pelo projeto da chave ou pelo papel no painel.', 'Nada é compartilhado entre clientes.'] },
      identidade: { title: 'Quem reporta', lines: ['Agentes e servidor MCP nunca leem nem devolvem nome ou e-mail.'] },
      limites: { title: 'Limites', lines: ['Taxa de requisições por chave e verificação em duas etapas no painel.'] },
      repo: { title: 'GitHub', lines: ['Alcançado só com o token daquele projeto, limitado a um repositório; mudanças em workflows ficam com pessoas.'] }
    },
    log: ['validar a chave', 'cifrar o token', 'filtrar por empresa', 'ocultar identidade']
  }
};
