import { expect, test } from 'claude-code/testing'

import { AGORA, FAIXA, INICIO, PAINEL, gravarOutra, preparar } from './apoio-de-teste'

const SUPERFICIES = ['terminal', 'desktop'] as const

// O seletor de cada som nos ajustes, montado por função: o nome literal depois de `key:` parece chave ao gitleaks.
const somDoAjuste = (som: string) => `ajuste-som-${som}`

const textos = async (ui: { findAll: (q: { type: 'Text' }) => Promise<{ text: string }[]> }) => (await ui.findAll({ type: 'Text' })).map(t => t.text)

test('o painel lista as sessões pela prioridade, com "pasta · tempo · estado", e marca esta sessão', async ($, on) => {
  const m = preparar(on)
  gravarOutra(m, { id: 'outra-livre', titulo: 'Revisar o PR', estado: 'livre', desde: AGORA - 7 * 60_000 })
  gravarOutra(m, { id: 'outra-esperando', titulo: 'Escolher o tom', estado: 'esperando', desde: AGORA - 2 * 60_000 })
  await $.session.start(INICIO)

  // No terminal, as linhas têm outro formato (terminal.test.tsx).
  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  const t = await textos(ui)
  // As linhas inteiras ("pasta · tempo · estado"); a desta sessão é feita de pedaços, que ficam de fora.
  expect(t.filter(x => (x.match(/ · /g) ?? []).length >= 2)).toEqual([
    'exemplo · há 2 min · Esperando',
    'exemplo · agora · Livre · esta sessão',
    'exemplo · há 7 min · Livre',
  ])
  expect(t).toContain('Escolher o tom')
  expect(t).toContain('Revisar o PR')
  await ui.unmount()
})

test('a sessão sem sinal mostra há quanto tempo parou de renovar o registro', async ($, on) => {
  const m = preparar(on)
  gravarOutra(m, { id: 'calada', estado: 'trabalhando', desde: AGORA - 60 * 60_000, vivoEm: AGORA - 5 * 60_000 })
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  expect(await textos(ui)).toContain('exemplo · há 5 min · Sem sinal')
  await ui.unmount()
})

test('sem os arquivos do app, nada fica azul: nem o painel nem a faixa', async ($, on) => {
  const m = preparar(on)
  gravarOutra(m, { id: 'respondeu', estado: 'livre', naoVisto: true })
  await $.session.start(INICIO)

  const painel = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  expect((await textos(painel)).some(x => x.includes('Não visto'))).toBe(false)
  await painel.unmount()

  const faixa = await $.ui.mount({ ...FAIXA, surface: 'desktop' })
  expect(String((await faixa.find({ type: 'Svg' }))?.props.source)).not.toContain('class="a"')
  await faixa.unmount()
})

test('sem a pasta da casa, o painel diz por que não há registro', async ($, on) => {
  preparar(on, { variaveis: {} })
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  expect((await textos(ui)).some(x => /HOME/.test(x) && /USERPROFILE/.test(x))).toBe(true)
  await ui.unmount()
})

test('no app, os ajustes da faixa, do movimento e os dois do som; no terminal, "na faixa" e o som do esperando', async ($, on) => {
  preparar(on)
  await $.session.start(INICIO)

  const app = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  await app.press({ key: 'ajustes' })
  for (const key of ['ajuste-na-faixa', 'ajuste-contagem', 'ajuste-movimento', somDoAjuste('esperando'), somDoAjuste('nao-visto')]) {
    expect(await app.find({ key })).toBeDefined()
  }
  expect(await textos(app)).toContain('Som')
  await app.press({ key: 'fechar' })
  await app.unmount()

  const terminal = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  await terminal.press({ key: 'ajustes' })
  expect(await terminal.find({ key: 'ajuste-na-faixa' })).toBeDefined()
  expect(await terminal.find({ key: 'ajuste-contagem' })).toBeUndefined()
  expect(await terminal.find({ key: 'ajuste-movimento' })).toBeUndefined()
  expect(await terminal.find({ key: somDoAjuste('esperando') })).toBeDefined()
  expect(await terminal.find({ key: somDoAjuste('nao-visto') })).toBeUndefined()
  await terminal.unmount()
})

