import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Ajustes, Estado, Registro } from '../types'
import { NOME_INTENSIDADE, NOME_NA_FAIXA, NOME_VOLUME, PADRAO, lerAjustes } from './ajustes'
import type { AjusteLigado } from './ajustes'
import { abrirNoApp, comOApp, ehSpareDoApp, idEmFoco, lerArquivosDoApp } from './app'
import type { LeituraDoApp, NoApp } from './app'
import { contarNoLog, lerLogDePermissoes, modoPede, pedidosNoLog } from './comum/permissao'
import { desenharCartoes } from './cartoes'
import { ALTURA_CENA, cenaSvg, descricaoDaCena, situacaoDaCena } from './cena'
import { SEM_TITULO, casaDe, detalheDe, lerRegistro, ordenar, pastaDoRegistro, tituloDe, visualDe } from './estado'
import { desenharFaixa } from './faixa'
import { tocar } from './sons'
import { desenharPainelNoTerminal } from './terminal'

const PAINEL = 'farol'
// O nome do mod, como o Claude Code o dá a cada linha da faixa.
const PLUGIN = 'farol'
const sessoes = atom({ plugin: 'farol', key: 'sessoes' } as const, [])
const agora = atom({ plugin: 'farol', key: 'agora' } as const, 0)
const minhaId = atom({ plugin: 'farol', key: 'minhaId' } as const, '')
const ajustes = atom({ plugin: 'farol', key: 'ajustes' } as const, null)
const ajustesAbertos = atom({ plugin: 'farol', key: 'ajustesAbertos' } as const, false)
// A fase do relógio do painel do app (aceso ou apagado).
const aceso = atom({ plugin: 'farol', key: 'aceso' } as const, true)

// A pergunta ao usuário que para a sessão até a resposta.
const PERGUNTA = 'AskUserQuestion'
// A caixa de fim de turno do app, abaixo da resposta; com `blocked`, a sessão parou porque depende de você, e fica
// esperando até o próximo prompt; com uma pergunta (`ask`) e sem `blocked`, fica em Pergunta, um sinal mais fraco e
// sem som, até o próximo prompt.
const FIM_DE_TURNO = 'mcp__ccd_turn__wrap_up'
let paradaPorVoce = false
let perguntouNoFim = false

// O registro desta sessão; cada mudança é gravada em <casa>/.claude/farol/<id>.json. Sem a pasta da casa
// (nem HOME nem USERPROFILE), `pastaDoFarol` fica vazia e o farol não grava nem lê nada.
let eu: Registro | null = null
let casa = ''
let pastaDoFarol = ''
// Perguntas abertas agora, da sessão e dos subagentes: a sessão volta a trabalhando só depois da última.
let perguntas = 0

// O que o app desktop no macOS sabe de cada sessão (pelo id no Claude Code), relido com as outras sessões. Esta
// sessão está no app quando o app tem um arquivo dela. A leitura não para: uma sessão que o app pré-abriu (numa
// pasta que muda de versão para versão) só ganha o arquivo quando você a usa, minutos depois; e o terminal, no
// macOS, também mostra as sessões do app pelo nome da barra lateral. Fora do macOS a pasta não existe, e a leitura
// vem vazia; dentro, o cache pela hora da mudança só abre os arquivos que mudaram.
const leituraDoApp: LeituraDoApp = new Map()
let sessoesNoApp = new Map<string, NoApp>()

// Uma spare do app (pré-aberta, à espera de você abrir uma sessão nova) só grava o registro quando o app a usa.
let spareSemDono = false

const lerApp = async ($: EngineInterface) => {
  if (!casa || !eu) return
  sessoesNoApp = await lerArquivosDoApp($, casa, leituraDoApp).catch(() => new Map<string, NoApp>())
  const meu = sessoesNoApp.get(eu.id)
  if (meu) {
    spareSemDono = false
    // A pasta que o app diz: a de uma spare é a da pré-abertura, não a sua.
    if (meu.cwd) eu = { ...eu, pasta: pastaDoRegistro(meu.cwd) }
  }
}
const euNoApp = (): NoApp | undefined => (eu ? sessoesNoApp.get(eu.id) : undefined)

