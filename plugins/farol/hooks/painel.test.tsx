import { expect, test } from 'claude-code/testing'

import { AGORA, FAIXA, INICIO, PAINEL, gravarOutra, preparar } from './apoio-de-teste'

const SUPERFICIES = ['terminal', 'desktop'] as const

const textos = async (ui: { findAll: (q: { type: 'Text' }) => Promise<{ text: string }[]> }) => (await ui.findAll({ type: 'Text' })).map(t => t.text)

test('o painel lista as sessões pela prioridade, com "pasta · tempo · estado", e marca esta sessão', async ($, on) => {
  const m = preparar(on)
  gravarOutra(m, { id: 'outra-livre', titulo: 'Revisar o PR', estado: 'livre', desde: AGORA - 7 * 60_000 })
  gravarOutra(m, { id: 'outra-esperando', titulo: 'Escolher o tom', estado: 'esperando', desde: AGORA - 2 * 60_000 })
  await $.session.start(INICIO)

  for (const surface of SUPERFICIES) {
    const ui = await $.ui.mount({ ...PAINEL, surface })
    const t = await textos(ui)
    expect(t.filter(x => / · /.test(x))).toEqual([
      'exemplo · há 2 min · Esperando',
      'exemplo · agora · Livre · esta sessão',
      'exemplo · há 7 min · Livre',
    ])
    expect(t).toContain('Escolher o tom')
    expect(t).toContain('Revisar o PR')
    await ui.unmount()
  }
})

test('a sessão sem sinal mostra há quanto tempo parou de renovar o registro', async ($, on) => {
  const m = preparar(on)
  gravarOutra(m, { id: 'calada', estado: 'trabalhando', desde: AGORA - 60 * 60_000, vivoEm: AGORA - 5 * 60_000 })
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
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

test('no app, os três ajustes; no terminal, só "na faixa" (lá não há contagem opcional nem movimento)', async ($, on) => {
  preparar(on)
  await $.session.start(INICIO)

  const app = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  await app.press({ key: 'ajustes' })
  for (const key of ['ajuste-na-faixa', 'ajuste-contagem', 'ajuste-movimento']) expect(await app.find({ key })).toBeDefined()
  await app.press({ key: 'fechar' })
  await app.unmount()

  const terminal = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  await terminal.press({ key: 'ajustes' })
  expect(await terminal.find({ key: 'ajuste-na-faixa' })).toBeDefined()
  expect(await terminal.find({ key: 'ajuste-contagem' })).toBeUndefined()
  expect(await terminal.find({ key: 'ajuste-movimento' })).toBeUndefined()
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