test('"na faixa: esconder" tira o farol da faixa, e o /farol ainda abre o painel', async ($, on) => {
  const m = preparar(on)
  await $.session.start(INICIO)

  const painel = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  await painel.press({ key: 'ajustes' })
  await painel.select({ key: 'ajuste-na-faixa', value: 'esconder' })
  await painel.unmount()

  const faixa = await $.ui.mount({ ...FAIXA, surface: 'desktop' })
  expect(await faixa.find({ key: 'abrir-farol' })).toBeUndefined()
  await faixa.unmount()

  await $.command.run({ command: 'farol', args: '' } as never)
  expect(m.paineis).toEqual(['farol'])
})

test('o botão Fechar fecha o painel', async ($, on) => {
  const m = preparar(on)
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  await ui.press({ key: 'fechar' })
  await ui.unmount()
  expect(m.paineis).toEqual(['fechou farol'])
})

test('no app, a cena no topo e um cartão por sessão, pela prioridade, com o barco e um clique no cartão inteiro', async ($, on) => {
  const m = preparar(on)
  gravarOutra(m, { id: 'outra-livre', titulo: 'Revisar o PR', estado: 'livre', desde: AGORA - 7 * 60_000 })
  gravarOutra(m, { id: 'outra-esperando', titulo: 'Escolher o tom', estado: 'esperando', desde: AGORA - 2 * 60_000 })
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  // O primeiro desenho do painel é a cena; os outros, os barcos.
  const cena = (await ui.findAll({ type: 'Svg' }))[0]
  expect(cena?.props.alt).toBe('Farol com a luz vermelha piscando e sinalizadores no céu: há sessão esperando você')
  expect(String(cena?.props.source)).toContain('id="feixes-vermelhos"')

  const barcos = (await ui.findAll({ type: 'Svg' })).filter(s => /^Barco:/.test(String(s.props.alt)))
  expect(barcos.map(b => b.props.alt)).toEqual([
    'Barco: Esperando',
    'Barco: Livre',
    'Barco: Livre',
  ])

  // O botão do app tem uma linha só: três botões invisíveis, um sobre o outro e um pouco maiores que o cartão (que
  // corta o que passa), cobrem ele inteiro, texto e barco. O rótulo é só de espaços não separáveis (o app desenharia
  // por cima do texto qualquer letra dele).
  const botoes = (await ui.findAll({ type: 'Button' })).filter(b => String(b.props.key ?? '').startsWith('clique-'))
  expect(botoes.length).toBe(9)
  for (const parte of ['1', '2', '3']) {
    const botao = await ui.find({ key: `clique-outra-esperando-${parte}` })
    expect(botao?.type).toBe('Button')
    expect(botao?.props.plain).toBe(true)
    expect(String(botao?.props.label)).toMatch(/^\u00a0+$/)
  }
  await ui.unmount()
})

test('sem os arquivos do app, o clique no cartão não abre nem roda nada', async ($, on) => {
  const m = preparar(on)
  gravarOutra(m, { id: 'outra', titulo: 'Outra sessão', estado: 'livre' })
  await $.session.start(INICIO)
  const antes = m.comandos.length

  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  for (const parte of ['1', '2', '3']) await ui.press({ key: `clique-outra-${parte}` })
  await ui.unmount()
  expect(m.paineis).toEqual([])
  expect(m.comandos.length).toBe(antes)
})

test('com o movimento ligado, a cena e os barcos se mexem; desligado, ficam no primeiro quadro', async ($, on) => {
  const m = preparar(on, { guardado: { ajustes: { movimento: false } } })
  gravarOutra(m, { id: 'outra', estado: 'esperando' })
  await $.session.start(INICIO)

  let ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  let svgs = await ui.findAll({ type: 'Svg' })
  expect(svgs.length).toBe(3)
  for (const s of svgs) {
    expect(s.props.isInteractive).toBeFalsy()
    expect(String(s.props.source)).not.toContain('<animate')
  }
  await ui.press({ key: 'ajustes' })
  await ui.select({ key: 'ajuste-movimento', value: 'sim' })
  await ui.unmount()

  ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  svgs = await ui.findAll({ type: 'Svg' })
  for (const s of svgs) expect(s.props.isInteractive).toBe(true)
  await ui.unmount()
})