const gravar = async ($: EngineInterface) => {
  if (!eu || !pastaDoFarol) return
  if (spareSemDono) await lerApp($)
  if (spareSemDono) return
  eu = { ...eu, vivoEm: await $.clock.now() }
  await $.fs.write(`${pastaDoFarol}/${eu.id}.json`, JSON.stringify(eu))
}

// Relê o registro de todas as sessões (esta inclusive) e o que o app sabe delas: o nome na barra lateral (também no
// terminal, no macOS), o não visto (o painel do terminal o ignora) e o id para a troca.
const atualizar = async ($: EngineInterface) => {
  if (!pastaDoFarol) return
  const lista: Registro[] = []
  for (const f of await $.fs.list(pastaDoFarol).catch(() => [])) {
    if (f.kind !== 'file' || !f.name.endsWith('.json')) continue
    const r = lerRegistro(await $.fs.read(`${pastaDoFarol}/${f.name}`).catch(() => ''))
    if (r) lista.push(r)
  }
  await lerApp($)
  const vistas = comOApp(lista, sessoesNoApp)
  const t = await $.clock.now()
  await update($, sessoes, () => vistas)
  await update($, agora, () => t)
  await ajustarPisca($)
}

// O lembrete da Alta: enquanto esta sessão espera você, o som do esperando se repete a cada 2 min, no máximo 3 vezes.
// O relógio só nasce na virada para esperando com a intensidade alta e para no primeiro toque em que ela já não é
// alta (trocada no painel de qualquer sessão); a Pergunta não tem som.
const LEMBRETE_MS = 2 * 60_000
const LEMBRETES = 3
let lembrete: { cancel: () => void } | null = null
const pararLembrete = () => {
  lembrete?.cancel()
  lembrete = null
}
const comecarLembrete = async ($: EngineInterface) => {
  pararLembrete()
  if (lerAjustes(await $.store.get('ajustes')).intensidade !== 'alta') return
  let vezes = 0
  lembrete = $.clock.every(LEMBRETE_MS, () => {
    void (async () => {
      if (eu?.estado !== 'esperando') return pararLembrete()
      if (lerAjustes(await $.store.get('ajustes')).intensidade !== 'alta') return pararLembrete()
      vezes += 1
      if (vezes >= LEMBRETES) pararLembrete()
      await tocar($, 'esperando')
    })().catch(() => undefined)
  })
}

// Nunca lança: o farol não pode atrapalhar prompt, ferramenta nem resposta.
const mudar = async ($: EngineInterface, estado: Estado) => {
  if (!eu || eu.estado === estado) return
  try {
    eu = { ...eu, estado, desde: await $.clock.now() }
    // A virada para esperando toca o som, também na sessão que está na sua tela; só esta sessão toca a dela.
    if (estado === 'esperando') {
      await tocar($, 'esperando')
      await comecarLembrete($)
    } else pararLembrete()
    await gravar($)
    await atualizar($)
  } catch {
    // segue sem atualizar o painel
  }
}

// Os pedidos de permissão no app, da sessão e dos subagentes, pelo `tool_use_id` e com o subagente que pediu:
// abertos desde o "perguntar" da checagem até a chamada terminar. Os que já estão na sua tela: pelo modo (Manual
// e plano mostram na hora) ou pelo main.log, que registra cada pedido que o app mostra (no Auto, só os que o
// classificador manda para você) e cada resposta sua. A sessão espera você enquanto houver pergunta ou pedido na
// tela; depois, volta ao que era (trabalhando ou, com um subagente pedindo depois do fim da resposta, livre).
const pedidos = new Map<string, string | undefined>()
const pedidosNaTela = new Set<string>()
// Quantos pedidos o modo pôs na tela desde que a vigia começou: o log só os dá por respondidos quando já
// registrou ao menos esse tanto (senão, a resposta de um pedido anterior apagaria um que ainda nem apareceu).
let postosPeloModo = 0
let logComPedidoAberto = false
// Os pedidos que já estavam no log quando a vigia começou (não contam); null enquanto o log é lido.
let conhecidosNoLog: Set<string> | null = null
let vigia: { cancel: () => void } | null = null
let voltarPara: Estado = 'trabalhando'

const pararVigia = () => {
  vigia?.cancel()
  vigia = null
  logComPedidoAberto = false
  conhecidosNoLog = null
}

const esperaVoce = () => perguntas > 0 || pedidosNaTela.size > 0 || logComPedidoAberto || paradaPorVoce

