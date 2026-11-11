import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Ajustes, Estado, Registro } from '../types'
import { NOME_NA_FAIXA, PADRAO, lerAjustes } from './ajustes'
import { semLarguraAmbigua } from './comum/largura'
import { desenharCartoes } from './cartoes'
import { ALTURA_CENA, cenaSvg, descricaoDaCena, situacaoDaCena } from './cena'
import { SEM_TITULO, casaDe, detalheDe, lerRegistro, ordenar, pastaDoRegistro, tituloDe, visualDe } from './estado'
import { desenharFaixa } from './faixa'

const PAINEL = 'farol'
const sessoes = atom({ plugin: 'farol', key: 'sessoes' } as const, [])
const agora = atom({ plugin: 'farol', key: 'agora' } as const, 0)
const minhaId = atom({ plugin: 'farol', key: 'minhaId' } as const, '')
const ajustes = atom({ plugin: 'farol', key: 'ajustes' } as const, null)
const ajustesAbertos = atom({ plugin: 'farol', key: 'ajustesAbertos' } as const, false)

// A pergunta ao usuário que para a sessão até a resposta.
const PERGUNTA = 'AskUserQuestion'

// O registro desta sessão; cada mudança é gravada em <casa>/.claude/farol/<id>.json. Sem a pasta da casa
// (nem HOME nem USERPROFILE), `pastaDoFarol` fica vazia e o farol não grava nem lê nada.
let eu: Registro | null = null
let pastaDoFarol = ''
// Perguntas abertas agora, da sessão e dos subagentes: a sessão volta a trabalhando só depois da última.
let perguntas = 0

const gravar = async ($: EngineInterface) => {
  if (!eu || !pastaDoFarol) return
  eu = { ...eu, vivoEm: await $.clock.now() }
  await $.fs.write(`${pastaDoFarol}/${eu.id}.json`, JSON.stringify(eu))
}

// Relê o registro de todas as sessões (esta inclusive).
const atualizar = async ($: EngineInterface) => {
  if (!pastaDoFarol) return
  const lista: Registro[] = []
  for (const f of await $.fs.list(pastaDoFarol).catch(() => [])) {
    if (f.kind !== 'file' || !f.name.endsWith('.json')) continue
    const r = lerRegistro(await $.fs.read(`${pastaDoFarol}/${f.name}`).catch(() => ''))
    if (r) lista.push(r)
  }
  const t = await $.clock.now()
  await update($, sessoes, () => lista)
  await update($, agora, () => t)
}

// Nunca lança: o farol não pode atrapalhar prompt, ferramenta nem resposta.
const mudar = async ($: EngineInterface, estado: Estado) => {
  if (!eu || eu.estado === estado) return
  try {
    eu = { ...eu, estado, desde: await $.clock.now() }
    await gravar($)
    await atualizar($)
  } catch {
    // segue sem atualizar o painel
  }
}

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
let releitura: { cancel: () => void } | null = null

const ajustarReleitura = async ($: EngineInterface) => {
  const a = (await read($, ajustes)) ?? PADRAO
  const precisa = pastaDoFarol !== '' && (a.naFaixa === 'mostrar' || painelAberto)
  if (precisa && !releitura) releitura = $.clock.every(5_000, () => void atualizar($).catch(() => undefined))
  if (!precisa && releitura) {
    releitura.cancel()
    releitura = null
  }
}

const abrir = async ($: EngineInterface) => {
  painelAberto = true
  await atualizar($).catch(() => undefined)
  await ajustarReleitura($)
  await $.ui.open({ id: PAINEL, title: 'Farol' })
}

const fechar = async ($: EngineInterface) => {
  painelAberto = false
  await update($, ajustesAbertos, () => false)
  await ajustarReleitura($)
  await $.ui.close({ id: PAINEL })
}