test('no terminal, o painel não tem desenho nenhum', async ($, on) => {
  const m = preparar(on)
  gravarOutra(m, { id: 'outra', estado: 'esperando' })
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  expect(await ui.findAll({ type: 'Svg' })).toEqual([])
  await ui.unmount()
})

test('os ajustes abrem recolhidos: o botão Ajustes os mostra e esconde, nas duas superfícies', async ($, on) => {
  const m = preparar(on)
  await $.session.start(INICIO)

  for (const surface of SUPERFICIES) {
    const ui = await $.ui.mount({ ...PAINEL, surface })
    expect(await ui.find({ key: 'ajuste-na-faixa' })).toBeUndefined()
    await ui.press({ key: 'ajustes' })
    expect(await ui.find({ key: 'ajuste-na-faixa' })).toBeDefined()
    await ui.press({ key: 'ajustes' })
    expect(await ui.find({ key: 'ajuste-na-faixa' })).toBeUndefined()
    await ui.unmount()
  }
  expect(m.paineis).toEqual([])
})

test('ao fechar o painel, os ajustes voltam a abrir recolhidos', async ($, on) => {
  preparar(on)
  await $.session.start(INICIO)

  let ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  await ui.press({ key: 'ajustes' })
  await ui.press({ key: 'fechar' })
  await ui.unmount()

  ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  expect(await ui.find({ key: 'ajuste-na-faixa' })).toBeUndefined()
  await ui.unmount()
})

test('o cartão "Som" desliga cada som: a escolha vale ao abrir de novo e cala a próxima virada', async ($, on) => {
  const m = preparar(on)
  on('tool.call', () => ({ deny: 'respondida no teste' }))
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  await ui.press({ key: 'ajustes' })
  await ui.select({ key: somDoAjuste('esperando'), value: 'nao' })
  await ui.select({ key: somDoAjuste('nao-visto'), value: 'nao' })
  await ui.unmount()

  // Aberto de novo (os ajustes seguem abertos: o painel não foi fechado), os dois aparecem desligados.
  const outra = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  expect((await outra.find({ key: somDoAjuste('esperando') }))?.props.value).toBe('nao')
  expect((await outra.find({ key: somDoAjuste('nao-visto') }))?.props.value).toBe('nao')
  await outra.unmount()

  await $.prompt.submit({ text: 'oi' } as never)
  await $.tool.call({ tool: 'AskUserQuestion', tool_use_id: 'pergunta-1', input: { questions: [] } } as never)
  expect(m.sons).toEqual([])
})

type Caixa = { props: Record<string, unknown> }
const caixas = async (ui: { findAll: (q: { type: 'Box' }) => Promise<Caixa[]> }) => (await ui.findAll({ type: 'Box' })).map(b => b.props)

test('no app, o cartão desta sessão tem o aspecto de aba selecionada: a barra à esquerda, na cor do estado, e o fundo mais forte', async ($, on) => {
  const m = preparar(on)
  gravarOutra(m, { id: 'outra', estado: 'livre' })
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  const bs = await caixas(ui)
  const aba = bs.filter(b => String(b.key ?? '').startsWith('aba-'))
  // A barra na cor cheia do estado do cartão (aqui, o livre), não na do texto.
  expect(aba.map(b => [b.key, b.backgroundColor])).toEqual([['aba-sessao-exemplo-1', '#6F8E9A']])
  const minha = bs.find(b => b.key === 'cartao-sessao-exemplo-1')
  const outra = bs.find(b => b.key === 'cartao-outra')
  expect(minha?.backgroundColor).not.toBe(outra?.backgroundColor)
  await ui.unmount()
})

test('no app, o resumo no topo conta só o que pede atenção ou está em curso: sem o livre e sem o sem sinal', async ($, on) => {
  const m = preparar(on)
  gravarOutra(m, { id: 'a', estado: 'esperando' })
  gravarOutra(m, { id: 'b', estado: 'pergunta' })
  gravarOutra(m, { id: 'c', estado: 'pergunta' })
  gravarOutra(m, { id: 'd', estado: 'trabalhando' })
  gravarOutra(m, { id: 'e', estado: 'livre', respondeuEm: AGORA })
  gravarOutra(m, { id: 'f', estado: 'trabalhando', vivoEm: AGORA - 10 * 60_000 })
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  const t = await textos(ui)
  expect(t.filter(x => /^\d+ /.test(x))).toEqual(['1 Esperando', '2 Perguntas', '1 Trabalhando'])
  await ui.unmount()
})