// Esperando ou não, depois de uma pergunta ou de um pedido de permissão.
const reavaliar = async ($: EngineInterface) => {
  if (!eu) return
  if (esperaVoce()) {
    if (eu.estado !== 'esperando') voltarPara = eu.estado
    await mudar($, 'esperando')
  } else if (eu.estado === 'esperando') await mudar($, voltarPara)
}

// O prompt ou o turno da sessão começando: trabalhando, salvo se ainda há pergunta ou pedido na tela.
const comecar = async ($: EngineInterface) => {
  voltarPara = 'trabalhando'
  paradaPorVoce = false
  perguntouNoFim = false
  if (esperaVoce()) await reavaliar($)
  else await mudar($, 'trabalhando')
}

// A vigia do log, a cada segundo enquanto houver pedido aberto: um pedido desta sessão sem resposta acende o
// vermelho; respondidos todos, os que o modo pôs na tela também foram.
const conferirLog = async ($: EngineInterface) => {
  const appId = euNoApp()?.appId
  if (!appId || pedidos.size === 0) return pararVigia()
  if (!conhecidosNoLog) return
  const { emitidos, abertos } = contarNoLog(await lerLogDePermissoes($, casa), appId, conhecidosNoLog)
  logComPedidoAberto = abertos > 0
  if (abertos === 0 && emitidos >= postosPeloModo) pedidosNaTela.clear()
  await reavaliar($)
}

// A transcrição desta sessão, onde o Claude Code grava o modo de cada prompt (`"permissionMode":"default"`):
// <casa>/.claude/projects/<a pasta da sessão, com cada caractere que não é letra nem número trocado por "-">/<id>.jsonl.
// É o modo que o terminal tem: a API não o dá, e o terminal não tem o arquivo do app. Uma troca de modo no meio da
// resposta (Shift+Tab) só aparece no próximo prompt. O caminho montado é o primeiro palpite; o Claude Code pode
// abreviar o nome de uma pasta muito longa, e então a transcrição se procura pelo id nas pastas de projects (uma vez).
let transcricao = ''
let transcricaoAchada = false
const transcricaoDe = (casa: string, cwd: string, id: string) => `${casa}/.claude/projects/${cwd.replace(/[^A-Za-z0-9]/g, '-')}/${id}.jsonl`

const temArquivo = async ($: EngineInterface, caminho: string) => {
  const i = caminho.lastIndexOf('/')
  const nome = caminho.slice(i + 1)
  return (await $.fs.list(caminho.slice(0, i)).catch(() => [])).some(f => f.kind === 'file' && f.name === nome)
}

const acharTranscricao = async ($: EngineInterface): Promise<string> => {
  if (transcricaoAchada || !transcricao || (await temArquivo($, transcricao))) {
    transcricaoAchada = transcricaoAchada || transcricao !== ''
    return transcricao
  }
  const projetos = transcricao.slice(0, transcricao.lastIndexOf('/', transcricao.lastIndexOf('/') - 1))
  const nome = transcricao.slice(transcricao.lastIndexOf('/') + 1)
  for (const p of await $.fs.list(projetos).catch(() => [])) {
    if (p.kind === 'dir' && (await temArquivo($, `${projetos}/${p.name}/${nome}`))) {
      transcricao = `${projetos}/${p.name}/${nome}`
      transcricaoAchada = true
      break
    }
  }
  return transcricao
}

// O último modo gravado na transcrição; sem a transcrição ou sem o `grep`, nenhum (e o pedido não acende).
const modoDaTranscricao = async ($: EngineInterface): Promise<string | undefined> => {
  const caminho = await acharTranscricao($)
  if (!caminho) return undefined
  const r = await $.process.run(['grep', '-o', '"permissionMode":"[A-Za-z]*"', caminho]).catch(() => ({ stdout: '' }))
  const ultimo = r.stdout.trim().split('\n').at(-1) ?? ''
  return /"permissionMode":"([A-Za-z]+)"/.exec(ultimo)?.[1]
}

// No terminal, o pedido está na tela quando o modo pede (Manual e plano; no Auto quem decide é o classificador) e
// fica até a chamada terminar.
const pedidoNoTerminal = async ($: EngineInterface, tool: string, id: string, agentId: string | undefined) => {
  if (tool === PERGUNTA || !modoPede(await modoDaTranscricao($), tool)) return
  pedidos.set(id, agentId)
  pedidosNaTela.add(id)
  await reavaliar($)
}

