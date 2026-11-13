import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderSurface, SessionRateLimit } from 'claude-code'

import type { Ajustes, Medida } from '../types'
import { NOME_OLA, NOME_SEMANA, PADRAO, larguraDasBarras, lerAjustes, marAnimado } from './ajustes'
import { lerLogDePermissoes, modoPede, pedidosNoLog, situacaoNoLog } from './comum/permissao'
import { campoTexto, comandoRetomar, corDoRisco, descreverPedido, promptExplicacao, separarRisco } from './explicar'
import { ALTURA_FINA, barraFinaSvg, barraTerminal, detalhar, janelas, limitesVigentes, pctTxt, rotuloTerminal } from './limites'
import type { Janela } from './limites'
import { ALTURA, contextoTerminal, praiaSvg } from './praia'
import { solSvg } from './sol'
import type { Pedaco } from './praia'

const PAINEL = 'barra-de-uso'
const PAINEL_EXPLICACAO = 'barra-de-uso-explicacao'
const PAINEL_AJUSTES = 'barra-de-uso-ajustes'
// A cor de cada ajuste no painel: a lua, o mar, o coral e a areia.
const COR_AJUSTE = { semana: '#6C8FB3', ola: '#2F9FD0', explain: '#E07A5F', copiar: '#A08F70' } as const
const medida = atom({ plugin: 'barra-de-uso', key: 'medida' } as const, null)
const pendente = atom({ plugin: 'barra-de-uso', key: 'pendente' } as const, null)
const explicacao = atom({ plugin: 'barra-de-uso', key: 'explicacao' } as const, null)
const ajustes = atom({ plugin: 'barra-de-uso', key: 'ajustes' } as const, null)

// Arquivo desta sessão no app desktop (macOS), onde ele grava o modo de permissão (Manual, Auto…).
// undefined: ainda não procurado; null: a sessão não é do app (terminal, ou outro sistema).
const APP_SESSOES = 'Library/Application Support/Claude/claude-code-sessions'
let home = ''
let arquivoApp: string | null | undefined
// O último "perguntar" da checagem, para o aviso de permissão (que não traz a entrada) saber qual é.
let ultimoPedido: ReturnType<typeof descreverPedido> | null = null

// O app às vezes guarda mais de um arquivo para a mesma sessão (o antigo fica para trás): vale o gravado
// por último, que é o da janela em uso.
const acharArquivoApp = async ($: EngineInterface): Promise<string | null> => {
  const id = await $.session.id()
  const base = `${home}/${APP_SESSOES}`
  let melhor: { caminho: string; mtimeMs: number } | null = null
  for (const a of await $.fs.list(base).catch(() => [])) {
    if (a.kind !== 'dir') continue
    for (const b of await $.fs.list(`${base}/${a.name}`).catch(() => [])) {
      if (b.kind !== 'dir') continue
      const dir = `${base}/${a.name}/${b.name}`
      for (const f of await $.fs.list(dir).catch(() => [])) {
        if (f.kind !== 'file' || !f.name.startsWith('local_') || !f.name.endsWith('.json')) continue
        const caminho = `${dir}/${f.name}`
        if (campoTexto(await $.fs.read(caminho).catch(() => ''), 'cliSessionId') !== id) continue
        if (!melhor || f.mtimeMs > melhor.mtimeMs) melhor = { caminho, mtimeMs: f.mtimeMs }
      }
    }
  }
  return melhor?.caminho ?? null
}

const modoAtual = async ($: EngineInterface): Promise<string | undefined> => {
  if (arquivoApp === undefined) arquivoApp = await acharArquivoApp($)
  if (!arquivoApp) return undefined
  return campoTexto(await $.fs.read(arquivoApp).catch(() => ''), 'permissionMode')
}

// Id desta sessão no app (local_…), o que o log usa; null fora do app.
const sessaoApp = async ($: EngineInterface): Promise<string | null> => {
  if (arquivoApp === undefined) arquivoApp = await acharArquivoApp($)
  return arquivoApp ? (arquivoApp.split('/').pop() ?? '').replace(/\.json$/, '') : null
}

