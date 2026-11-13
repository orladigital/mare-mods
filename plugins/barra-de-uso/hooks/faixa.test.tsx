import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const FAIXA = {
  plugin: 'barra-de-uso',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 10, bodyColumns: 140, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const
const SUPERFICIES = ['terminal', 'desktop'] as const

// Por baixo da faixa não há nada: este hook faz o papel do Claude Code (e de outros mods).
const nadaPorBaixo = (on: On) =>
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })

test('no app, o botão Explain só aparece com um pedido de permissão aberto', async ($, on) => {
  mock.clock(on)
  on('classic.PermissionRequest', () => ({}))
  nadaPorBaixo(on)

  let ui = await $.ui.mount({ ...FAIXA, surface: 'desktop' })
  expect(await ui.find({ key: 'explicar' })).toBeUndefined()
  await ui.unmount()

  await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'ls' } })

  ui = await $.ui.mount({ ...FAIXA, surface: 'desktop' })
  expect((await ui.find({ key: 'explicar' }))?.text).toBe('🐚 Explain')
  await ui.unmount()
})

// O painel do ⚓: o teste faz o papel do Claude Code ao abrir e fechar painéis.
const AJUSTES = {
  plugin: 'barra-de-uso',
  component: 'Pane',
  requestId: 'barra-de-uso-ajustes',
  props: { title: 'Ajustes da barra', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} },
} as const
const paineis = (on: On) => {
  const abertos: string[] = []
  on('ui.open', (_, e) => {
    abertos.push(e.id)
    return { value: { isPlaced: true } }
  })
  on('ui.close', (_, e) => {
    abertos.push(`fechou ${e.id}`)
    return { value: undefined }
  })
  return abertos
}

test('o ⚓ abre o painel de ajustes; clicar de novo, ou em Fechar, fecha', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  const abertos = paineis(on)
  nadaPorBaixo(on)

  const faixa = await $.ui.mount({ ...FAIXA, surface: 'desktop' })
  await faixa.press({ key: 'menu' })
  await faixa.press({ key: 'menu' })
  await faixa.press({ key: 'menu' })
  await faixa.unmount()

  const painel = await $.ui.mount({ ...AJUSTES, surface: 'desktop' })
  await painel.press({ key: 'fechar-ajustes' })
  await painel.unmount()

  expect(abertos).toEqual([
    'barra-de-uso-ajustes',
    'fechou barra-de-uso-ajustes',
    'barra-de-uso-ajustes',
    'fechou barra-de-uso-ajustes',
  ])
})

test('no terminal não há Explain nem ola: nem o botão na faixa, nem os ajustes no painel', async ($, on) => {
  mock.clock(on)
  on('classic.PermissionRequest', () => ({}))
  nadaPorBaixo(on)
  await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'ls' } })

  const faixa = await $.ui.mount({ ...FAIXA, surface: 'terminal' })
  expect(await faixa.find({ key: 'explicar' })).toBeUndefined()
  await faixa.unmount()

  const painel = await $.ui.mount({ ...AJUSTES, surface: 'terminal' })
  expect(await painel.find({ key: 'ajuste-semana' })).toBeDefined()
  expect(await painel.find({ key: 'ajuste-ola' })).toBeUndefined()
  expect(await painel.find({ key: 'ajuste-explain' })).toBeUndefined()
  await painel.unmount()
})

test('o 📋 começa desligado; o painel liga o 📋 e desliga o Explain', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  on('classic.PermissionRequest', () => ({}))
  nadaPorBaixo(on)
  await $.classic.PermissionRequest({ tool_name: 'Bash', tool_input: { command: 'ls' } })

  let faixa = await $.ui.mount({ ...FAIXA, surface: 'desktop' })
  expect(await faixa.find({ key: 'copiar-cmd' })).toBeUndefined()
  expect(await faixa.find({ key: 'explicar' })).toBeDefined()
  await faixa.unmount()

  const painel = await $.ui.mount({ ...AJUSTES, surface: 'desktop' })
  expect((await painel.find({ key: 'ajuste-ola' }))?.props.value).toBe('ligada')
  await painel.select({ key: 'ajuste-copiar', value: 'sim' })
  await painel.select({ key: 'ajuste-explain', value: 'nao' })
  await painel.unmount()

  faixa = await $.ui.mount({ ...FAIXA, surface: 'desktop' })
  expect(await faixa.find({ key: 'copiar-cmd' })).toBeDefined()
  expect(await faixa.find({ key: 'explicar' })).toBeUndefined()
  await faixa.unmount()
})