const pedidoAberto = async ($: EngineInterface, tool: string, id: string, agentId: string | undefined) => {
  await lerApp($)
  const meu = euNoApp()
  if (!meu) return pedidoNoTerminal($, tool, id, agentId)
  // O pedido entra antes de ler o log: a chamada de outro laço que termina nesse meio-tempo não para a vigia.
  pedidos.set(id, agentId)
  if (meu.appId && !vigia) {
    // A vigia nasce antes de ler o log: um segundo pedido ao mesmo tempo já a encontra e não cria outra.
    vigia = $.clock.every(1_000, () => void conferirLog($).catch(() => undefined))
    postosPeloModo = 0
    conhecidosNoLog = pedidosNoLog(await lerLogDePermissoes($, casa))
  }
  // A pergunta tem o contador dela (`perguntas`).
  if (tool !== PERGUNTA && modoPede(meu.modo, tool)) {
    pedidosNaTela.add(id)
    postosPeloModo += 1
  }
  await reavaliar($)
}

// Fecha os pedidos dados (os de uma chamada que terminou, ou os de um laço que acabou).
const fecharPedidos = (ids: Iterable<string>): boolean => {
  let fechou = false
  for (const id of ids) {
    fechou = pedidos.delete(id) || fechou
    pedidosNaTela.delete(id)
  }
  if (pedidos.size === 0) pararVigia()
  return fechou
}

// Os pedidos do laço que acabou: o principal (`agentId` vazio) ou o de um subagente.
const pedidosDoLaco = (agentId: string | undefined): string[] =>
  [...pedidos].filter(([, quem]) => quem === agentId).map(([id]) => id)

// Sessão retomada: o título vem da primeira mensagem sua que já está na conversa.
const tituloDaConversa = async ($: EngineInterface): Promise<string> => {
  const mensagens = await $.session.messages().catch(() => [])
  for (const m of Array.isArray(mensagens) ? mensagens : []) {
    if (m.role !== 'user') continue
    const t = tituloDe(m.text)
    if (t) return t
  }
  return SEM_TITULO
}

// A releitura das outras sessões só roda enquanto alguém vê o resultado: o farol na faixa ou o painel aberto.
// O batimento (gravar) roda sempre, para esta sessão seguir viva no painel das outras.
let painelAberto = false
// O painel fechado por você (o Fechar ou o x): o último desenho dele não o reabre.
let fechadoDeProposito = false
let releitura: { cancel: () => void } | null = null

const ajustarReleitura = async ($: EngineInterface) => {
  const a = (await read($, ajustes)) ?? PADRAO
  const precisa = pastaDoFarol !== '' && (a.naFaixa === 'mostrar' || painelAberto)
  if (precisa && !releitura) releitura = $.clock.every(5_000, () => void atualizar($).catch(() => undefined))
  if (!precisa && releitura) {
    releitura.cancel()
    releitura = null
  }
  await ajustarPisca($)
}

// O relógio do painel: com o painel do app aberto, o movimento ligado e ao menos um cartão com aviso (esperando
// ou não visto), nas duas intensidades, o painel vira de fase a cada 0,6 s; a borda do esperando e os barcos que piscam a
// seguem, todos juntos. Fora disso, ele para, aceso. No terminal não há animação (regra do repo).
let relogioDoPainel: { cancel: () => void } | null = null
let noTerminal = false
const ajustarPisca = async ($: EngineInterface) => {
  const a = (await read($, ajustes)) ?? PADRAO
  const t = await read($, agora)
  const comAviso = (await read($, sessoes)).some(r => ['esperando', 'nao-visto'].includes(visualDe(r, t)))
  const precisa = painelAberto && !noTerminal && a.movimento && comAviso
  if (precisa && !relogioDoPainel) relogioDoPainel = $.clock.every(600, () => void update($, aceso, x => !x).catch(() => undefined))
  if (!precisa && relogioDoPainel) {
    relogioDoPainel.cancel()
    relogioDoPainel = null
    await update($, aceso, () => true)
  }
}

const abrir = async ($: EngineInterface) => {
  painelAberto = true
  fechadoDeProposito = false
  await atualizar($).catch(() => undefined)
  await ajustarReleitura($)
  await $.ui.open({ id: PAINEL, title: 'Farol' })
}