// Vigia do log do app enquanto houver uma chamada que a checagem mandou "perguntar".
let conhecidos: Set<string> = new Set()
let abertas = 0
let vigia: { cancel: () => void } | null = null

const conferirLog = async ($: EngineInterface) => {
  const minha = await sessaoApp($)
  if (!minha) return
  const situacao = situacaoNoLog(await lerLogDePermissoes($, home), minha, conhecidos)
  const aberto = await read($, pendente)
  if (situacao === 'aberto' && !aberto && ultimoPedido) {
    const pedido = ultimoPedido
    await update($, pendente, () => pedido)
  }
  if (situacao === 'respondido' && aberto) await update($, pendente, () => null)
}

const pararVigia = () => {
  vigia?.cancel()
  vigia = null
}

const mudarAjustes = async ($: EngineInterface, muda: (a: Ajustes) => Ajustes) => {
  const novo = muda((await read($, ajustes)) ?? PADRAO)
  await update($, ajustes, () => novo)
  await $.store.set('ajustes', novo)
}

// Copia o comando que reabre esta sessão ("cd <pasta> && claude --desktop --resume <id>"). Tenta o
// clipboard da superfície; no desktop ele ainda pode não ter caminho, e aí vai pelo pbcopy do macOS.
const copiarComando = async ($: EngineInterface, surface: RenderSurface) => {
  const texto = comandoRetomar(await $.session.cwd(), await $.session.id())
  const r = await $.ui.copy({ text: texto, surface }).catch(() => ({ isCopied: false as const }))
  const ok =
    r.isCopied ||
    (await $.process.run(['pbcopy'], { stdin: texto }).catch(() => ({ exitCode: 1 }))).exitCode === 0
  $.ui.toast(ok ? `Copiado: ${texto}` : 'Não consegui copiar o comando.', { timeoutMs: 6_000 })
}

const abrirDetalhes = ($: EngineInterface) => $.ui.open({ id: PAINEL, title: 'Uso e limites' })

// O ⚓ abre o painel de ajustes e, aberto, fecha.
let ajustesAbertos = false
const fecharAjustes = async ($: EngineInterface) => {
  ajustesAbertos = false
  await $.ui.close({ id: PAINEL_AJUSTES })
}
const alternarAjustes = async ($: EngineInterface) => {
  if (ajustesAbertos) return fecharAjustes($)
  ajustesAbertos = true
  await $.ui.open({ id: PAINEL_AJUSTES, title: 'Ajustes da barra' })
}

// Explica o pedido de permissão aberto numa conversa lateral (fork da sessão, sem ferramentas):
// a conversa principal não recebe nada e o pedido continua esperando sua resposta.
const explicar = async ($: EngineInterface) => {
  const p = await read($, pendente)
  const atual = await read($, explicacao)
  if (!p || atual?.estado === 'carregando') return
  await update($, explicacao, () => ({ estado: 'carregando', resumo: p.resumo, texto: '' }))
  void $.ui.open({ id: PAINEL_EXPLICACAO, title: 'Explicação do comando' })

  const prompt = promptExplicacao(p)
  let r = await $.model.fork({ prompt })
  // Sem conversa para bifurcar (ou erro), pergunta ao modelo da sessão sem o contexto.
  if (!r.isAnswered) r = await $.model.complete({ model: await $.session.model(), prompt, maxTokens: 1500 })
  const fim = r
  await update($, explicacao, () =>
    fim.isAnswered
      ? { estado: 'pronta', resumo: p.resumo, texto: fim.text }
      : { estado: 'erro', resumo: p.resumo, texto: `Não consegui explicar agora (${fim.reason}).` },
  )
}