test('antes da 1ª resposta, a faixa mostra "Contexto …" em vez de sumir com a barra', async ($, on) => {
  mock.clock(on)
  nadaPorBaixo(on)

  for (const surface of SUPERFICIES) {
    const ui = await $.ui.mount({ ...FAIXA, surface })
    expect(await ui.find({ type: 'Text', text: /Contexto/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '…' })).toBeDefined()
    expect(await ui.find({ type: 'Svg' })).toBeUndefined()
    await ui.unmount()
  }
})

test('no app a praia é um SVG; no terminal, texto', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: Date.parse('2026-10-09T15:00:00Z') })
  on('session.measure', () => ({ changed: [] }))
  nadaPorBaixo(on)
  await $.session.measure({ changed: [], rateLimits: [], context: { window: 200_000, tokens: 100_000, percent: 50 } })

  const app = await $.ui.mount({ ...FAIXA, surface: 'desktop' })
  expect((await app.find({ type: 'Svg' }))?.props.alt).toBe('Contexto em 50%')
  await app.unmount()

  const terminal = await $.ui.mount({ ...FAIXA, surface: 'terminal' })
  expect(await terminal.find({ type: 'Svg' })).toBeUndefined()
  expect(await terminal.find({ type: 'Text', text: /Contexto/ })).toBeDefined()
  await terminal.unmount()
})

test('no terminal, as barras são paradas: nada muda com o tempo nem depois da resposta', async ($, on) => {
  mock.store(on)
  const relogio = mock.clock(on, { now: Date.parse('2026-10-09T15:00:00Z') })
  on('session.measure', () => ({ changed: [] }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  nadaPorBaixo(on)
  await $.session.measure({ changed: [], rateLimits: [], context: { window: 200_000, tokens: 100_000, percent: 50 } })

  const cores = async () => {
    const ui = await $.ui.mount({ ...FAIXA, surface: 'terminal' })
    const c = (await ui.findAll({ type: 'Text' })).filter(t => t.text === '▄').map(t => String(t.props.color))
    await ui.unmount()
    return c.join(',')
  }

  const antes = await cores()
  expect(antes).not.toBe('')
  await $.turn.complete({ turnId: 't1', answer: 'pronto', durationMs: 1_000, isAborted: false, reason: 'answer' })
  await relogio.advance(5_000)
  expect(await cores()).toBe(antes)
})

const MEDICAO = {
  changed: [],
  rateLimits: [
    { kind: 'five_hour', percentUsed: 26, resetsAt: '2026-10-09T20:10:00Z' },
    { kind: 'seven_day', percentUsed: 82, resetsAt: '2026-10-13T07:00:00Z' },
  ],
  context: { window: 200_000, tokens: 74_000, percent: 37 },
}

test('no app: praia e pôr do sol com a mesma largura; a semana só em número, até o ⚓ pedir a barra', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: Date.parse('2026-10-09T15:00:00Z') })
  on('session.measure', () => ({ changed: [] }))
  nadaPorBaixo(on)
  await $.session.measure(MEDICAO)

  let ui = await $.ui.mount({ ...FAIXA, surface: 'desktop' })
  const desenhos = await ui.findAll({ type: 'Svg' })
  expect(desenhos.map(d => d.props.alt)).toEqual(['Contexto em 37%', 'Janela de 5h em 26%'])
  expect(desenhos.map(d => d.props.width)).toEqual([96, 96])
  expect(await ui.find({ type: 'Text', text: '82%' })).toBeDefined()
  await ui.unmount()

  const painel = await $.ui.mount({ ...AJUSTES, surface: 'desktop' })
  await painel.select({ key: 'ajuste-semana', value: 'barra' })
  await painel.unmount()

  ui = await $.ui.mount({ ...FAIXA, surface: 'desktop' })
  expect((await ui.findAll({ type: 'Svg' })).map(d => d.props.alt)).toContain('Semana em 82%')
  await ui.unmount()

  const painel2 = await $.ui.mount({ ...AJUSTES, surface: 'desktop' })
  await painel2.select({ key: 'ajuste-semana', value: 'escondida' })
  await painel2.unmount()

  ui = await $.ui.mount({ ...FAIXA, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: '82%' })).toBeUndefined()
  await ui.unmount()
})