const fechar = async ($: EngineInterface) => {
  painelAberto = false
  fechadoDeProposito = true
  await update($, ajustesAbertos, () => false)
  await ajustarReleitura($)
  await $.ui.close({ id: PAINEL })
}

// O tema do Claude Code no terminal é um dos claros (`light`, `light-daltonized`…), pela linha `theme` do /config;
// sem ela, o escuro.
const temaClaro = async ($: EngineInterface): Promise<boolean> => {
  const linha = (await $.config.list().catch(() => [])).find(r => r.key === 'theme')
  return typeof linha?.value === 'string' && linha.value.startsWith('light')
}

// O clique num cartão do painel no app: leva o app para aquela sessão. Só com o id dela no app (no macOS); o
// cartão desta sessão e o de uma sessão do terminal não fazem nada.
const trocarDeSessao = async ($: EngineInterface, r: Registro) => {
  if (!r.appId || r.id === eu?.id) return
  if (!(await abrirNoApp($, r.appId))) $.ui.toast('Não consegui abrir essa sessão no app.')
}

// As opções de um ajuste que nasce ligado (o movimento e os sons).
const LIGADO = { sim: 'ligado (padrão)', nao: 'desligado' }

const mudarAjustes = async ($: EngineInterface, muda: (a: Ajustes) => Ajustes) => {
  const novo = muda((await read($, ajustes)) ?? PADRAO)
  await update($, ajustes, () => novo)
  await $.store.set('ajustes', novo)
  await ajustarReleitura($)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const guardados = lerAjustes(await $.store.get('ajustes').catch(() => undefined))
    await update($, ajustes, () => guardados)
    await $.command
      .register({ name: PAINEL, description: 'Abre o painel com o estado de todas as sessões abertas' })
      .catch(() => undefined)

    casa = casaDe(await $.env.get('HOME'), await $.env.get('USERPROFILE')) ?? ''
    if (!casa) return result
    try {
      pastaDoFarol = `${casa}/.claude/farol`
      const id = await $.session.id()
      const t = await $.clock.now()
      spareSemDono = ehSpareDoApp(e.cwd)
      noTerminal = e.surface === 'terminal'
      transcricao = transcricaoDe(casa, e.cwd, id)
      eu = { id, pasta: pastaDoRegistro(e.cwd), titulo: await tituloDaConversa($), estado: 'livre', desde: t, vivoEm: t }
      // Sessão reaberta: a hora da última resposta continua, para o não visto sobreviver a um reinício do app.
      const anterior = lerRegistro(await $.fs.read(`${pastaDoFarol}/${id}.json`).catch(() => ''))
      if (anterior?.respondeuEm !== undefined) eu = { ...eu, respondeuEm: anterior.respondeuEm }
      await update($, minhaId, () => id)
      await gravar($)
      await atualizar($)
      // O batimento mantém esta sessão viva para as outras; a releitura traz o estado delas.
      $.clock.every(30_000, () => void gravar($).catch(() => undefined))
      await ajustarReleitura($)
    } catch {
      // sem registro nesta sessão; o painel continua abrindo
    }
    return result
  })

  on('prompt.submit', async ($, e, next) => {
    const t = tituloDe(e.text)
    if (eu && eu.titulo === SEM_TITULO && t) eu = { ...eu, titulo: t }
    await comecar($)
    return next(e)
  }).catch(($, e, next) => next(e))

  // O começo e o fim de um turno de subagente não mudam o estado da sessão: só os do laço principal.
  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) await comecar($)
    return next(e)
  }).catch(($, e, next) => next(e))

  // Uma pergunta da sessão ou de um subagente deixa a sessão esperando você até a resposta. O fim de qualquer
  // chamada fecha o pedido de permissão dela, se houve (respondido ou recusado).
  on('tool.call', async ($, e, next) => {
    // A caixa é do app, e os tipos da API não a listam: o nome e o `blocked` se leem soltos.
    const caixa = e as { tool: string; blocked?: unknown; ask?: unknown }
    if (caixa.tool === FIM_DE_TURNO && e.agentId === undefined) {
      if (caixa.blocked === true) paradaPorVoce = true
      else if (typeof caixa.ask === 'string' && caixa.ask.trim()) perguntouNoFim = true
    }
    const pergunta = e.tool === PERGUNTA
    if (pergunta) {
      perguntas += 1
      await reavaliar($)
    }
    try {
      return await next(e)
    } finally {
      if (pergunta) perguntas = Math.max(0, perguntas - 1)
      if (fecharPedidos([e.tool_use_id]) || pergunta) await reavaliar($)
    }
  }).catch(($, e, next) => next(e))

  // Um "perguntar" da checagem, da sessão ou de um subagente, pode virar um pedido na sua tela: no app, pelo modo do
  // arquivo dele e pelo main.log; no terminal, pelo modo gravado na transcrição.
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)
    if (verdict.decision === 'ask' && e.tool_use_id && eu) {
      await pedidoAberto($, e.tool, e.tool_use_id, e.agentId).catch(() => undefined)
    }
    return verdict
  }).catch(($, e, next) => next(e))

  // O fim do laço principal fecha os pedidos dele e deixa a sessão livre (ou esperando, se um subagente que segue
  // rodando ainda pede você); o de um subagente fecha só os dele. A resposta que termina fora da tela do app fica
  // para o não visto; na tela, você já viu.
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId !== undefined) {
      if (fecharPedidos(pedidosDoLaco(e.agentId))) await reavaliar($)
      return result
    }
    perguntas = 0
    fecharPedidos(pedidosDoLaco(undefined))
    if (eu) {
      await lerApp($)
      if (euNoApp()) {
        const { respondeuEm: _, ...resto } = eu
        const naTela = idEmFoco(sessoesNoApp) === eu.id
        eu = naTela ? resto : { ...resto, respondeuEm: await $.clock.now() }
        // A resposta que termina esperando você toca só o esperando (logo abaixo): os dois juntos se confundem.
        if (!naTela && !esperaVoce()) await tocar($, 'nao-visto')
      }
    }
    voltarPara = 'livre'
    await mudar($, esperaVoce() ? 'esperando' : perguntouNoFim ? 'pergunta' : 'livre')
    return result
  })

  // A API não apaga arquivo: vai pelo rm onde houver (macOS e Linux). Se falhar (Windows), o registro fica
  // e é esquecido depois de 12 h.
  on('session.end', async ($, e, next) => {
    if (eu && pastaDoFarol) await $.process.run(['rm', '-f', `${pastaDoFarol}/${eu.id}.json`]).catch(() => undefined)
    return next(e)
  })

  on('command.run', { command: PAINEL }, async $ => {
    await abrir($)
    return { text: 'Farol aberto.' }
  })

  // O painel pode fechar pelo próprio app (o X dele): a releitura para se o farol não está na faixa.
  on('ui.close', async ($, e, next) => {
    const r = await next(e)
    if (e.id === PAINEL && painelAberto) {
      painelAberto = false
      fechadoDeProposito = true
      await update($, ajustesAbertos, () => false)
      await ajustarReleitura($)
    }
    return r
  })

  // A faixa é dividida com outros mods: cada um desenha o seu e inclui o que os outros desenharam (next).
  // Com o ajuste "na faixa: esconder", o farol só abre pelo /farol.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const outros = await next(e)
    const a = (await read($, ajustes)) ?? PADRAO
    if (a.naFaixa === 'esconder') return outros
    const dados = { lista: await read($, sessoes), agora: await read($, agora), ajustes: a, abrir: () => abrir($) }
    return desenharFaixa($, e, outros, dados)
  })

  // A partir do Claude Code 2.1.323, cada mod desenha a própria linha da faixa e o Claude Code as empilha; o farol
  // ficaria numa linha só dele, acima dos outros. Aqui ele tira a linha dele do que o Claude Code empilha e desenha
  // o farol à esquerda do resultado, na mesma linha (sem copiar as linhas dos outros). Até a 2.1.322 este evento
  // não existe, e vale o `outros` do AbovePrompt.
  on('ui.render', { component: 'AbovePromptList' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const outras = e.props.rows.filter(r => r.plugin !== PLUGIN)
    if (outras.length === e.props.rows.length || outras.length === 0) return next(e)
    const a = (await read($, ajustes)) ?? PADRAO
    if (a.naFaixa === 'esconder') return next(e)
    const resto = await next({ ...e, props: { ...e.props, rows: outras } })
    const dados = { lista: await read($, sessoes), agora: await read($, agora), ajustes: a, abrir: () => abrir($) }
    return desenharFaixa($, e, resto, dados)
  })

  // O painel: no app, a cena do farol no topo e um cartão com barco por sessão; no terminal, um cartão de duas
  // linhas com fundo por sessão. Onde não há nenhum dos dois, uma linha de título e uma de "pasta · tempo · estado"
  // por sessão. Abaixo, os ajustes e o Fechar.
  on('ui.render', { component: 'Pane', requestId: PAINEL }, async ($, e) => {
    // O painel que se desenha está aberto, também o que já estava na tela quando o farol recarregou (o "aberto" fica
    // na memória do farol e se perde no recarregamento; sem ele, a releitura e o relógio do painel não ligam).
    if (!painelAberto && !fechadoDeProposito) {
      painelAberto = true
      await ajustarReleitura($)
    }
    const elementos = $.ui.resolve(e)
    const { Box, Text, Button } = elementos
    const t = await read($, agora)
    const minha = await read($, minhaId)
    const terminal = e.surface === 'terminal'
    // No terminal não há não visto nesta versão: a sessão que estaria azul aparece livre.
    const todas = await read($, sessoes)
    const lista = ordenar(terminal ? todas.map(r => ({ ...r, naoVisto: false })) : todas, t)
    const a = (await read($, ajustes)) ?? PADRAO

    const sessao = (r: Registro) => {
      const v = visualDe(r, t)
      return (
        <Box flexDirection="column">
          <Text bold dimColor={v === 'sem-sinal'} wrap="truncate-end">{r.titulo}</Text>
          <Text dimColor={v !== 'esperando'} color={v === 'esperando' ? 'error' : undefined} wrap="truncate-end">
            {detalheDe(r, t, minha)}
          </Text>
        </Box>
      )
    }

    // No app, a cena e os cartões são desenhos (`Svg`); onde não há `Svg`, fica a lista em texto.
    let desenhos: JSX.Element | null = null
    if ('Svg' in elementos && !terminal) {
      const { Svg } = elementos
      const situacao = situacaoDaCena(lista, t)
      // A largura do painel em pixels não vem na API: estimada pelas colunas (a cena se ajusta ao que vier).
      const largura = e.props.bodyColumns * 8
      desenhos = (
        <Box flexDirection="column" gap={1}>
          <Svg key="cena" source={cenaSvg(situacao, a.movimento, largura, a.intensidade === 'alta')} alt={descricaoDaCena(situacao)} height={ALTURA_CENA} isInteractive={a.movimento || undefined} />
          {lista.length > 0 && desenharCartoes($, e, { lista, agora: t, minha, movimento: a.movimento, aceso: relogioDoPainel ? await read($, aceso) : undefined, trocar: r => trocarDeSessao($, r) })}
        </Box>
      )
    }

    const semRegistro = !pastaDoFarol
    let blocoAjustes = null
    const abertos = await read($, ajustesAbertos)
    if (abertos && 'Select' in elementos) {
      const { Select } = elementos
      const opcoes = (nomes: Record<string, string>) => Object.entries(nomes).map(([value, label]) => ({ value, label }))
      const linha = (titulo: string, explica: string, campo: JSX.Element) => (
        <Box flexDirection="row" justifyContent="space-between" alignItems="center" gap={2} borderStyle="round" borderColor="subtle" paddingX={1}>
          <Box flexDirection="column" flexGrow={1} flexShrink={1}>
            <Text bold>{titulo}</Text>
            <Text dimColor>{explica}</Text>
          </Box>
          <Box flexShrink={0}>{campo}</Box>
        </Box>
      )
      // A escolha de um ajuste que liga e desliga: "ligado" e "desligado", com o padrão marcado em `nomes`.
      const seletorLigado = (key: string, campo: AjusteLigado, nomes: Record<'sim' | 'nao', string> = LIGADO) => (
        <Select
          key={key}
          options={opcoes(nomes)}
          value={a[campo] ? 'sim' : 'nao'}
          onSelect={(v: string) => void mudarAjustes($, x => ({ ...x, [campo]: v === 'sim' }))}
        />
      )
      // Uma linha do cartão "Som": o som à esquerda e a escolha à direita.
      const linhaDoSom = (rotulo: string, campo: JSX.Element) => (
        <Box flexDirection="row" justifyContent="space-between" alignItems="center" gap={2}>
          <Text>{rotulo}</Text>
          <Box flexShrink={0}>{campo}</Box>
        </Box>
      )
      blocoAjustes = (
        <Box flexDirection="column" gap={1}>
          <Text dimColor bold>Ajustes</Text>
          {linha(
            'Na faixa',
            'O farol acima do prompt. Escondido, ele abre pelo /farol.',
            <Select
              key="ajuste-na-faixa"
              options={opcoes(NOME_NA_FAIXA)}
              value={a.naFaixa}
              onSelect={(v: string) => void mudarAjustes($, x => ({ ...x, naFaixa: lerAjustes({ naFaixa: v }).naFaixa }))}
            />,
          )}
          {!terminal &&
            linha(
              'Contagem na faixa',
              'O número de sessões esperando ao lado da torre.',
              seletorLigado('ajuste-contagem', 'contagem', { nao: 'desligada (padrão)', sim: 'ligada' }),
            )}
          {!terminal &&
            linha(
              'Movimento',
              'O painel se mexendo (a cena, os barcos e a borda do esperando). Desligado, tudo fica parado.',
              seletorLigado('ajuste-movimento', 'movimento'),
            )}
          {linha(
            'Intensidade de avisos',
            terminal
              ? 'Na alta, o som do esperando se repete enquanto a sessão espera você.'
              : 'Na alta, o esperando chama mais: o feixe gira mais rápido, sobem mais sinalizadores, a torre mostra a contagem e o som se repete.',
            <Select
              key="ajuste-intensidade"
              options={opcoes(NOME_INTENSIDADE)}
              value={a.intensidade}
              onSelect={(v: string) => void mudarAjustes($, x => ({ ...x, intensidade: lerAjustes({ intensidade: v }).intensidade }))}
            />,
          )}
          <Box flexDirection="column" borderStyle="round" borderColor="subtle" paddingX={1}>
            <Text bold>Som</Text>
            <Text dimColor>
              {terminal
                ? 'Cada sessão toca um som quando passa a esperar você (no macOS).'
                : 'Cada sessão toca um som quando passa a esperar você e quando responde fora da tela.'}
            </Text>
            <Box key="sons" flexDirection="column" gap={1} marginTop={1}>
              {linhaDoSom('Esperando por você', seletorLigado('ajuste-som-esperando', 'somEsperando'))}
              {!terminal && linhaDoSom('Resposta não vista', seletorLigado('ajuste-som-nao-visto', 'somNaoVisto'))}
              {linhaDoSom(
                'Volume',
                <Select
                  key="ajuste-volume"
                  options={opcoes(NOME_VOLUME)}
                  value={a.volume}
                  onSelect={(v: string) => void mudarAjustes($, x => ({ ...x, volume: lerAjustes({ volume: v }).volume }))}
                />,
              )}
            </Box>
          </Box>
          <Text dimColor>Os ajustes valem para todas as suas sessões.</Text>
        </Box>
      )
    }

    // No terminal, uma linha em branco separa o painel das abas do app de painéis.
    return (
      <Box flexDirection="column" gap={1} marginTop={terminal ? 1 : 0}>
        {semRegistro && <Text dimColor>Sem a pasta da casa (nem HOME nem USERPROFILE): o farol não registra as sessões aqui.</Text>}
        {desenhos}
        {!semRegistro && lista.length === 0 && <Text dimColor>Nenhuma sessão com o farol ligado.</Text>}
        {terminal && lista.length > 0 && desenharPainelNoTerminal($, e, { lista, agora: t, minha, temaClaro: await temaClaro($) })}
        {!desenhos && !terminal && lista.length > 0 && <Box flexDirection="column" gap={1}>{lista.map(sessao)}</Box>}
        <Box flexDirection="row" justifyContent="space-between" alignItems="center">
          <Button key="ajustes" label={abertos ? 'Esconder ajustes' : 'Ajustes'} variant={abertos ? 'primary' : undefined} dimColor={!abertos || undefined} onPress={() => update($, ajustesAbertos, x => !x)} />
          <Button key="fechar" label="Fechar" role="dismiss" onPress={() => fechar($)} />
        </Box>
        {blocoAjustes}
      </Box>
    )
  })
}