// Limites a mostrar: a leitura nova, guardada no $.store (vale para todas as sessões, pois é da conta), ou,
// sem leitura nova, a última guardada até o reset de cada janela.
const vigentes = async ($: EngineInterface, novos: readonly SessionRateLimit[]): Promise<SessionRateLimit[]> => {
  if (novos.length > 0) {
    await $.store.set('limites', novos)
    return [...novos]
  }
  const guardados = ((await $.store.get('limites')) as SessionRateLimit[] | undefined) ?? []
  return limitesVigentes(novos, guardados, await $.clock.now())
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    home = (await $.env.get('HOME')) ?? ''

    const guardados = lerAjustes(await $.store.get('ajustes'))
    await update($, ajustes, () => guardados)

    const u = await $.session.usage()
    const limites = await vigentes($, u.rateLimits)
    await update($, medida, () => ({ limites, contexto: u.context, custoUsd: u.cost?.usd }))
    await $.command.register({ name: PAINEL, description: 'Abre o painel com o uso da sessão, da semana e do contexto' })
    return result
  })

  on('session.measure', async ($, e, next) => {
    const m: Medida = { limites: await vigentes($, e.rateLimits), contexto: e.context, custoUsd: e.cost?.usd }
    await update($, medida, () => m)
    return next(e)
  })

  on('command.run', { command: PAINEL }, async $ => {
    await abrirDetalhes($)
    return { text: 'Painel de uso aberto.' }
  })

  // Guarda o pedido de permissão que está na tela, para o botão "🐚 Explain" (explicar comando).
  // No terminal, o Claude Code avisa quando vai mostrar o pedido.
  on('classic.PermissionRequest', async ($, e, next) => {
    await update($, pendente, () => descreverPedido(e.tool_name, e.tool_input))
    return next(e)
  }).catch(($, e, next) => next(e))

  // No app desktop o pedido vai por um canal do app, sem aquele aviso. Depois de um "perguntar" da
  // checagem, o mod olha o log do app a cada segundo: ele registra o pedido quando ele aparece para você
  // (no Auto, só quando o classificador manda para você) e a sua resposta. No Manual, nem espera o log.
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)
    if (verdict.decision === 'ask' && e.tool_use_id && !e.agentId) {
      const pedido = descreverPedido(e.tool, e.input)
      ultimoPedido = pedido
      if (modoPede(await modoAtual($), e.tool)) await update($, pendente, () => pedido)
      if (await sessaoApp($)) {
        if (!vigia) {
          conhecidos = pedidosNoLog(await lerLogDePermissoes($, home))
          vigia = $.clock.every(1_000, () => void conferirLog($))
        }
        abertas += 1
      }
    }
    return verdict
  }).catch(($, e, next) => next(e))

  // Outro aviso possível de "precisa da sua permissão"; ele não traz a entrada, que vem do último "perguntar".
  on('classic.Notification', async ($, e, next) => {
    if (/permission/i.test(e.notification_type) && ultimoPedido) {
      const pedido = ultimoPedido
      await update($, pendente, () => pedido)
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // A chamada termina depois da sua resposta (e da execução): o pedido não está mais aberto.
  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    if (abertas > 0) abertas -= 1
    if (abertas === 0) pararVigia()
    if (await read($, pendente)) await update($, pendente, () => null)
    return ran
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    abertas = 0
    pararVigia()
    if (await read($, pendente)) await update($, pendente, () => null)
    return result
  })

  on('ui.render', { component: 'Pane', requestId: PAINEL_EXPLICACAO }, async ($, e) => {
    const { Box, Text, Button, Markdown } = $.ui.resolve(e)
    const x = await read($, explicacao)
    // A primeira linha é a faixa de risco: sai do Markdown e ganha cor própria.
    const { risco, resto } = separarRisco(x?.texto ?? '')

    return (
      <Box flexDirection="column" gap={1}>
        <Text dimColor>{x?.resumo ?? 'Nenhum pedido de permissão explicado ainda.'}</Text>
        {x?.estado === 'carregando' && <Text color="suggestion">Explicando numa conversa lateral… o pedido continua esperando você.</Text>}
        {x?.estado === 'pronta' && risco && (
          <Text>
            <Text bold color={corDoRisco(risco.nivel)}>{risco.rotulo}</Text>
            {risco.motivo ? <Text> — {risco.motivo}</Text> : null}
          </Text>
        )}
        {x?.estado === 'pronta' && <Markdown text={resto} />}
        {x?.estado === 'erro' && <Text color="error">{x.texto}</Text>}
        <Box flexDirection="row" justifyContent="flex-end">
          <Button key="fechar-explicacao" label="Fechar" role="dismiss" onPress={() => $.ui.close({ id: PAINEL_EXPLICACAO })} />
        </Box>
      </Box>
    )
  })

  // A faixa pode ser dividida com outros mods: cada um desenha o seu e inclui o que os outros desenharam
  // (next), à esquerda.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const outros = await next(e)

    const a = (await read($, ajustes)) ?? PADRAO
    const animado = marAnimado(a.ola, e.surface)
    const m = await read($, medida)
    const ctx = m?.contexto.percent
    const js = janelas(m?.limites ?? [])

    // O Explain é do app: no terminal a faixa some enquanto o pedido de permissão está na tela, e o aviso do
    // pedido pode nem chegar aos mods. Lá, nem o botão nem o ajuste aparecem.
    const temExplain = e.surface !== 'terminal'
    const pedido = temExplain && a.explain ? await read($, pendente) : null
    const carregando = (await read($, explicacao))?.estado === 'carregando'
    const semMoldura = e.surface === 'terminal' ? true : undefined
    const botoes = (
      <Box flexDirection="row" gap={1}>
        {pedido && <Button key="explicar" label={carregando ? '🐚 …' : '🐚 Explain'} variant="primary" onPress={() => explicar($)} />}
        {/* No terminal, sem os colchetes (`plain`): o foco e o mouse ainda invertem o ícone. */}
        {a.copiar && <Button key="copiar-cmd" label="📋" dimColor plain={semMoldura} onPress={press => copiarComando($, press.surface)} />}
        {/* No terminal, o ⚓ ocupa uma casa na tela mas conta como duas no layout, e o botão sai torto: lá vai o ≡. */}
        <Button key="menu" label={e.surface === 'terminal' ? '≡' : '⚓'} dimColor plain={semMoldura} onPress={() => alternarAjustes($)} />
      </Box>
    )

    const pedacos = (lista: Pedaco[]) =>
      lista.map(p => (
        <Text color={p.cor} backgroundColor={p.fundo} dimColor={p.apagado} bold={p.negrito}>
          {p.texto}
        </Text>
      ))

    // A semana escondida sai da faixa; "só número" fica sem a barra.
    const visiveis = js.filter(j => j.chave !== 'semana' || a.semana !== 'escondida')
    const comBarra = (j: Janela) => j.chave !== 'semana' || a.semana === 'barra'

    // Antes da 1ª resposta (sessão nova ou retomada), o Claude Code ainda não mediu o contexto: a faixa
    // mostra "Contexto …" em vez de sumir com a barra.
    let barras
    if (e.surface === 'terminal') {
      // "Contexto ▄▄▄▄▄▄▄▄▄▄ 50%  │  5h ▄▄▄▄▄▄▄▄▄▄ 42% - 17:00  │  Sem. 70%", barras paradas, em degradê.
      const janela = (j: Janela) => [
        ...pedacos([{ texto: `${rotuloTerminal(j)} ` }, ...(comBarra(j) ? [...barraTerminal(j.pct, j.escala), { texto: ' ' }] : [])]),
        <Text bold>{pctTxt(j.pct)}</Text>,
        <Text>{j.sufixo}</Text>,
      ]
      const partes = [
        ctx !== undefined
          ? [<Text>Contexto </Text>, ...pedacos(contextoTerminal(ctx)), <Text bold> {pctTxt(ctx)}</Text>]
          : [<Text>Contexto </Text>, <Text dimColor>…</Text>],
        ...visiveis.map(janela),
      ]
      barras = (
        <Text wrap="truncate-end">
          {partes.map((p, i) => (
            <Text>
              {i > 0 && <Text dimColor>  │  </Text>}
              {p}
            </Text>
          ))}
        </Text>
      )
    } else {
      // No app, as barras são SVG, todas da mesma largura, que acompanha a da faixa: a praia no contexto, o
      // pôr do sol na janela de 5h e o trilho na semana. Cada grupo não encolhe: sem espaço, desce inteiro
      // para a linha de baixo.
      const elementos = $.ui.resolve(e)
      if (!('Svg' in elementos)) return outros
      const { Svg } = elementos
      const W = larguraDasBarras(e.props.bodyColumns)
      const desenho = (j: Janela) =>
        j.chave === 'sessao' ? (
          <Svg key="sol" source={solSvg(j.pct, W)} alt={`Janela de 5h em ${pctTxt(j.pct)}`} width={W} height={ALTURA} />
        ) : (
          <Svg key="semana" source={barraFinaSvg(j.pct, j.escala, W)} alt={`Semana em ${pctTxt(j.pct)}`} width={W} height={ALTURA_FINA} />
        )
      barras = (
        <Box flexDirection="row" columnGap={2} rowGap={0} alignItems="center" flexWrap="wrap" flexShrink={1}>
          <Box flexDirection="row" gap={1} alignItems="center" flexShrink={0}>
            <Text wrap="truncate-end">Contexto</Text>
            {ctx === undefined && <Text dimColor>…</Text>}
            {ctx !== undefined && (
              <Svg key="praia" source={praiaSvg(ctx, animado, W)} alt={`Contexto em ${pctTxt(ctx)}`} width={W} height={ALTURA} isInteractive={animado} />
            )}
            {ctx !== undefined && <Text bold>{pctTxt(ctx)}</Text>}
          </Box>
          {visiveis.map(j => (
            <Box flexDirection="row" gap={1} alignItems="center" flexShrink={0}>
              <Text dimColor>│</Text>
              {j.rotulo ? <Text wrap="truncate-end">{j.rotulo}</Text> : null}
              {comBarra(j) && desenho(j)}
              <Text bold>{pctTxt(j.pct)}</Text>
              {j.sufixo ? <Text wrap="truncate-end">{j.sufixo}</Text> : null}
            </Box>
          ))}
        </Box>
      )
    }

    // No terminal, uma linha de espaço separa a faixa da conversa; no app, o fundo da faixa já separa. Lá os
    // itens se alinham pela base: um mod que divida a faixa e esteja por fora, alinhado do mesmo jeito, desce
    // junto, e o espaço fica acima da faixa inteira.
    const terminal = e.surface === 'terminal'
    return (
      <Box flexDirection="row" gap={2} alignItems={terminal ? 'flex-end' : 'center'} marginTop={terminal ? 1 : 0}>
        {outros}
        {barras}
        {botoes}
      </Box>
    )
  })

  // O painel de ajustes do ⚓: os ajustes em duas seções, cada um numa linha com o nome e uma frase à
  // esquerda e a escolha à direita.
  on('ui.render', { component: 'Pane', requestId: PAINEL_AJUSTES }, async ($, e) => {
    const elementos = $.ui.resolve(e)
    const { Box, Text, Button } = elementos
    if (!('Select' in elementos)) return <Text dimColor>Os ajustes da barra não abrem aqui; use o app ou o terminal.</Text>
    const { Select } = elementos
    const a = (await read($, ajustes)) ?? PADRAO
    const opcoes = (nomes: Record<string, string>) => Object.entries(nomes).map(([value, label]) => ({ value, label }))
    const LIGA = { sim: 'ligado', nao: 'desligado' }
    const secao = (titulo: string) => <Text dimColor bold>{titulo}</Text>
    // Cada ajuste é um cartão com a borda e o nome na cor dele, para não ficarem colados.
    const linha = (titulo: string, explica: string, campo: JSX.Element, cor: string) => (
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        gap={2}
        borderStyle="round"
        borderColor={cor}
        paddingX={1}
      >
        <Box flexDirection="column" flexGrow={1} flexShrink={1}>
          <Text bold color={cor}>{titulo}</Text>
          <Text dimColor>{explica}</Text>
        </Box>
        <Box flexShrink={0}>{campo}</Box>
      </Box>
    )

    return (
      <Box flexDirection="column" gap={1}>
        {secao('Na faixa')}
        {linha(
          'Semana',
          'Como a janela semanal aparece.',
          <Select
            key="ajuste-semana"
            options={opcoes(NOME_SEMANA)}
            value={a.semana}
            onSelect={(v: string) => void mudarAjustes($, x => ({ ...x, semana: lerAjustes({ semana: v }).semana }))}
          />,
          COR_AJUSTE.semana,
        )}
        {/* No terminal as barras são paradas: não há ola para ligar. */}
        {e.surface !== 'terminal' &&
          linha(
            'Ola',
            'O mar se mexendo no desenho: a beira indo e voltando e o brilho correndo pela água.',
            <Select
              key="ajuste-ola"
              options={opcoes(NOME_OLA)}
              value={a.ola}
              onSelect={(v: string) => void mudarAjustes($, x => ({ ...x, ola: lerAjustes({ ola: v }).ola }))}
            />,
            COR_AJUSTE.ola,
          )}
        {secao('Botões')}
        {e.surface !== 'terminal' &&
          linha(
            'Explain',
            'Explica um pedido de permissão, com a faixa de risco. Só no app, no macOS.',
            <Select
              key="ajuste-explain"
              options={opcoes(LIGA)}
              value={a.explain ? 'sim' : 'nao'}
              onSelect={(v: string) => void mudarAjustes($, x => ({ ...x, explain: v === 'sim' }))}
            />,
            COR_AJUSTE.explain,
          )}
        {linha(
          'Copiar comando',
          'O 📋 copia o comando que reabre esta sessão a partir de um terminal.',
          <Select
            key="ajuste-copiar"
            options={opcoes(LIGA)}
            value={a.copiar ? 'sim' : 'nao'}
            onSelect={(v: string) => void mudarAjustes($, x => ({ ...x, copiar: v === 'sim' }))}
          />,
          COR_AJUSTE.copiar,
        )}
        <Box flexDirection="row" justifyContent="space-between" alignItems="center">
          <Text dimColor>Valem para todas as suas sessões.</Text>
          <Button key="fechar-ajustes" label="Fechar" role="dismiss" onPress={() => fecharAjustes($)} />
        </Box>
      </Box>
    )
  })

  // O painel pode fechar pelo próprio app (o X dele): o ⚓ volta a abrir no próximo clique.
  on('ui.close', async ($, e, next) => {
    if (e.id === PAINEL_AJUSTES) ajustesAbertos = false
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PAINEL }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const m = await read($, medida)
    const agora = await $.clock.now()
    const linhas = detalhar(m?.limites ?? [], agora)
    const ctx = m?.contexto

    return (
      <Box flexDirection="column" gap={1}>
        {linhas.length === 0 && <Text dimColor>Sem leitura de limites ainda (só aparece em conta de assinatura, após a 1ª resposta).</Text>}
        {linhas.map(l => (
          <Box flexDirection="column">
            <Text bold>{l.titulo}</Text>
            <Text color={l.cor}>{l.uso}</Text>
            <Text dimColor>{l.reset}</Text>
          </Box>
        ))}
        {ctx && (
          <Box flexDirection="column">
            <Text bold>Contexto desta sessão</Text>
            <Text>
              {ctx.percent !== undefined ? `${ctx.percent}%` : '—'} de {Math.round(ctx.window / 1000)}k tokens
              {ctx.tokens !== undefined ? ` (${Math.round(ctx.tokens / 1000)}k em uso)` : ''}
            </Text>
          </Box>
        )}
        {m?.custoUsd !== undefined && <Text dimColor>Custo equivalente da sessão: US$ {m.custoUsd.toFixed(2)}</Text>}
        <Box>
          <Button key="fechar" label="Fechar" role="dismiss" onPress={() => $.ui.close({ id: PAINEL })} />
        </Box>
      </Box>
    )
  })
}