test('no app, o "esta sessão" da linha de baixo sai em negrito', async ($, on) => {
  preparar(on)
  await $.session.start(INICIO)
  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  const esta = (await ui.findAll({ type: 'Text' })).find(t => t.text === ' · esta sessão')
  expect(esta?.props.bold).toBe(true)
  await ui.unmount()
})

test('a espera longa: depois de 5 min esperando, o tempo sai em vermelho e negrito no app, e em negrito sublinhado no terminal', async ($, on) => {
  const m = preparar(on)
  gravarOutra(m, { id: 'longa', estado: 'esperando', desde: AGORA - 7 * 60_000 })
  gravarOutra(m, { id: 'curta', estado: 'esperando', desde: AGORA - 3 * 60_000 })
  await $.session.start(INICIO)

  const app = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  let ts = await app.findAll({ type: 'Text' })
  const noApp = ts.find(t => t.text === 'há 7 min')
  expect([noApp?.props.bold, noApp?.props.color]).toEqual([true, '#C9433A'])
  expect(ts.some(t => t.text === 'há 3 min')).toBe(false)
  await app.unmount()

  const ui = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  ts = await ui.findAll({ type: 'Text' })
  const noTerminal = ts.find(t => t.text === 'há 7 min')
  expect([noTerminal?.props.bold, noTerminal?.props.underline]).toEqual([true, true])
  expect(ts.some(t => t.text === 'há 3 min')).toBe(false)
  await ui.unmount()
})

test('nos ajustes, a "Intensidade de avisos" (padrão ou alta) nas duas superfícies, e o volume no cartão Som', async ($, on) => {
  const m = preparar(on)
  await $.session.start(INICIO)

  const terminal = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  await terminal.press({ key: 'ajustes' })
  expect(await terminal.find({ key: 'ajuste-intensidade' })).toBeDefined()
  expect(await terminal.find({ key: 'ajuste-volume' })).toBeDefined()
  await terminal.unmount()

  // O bloco de ajustes segue aberto (ele vale para os dois painéis).
  const app = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  await app.select({ key: 'ajuste-intensidade', value: 'alta' })
  await app.select({ key: 'ajuste-volume', value: 'medio' })
  await app.unmount()
  expect(m.guardado.ajustes).toEqual(expect.objectContaining({ intensidade: 'alta', volume: 'medio' }))
})


type SvgAchado = { props: Record<string, unknown> }
const barcoDe = async (ui: { findAll: (q: { type: 'Svg' }) => Promise<SvgAchado[]> }, alt: string) =>
  (await ui.findAll({ type: 'Svg' })).filter(s => s.props.alt === alt).map(s => String(s.props.source))
const bordaDe = async (ui: { findAll: (q: { type: 'Box' }) => Promise<SvgAchado[]> }, id: string) =>
  (await ui.findAll({ type: 'Box' })).find(b => b.props.key === `cartao-${id}`)?.props.borderColor

test('um relógio só no painel do app (aqui na Alta): a borda do esperando e os barcos piscam juntos, a cada 0,6 s', async ($, on) => {
  const m = preparar(on, { guardado: { ajustes: { intensidade: 'alta' } } })
  gravarOutra(m, { id: 'espera-1', estado: 'esperando' })
  gravarOutra(m, { id: 'espera-2', estado: 'esperando' })
  await $.session.start({ ...INICIO, surface: 'desktop' })
  await $.command.run({ command: 'farol' } as never)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  const antes = { borda: await bordaDe(ui, 'espera-1'), barcos: await barcoDe(ui, 'Barco: Esperando') }
  // Os dois barcos no mesmo desenho, sem animação própria.
  expect(new Set(antes.barcos).size).toBe(1)
  expect(antes.barcos[0]).not.toContain('<animate')
  await m.avancar(600)
  const depois = { borda: await bordaDe(ui, 'espera-1'), barcos: await barcoDe(ui, 'Barco: Esperando') }
  expect(depois.borda).not.toBe(antes.borda)
  expect(new Set(depois.barcos).size).toBe(1)
  expect(depois.barcos[0]).not.toBe(antes.barcos[0])
  await m.avancar(600)
  expect(await bordaDe(ui, 'espera-1')).toBe(antes.borda)
  // A borda que pisca é a do próprio cartão, sem desenho por cima dela.
  expect((await ui.findAll({ type: 'Svg' })).some(s => String(s.props.alt).startsWith('Borda'))).toBe(false)
  await ui.unmount()
})