// O clique num cartão do painel no app. A troca de sessão precisa do id do app (os arquivos de sessão dele, no
// macOS) e chega numa versão seguinte, com os extras do app; até lá, o clique não faz nada.
const trocarDeSessao = (_r: Registro): void => undefined

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

    const casa = casaDe(await $.env.get('HOME'), await $.env.get('USERPROFILE'))
    if (!casa) return result
    try {
      pastaDoFarol = `${casa}/.claude/farol`
      const id = await $.session.id()
      const t = await $.clock.now()
      eu = { id, pasta: pastaDoRegistro(e.cwd), titulo: await tituloDaConversa($), estado: 'livre', desde: t, vivoEm: t }
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
    await mudar($, 'trabalhando')
    return next(e)
  }).catch(($, e, next) => next(e))

  // O começo e o fim de um turno de subagente não mudam o estado da sessão: só os do laço principal.
  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) await mudar($, 'trabalhando')
    return next(e)
  }).catch(($, e, next) => next(e))

  // Uma pergunta da sessão ou de um subagente deixa a sessão esperando você até a resposta.
  on('tool.call', async ($, e, next) => {
    if (e.tool !== PERGUNTA) return next(e)
    perguntas += 1
    await mudar($, 'esperando')
    try {
      return await next(e)
    } finally {
      perguntas = Math.max(0, perguntas - 1)
      if (perguntas === 0 && eu?.estado === 'esperando') await mudar($, 'trabalhando')
    }
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined) {
      perguntas = 0
      await mudar($, 'livre')
    }
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

  // O painel: no app, a cena do farol no topo e um cartão com barco por sessão; no terminal, uma linha
  // de título e uma de "pasta · tempo · estado" por sessão. Abaixo, os ajustes e o Fechar.
  on('ui.render', { component: 'Pane', requestId: PAINEL }, async ($, e) => {
    const elementos = $.ui.resolve(e)
    const { Box, Text, Button } = elementos
    const t = await read($, agora)
    const minha = await read($, minhaId)
    const lista = ordenar(await read($, sessoes), t)
    const terminal = e.surface === 'terminal'
    const a = (await read($, ajustes)) ?? PADRAO

    const sessao = (r: Registro) => {
      const v = visualDe(r, t)
      // No terminal, um símbolo de largura ambígua no título entorta o que vem ao lado.
      const titulo = terminal ? semLarguraAmbigua(r.titulo) : r.titulo
      return (
        <Box flexDirection="column">
          <Text bold dimColor={v === 'sem-sinal'} wrap="truncate-end">{titulo}</Text>
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
          <Svg key="cena" source={cenaSvg(situacao, a.movimento, largura)} alt={descricaoDaCena(situacao)} height={ALTURA_CENA} isInteractive={a.movimento || undefined} />
          {lista.length > 0 && desenharCartoes($, e, { lista, agora: t, minha, movimento: a.movimento, trocar: trocarDeSessao })}
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
              <Select
                key="ajuste-contagem"
                options={opcoes({ nao: 'desligada (padrão)', sim: 'ligada' })}
                value={a.contagem ? 'sim' : 'nao'}
                onSelect={(v: string) => void mudarAjustes($, x => ({ ...x, contagem: v === 'sim' }))}
              />,
            )}
          {!terminal &&
            linha(
              'Movimento',
              'O painel se mexendo (a cena e os barcos). Desligado, tudo fica parado.',
              <Select
                key="ajuste-movimento"
                options={opcoes({ sim: 'ligado (padrão)', nao: 'desligado' })}
                value={a.movimento ? 'sim' : 'nao'}
                onSelect={(v: string) => void mudarAjustes($, x => ({ ...x, movimento: v === 'sim' }))}
              />,
            )}
          <Text dimColor>Os ajustes valem para todas as suas sessões.</Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column" gap={1}>
        {semRegistro && <Text dimColor>Sem a pasta da casa (nem HOME nem USERPROFILE): o farol não registra as sessões aqui.</Text>}
        {desenhos}
        {!semRegistro && lista.length === 0 && <Text dimColor>Nenhuma sessão com o farol ligado.</Text>}
        {!desenhos && lista.length > 0 && <Box flexDirection="column" gap={1}>{lista.map(sessao)}</Box>}
        <Box flexDirection="row" justifyContent="space-between" alignItems="center">
          <Button key="ajustes" label={abertos ? 'Esconder ajustes' : 'Ajustes'} dimColor onPress={() => update($, ajustesAbertos, x => !x)} />
          <Button key="fechar" label="Fechar" role="dismiss" onPress={() => fechar($)} />
        </Box>
        {blocoAjustes}
      </Box>
    )
  })
}