test('no app, as barras encolhem com a faixa estreita', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: Date.parse('2026-10-09T15:00:00Z') })
  on('session.measure', () => ({ changed: [] }))
  nadaPorBaixo(on)
  await $.session.measure(MEDICAO)

  const ui = await $.ui.mount({ ...FAIXA, surface: 'desktop', props: { ...FAIXA.props, bodyColumns: 50 } })
  expect((await ui.findAll({ type: 'Svg' })).map(d => d.props.width)).toEqual([64, 64])
  await ui.unmount()
})

test('no terminal, a semana sai só em número: "Sem. 82%"', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: Date.parse('2026-10-09T15:00:00Z') })
  on('session.measure', () => ({ changed: [] }))
  nadaPorBaixo(on)
  await $.session.measure(MEDICAO)

  const ui = await $.ui.mount({ ...FAIXA, surface: 'terminal' })
  const linha = (await ui.find({ type: 'Text', text: /Sem\. 82/ }))?.text ?? ''
  expect(linha).toContain('Sem. 82%')
  expect(linha).toContain('│  5h ▄▄▄▄▄▄▄▄▄▄ 26% - 17:10')
  await ui.unmount()
})

test('o botão dos ajustes é ⚓ no app e ≡ no terminal, onde o ⚓ sai torto', async ($, on) => {
  mock.clock(on)
  nadaPorBaixo(on)
  for (const [surface, rotulo] of [['desktop', '⚓'], ['terminal', '≡']] as const) {
    const ui = await $.ui.mount({ ...FAIXA, surface })
    expect((await ui.find({ key: 'menu' }))?.text).toBe(rotulo)
    await ui.unmount()
  }
})

test('no terminal, a faixa ganha uma linha de espaço acima; no app, não', async ($, on) => {
  mock.clock(on)
  nadaPorBaixo(on)
  for (const [surface, margem] of [['terminal', 1], ['desktop', 0]] as const) {
    const ui = await $.ui.mount({ ...FAIXA, surface })
    // A partir do Claude Code 2.1.323, a primeira caixa é a do Claude Code, que empilha uma linha por mod: vale a
    // primeira com a margem.
    const comMargem = (await ui.findAll({ type: 'Box' })).find(b => b.props.marginTop !== undefined)
    expect(comMargem?.props.marginTop).toBe(margem)
    await ui.unmount()
  }
})

test('no terminal, o 📋 e o ≡ saem sem os colchetes; no app, o botão do app, como antes', async ($, on) => {
  mock.store(on)
  mock.clock(on)
  nadaPorBaixo(on)
  const painel = await $.ui.mount({ ...AJUSTES, surface: 'desktop' })
  await painel.select({ key: 'ajuste-copiar', value: 'sim' })
  await painel.unmount()

  for (const surface of SUPERFICIES) {
    const ui = await $.ui.mount({ ...FAIXA, surface })
    for (const key of ['copiar-cmd', 'menu']) {
      const botao = await ui.find({ key })
      expect(botao?.type).toBe('Button')
      expect(botao?.props.plain).toBe(surface === 'terminal' ? true : undefined)
    }
    await ui.unmount()
  }
})