for (const [nome, ajustes] of [
  ['no padrão com o movimento desligado', { intensidade: 'padrao', movimento: false }],
  ['na Alta com o movimento desligado', { intensidade: 'alta', movimento: false }],
] as const) {
  test(`${nome}, o painel não tem relógio: a borda fica parada`, async ($, on) => {
    const m = preparar(on, { guardado: { ajustes } })
    gravarOutra(m, { id: 'espera', estado: 'esperando' })
    await $.session.start({ ...INICIO, surface: 'desktop' })
    await $.command.run({ command: 'farol' } as never)
    const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
    const antes = await bordaDe(ui, 'espera')
    await m.avancar(600)
    expect(await bordaDe(ui, 'espera')).toBe(antes)
    await ui.unmount()
  })
}

test('no app, os selos do resumo são menores (fonte "footnote") e só o do esperando vai em negrito', async ($, on) => {
  const m = preparar(on)
  gravarOutra(m, { id: 'a', estado: 'esperando' })
  gravarOutra(m, { id: 'b', estado: 'trabalhando' })
  await $.session.start(INICIO)
  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  const selo = async (texto: string) => (await ui.findAll({ type: 'Text' })).find(t => t.text === texto)?.props
  expect([(await selo('1 Esperando'))?.size, (await selo('1 Esperando'))?.bold]).toEqual(['footnote', true])
  expect([(await selo('1 Trabalhando'))?.size, (await selo('1 Trabalhando'))?.bold]).toEqual(['footnote', undefined])
  await ui.unmount()
})

test('na Alta, o relógio liga também com o painel que já estava aberto quando o farol recarregou (sem o /farol)', async ($, on) => {
  const m = preparar(on, { guardado: { ajustes: { intensidade: 'alta' } } })
  gravarOutra(m, { id: 'espera', estado: 'esperando' })
  await $.session.start({ ...INICIO, surface: 'desktop' })
  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  const antes = await bordaDe(ui, 'espera')
  await m.avancar(600)
  expect(await bordaDe(ui, 'espera')).not.toBe(antes)
  await ui.unmount()
})

test('no padrão também, a borda do esperando e os barcos piscam pelo relógio do painel', async ($, on) => {
  const m = preparar(on)
  gravarOutra(m, { id: 'espera', estado: 'esperando' })
  await $.session.start({ ...INICIO, surface: 'desktop' })
  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  const antes = { borda: await bordaDe(ui, 'espera'), barco: await barcoDe(ui, 'Barco: Esperando') }
  expect(antes.barco[0]).not.toContain('<animate')
  await m.avancar(600)
  expect(await bordaDe(ui, 'espera')).not.toBe(antes.borda)
  expect(await barcoDe(ui, 'Barco: Esperando')).not.toEqual(antes.barco)
  await ui.unmount()
})

test('os selos do resumo do app não têm espaço vertical dentro da borda', async ($, on) => {
  const m = preparar(on)
  gravarOutra(m, { id: 'a', estado: 'esperando' })
  await $.session.start(INICIO)
  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  const selo = (await ui.findAll({ type: 'Box' })).find(b => b.props.key === 'resumo-esperando')
  expect(selo?.props.paddingY).toBe(0)
  await ui.unmount()
})

test('o botão "Esconder ajustes", com o bloco aberto, tem o destaque forte (primary); fechado, fica apagado', async ($, on) => {
  preparar(on)
  await $.session.start(INICIO)
  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  const botao = async () => (await ui.find({ key: 'ajustes' }))?.props
  expect([(await botao())?.variant, (await botao())?.dimColor]).toEqual([undefined, true])
  await ui.press({ key: 'ajustes' })
  expect([(await botao())?.variant, (await botao())?.dimColor]).toEqual(['primary', undefined])
  await ui.unmount()
})
