import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { Registro } from '../types'
import { FAIXA, INICIO, gravarOutra, preparar } from './apoio-de-teste'
import type { Mundo } from './apoio-de-teste'
import { torreSvg } from './faixa'

// Outras sessões abertas na máquina, uma por estado.
const outras = (m: Mundo, estados: Registro['estado'][]) =>
  estados.forEach((estado, i) => gravarOutra(m, { id: `outra-${i}`, titulo: `Sessão ${i}`, estado }))

test('no terminal, a faixa mostra 🚦 sem aviso e 🚨 N com sessões esperando', async ($, on) => {
  const m = preparar(on)
  outras(m, ['trabalhando', 'livre'])
  await $.session.start(INICIO)

  let ui = await $.ui.mount({ ...FAIXA, surface: 'terminal' })
  expect((await ui.find({ key: 'abrir-farol' }))?.text).toBe('🚦')
  await ui.unmount()

  outras(m, ['esperando', 'esperando'])
  await m.avancar(5_000)
  ui = await $.ui.mount({ ...FAIXA, surface: 'terminal' })
  expect((await ui.find({ key: 'abrir-farol' }))?.text).toBe('🚨 2')
  // Sem os colchetes: o foco e o mouse ainda invertem o botão.
  expect((await ui.find({ key: 'abrir-farol' }))?.props.plain).toBe(true)
  // O número em negrito na cor de erro do tema, sem animação; o clique vale no botão inteiro.
  const numero = await ui.find({ type: 'Text', text: '2' })
  expect([numero?.props.bold, numero?.props.color]).toEqual([true, 'error'])
  expect(await ui.find({ type: 'Svg' })).toBeUndefined()
  await ui.unmount()
})

test('no app, a torre é um SVG e o feixe acende vermelho com uma sessão esperando', async ($, on) => {
  const m = preparar(on)
  outras(m, ['livre'])
  await $.session.start(INICIO)

  let ui = await $.ui.mount({ ...FAIXA, surface: 'desktop' })
  let torre = await ui.find({ type: 'Svg' })
  expect(torre?.props.alt).toBe('Farol: nenhuma sessão esperando você')
  // Uma área próxima da dos outros botões da faixa (o ⚓ e o 📋 da barra de uso).
  expect([torre?.props.width, torre?.props.height]).toEqual([34, 24])
  expect(String(torre?.props.source)).not.toContain('class="v"')
  expect(await ui.find({ key: 'abrir-farol' })).toBeDefined()
  await ui.unmount()

  outras(m, ['esperando'])
  await m.avancar(5_000)
  ui = await $.ui.mount({ ...FAIXA, surface: 'desktop' })
  torre = await ui.find({ type: 'Svg' })
  expect(torre?.props.alt).toBe('Farol: 1 sessão esperando você')
  expect(String(torre?.props.source)).toContain('class="v"')
  await ui.unmount()
})

test('no app, a contagem só aparece com o ajuste ligado', async ($, on) => {
  const m = preparar(on, { guardado: { ajustes: { contagem: true } } })
  outras(m, ['esperando', 'esperando', 'esperando'])
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...FAIXA, surface: 'desktop' })
  // O número é um botão próprio, com ele mesmo de rótulo: o botão invisível da torre cobre só a torre, com um
  // rótulo que cabe nela (um rótulo maior faz o app mostrar "…").
  const numero = await ui.find({ key: 'abrir-farol-numero' })
  expect(numero?.type).toBe('Button')
  expect(numero?.props.label).toBe('3')
  expect(String((await ui.find({ key: 'abrir-farol' }))?.props.label)).toMatch(/^ {9}$/)
  await ui.press({ key: 'abrir-farol-numero' })
  await ui.unmount()
  expect(m.paineis).toEqual(['farol'])
})

test('no app, sem o ajuste, a torre fica sem número', async ($, on) => {
  const m = preparar(on)
  outras(m, ['esperando', 'esperando', 'esperando'])
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...FAIXA, surface: 'desktop' })
  expect(await ui.find({ key: 'abrir-farol-numero' })).toBeUndefined()
  await ui.unmount()
})

test('um clique na faixa abre o painel, no terminal e no app', async ($, on) => {
  const m = preparar(on)
  await $.session.start(INICIO)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...FAIXA, surface })
    await ui.press({ key: 'abrir-farol' })
    await ui.unmount()
  }
  expect(m.paineis).toEqual(['farol', 'farol'])
})

test('com o ajuste "na faixa: esconder", o farol sai da faixa nas duas superfícies', async ($, on) => {
  preparar(on, { guardado: { ajustes: { naFaixa: 'esconder' } } })
  await $.session.start(INICIO)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...FAIXA, surface })
    expect(await ui.find({ key: 'abrir-farol' })).toBeUndefined()
    await ui.unmount()
  }
})

test('no app, com sessão esperando e o movimento ligado, a torre pisca', async ($, on) => {
  const m = preparar(on)
  outras(m, ['esperando'])
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...FAIXA, surface: 'desktop' })
  const torre = await ui.find({ type: 'Svg' })
  expect(torre?.props.isInteractive).toBe(true)
  expect(String(torre?.props.source)).toMatch(/<g class="v"[^>]*>\s*<animate attributeName="opacity"/)
  await ui.unmount()
})

test('no app, com o movimento desligado, a torre vermelha fica parada', async ($, on) => {
  const m = preparar(on, { guardado: { ajustes: { movimento: false } } })
  outras(m, ['esperando'])
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...FAIXA, surface: 'desktop' })
  const torre = await ui.find({ type: 'Svg' })
  expect(torre?.props.isInteractive).toBeFalsy()
  expect(String(torre?.props.source)).toContain('class="v"')
  expect(String(torre?.props.source)).not.toContain('<animate')
  await ui.unmount()
})

test('a torre azul (só não visto) não pisca', async () => {
  expect(torreSvg('azul', true)).not.toContain('<animate')
  expect(torreSvg('vermelha', true)).toContain('<animate')
  expect(torreSvg('vermelha', false)).not.toContain('<animate')
})

// A partir do Claude Code 2.1.323, cada mod desenha a própria linha da faixa e o Claude Code as empilha
// (`AbovePromptList`). Aqui, a linha do farol e a de outro mod (como a barra de uso), em dado puro.
type No = { type?: string; props?: Record<string, unknown>; children?: unknown[] }
const OUTRO: No = { type: 'Text', props: {}, children: ['barra de outro mod'] }
const LINHAS = (rows: { plugin: string; tree: No }[], surface: 'terminal' | 'desktop') => ({
  plugin: 'farol',
  surface,
  component: 'AbovePromptList',
  props: { ...FAIXA.props, rows },
}) as never

// Monta a lista das linhas da faixa. Antes da 2.1.323 (a versão mínima do CI é anterior), o componente não existe e o
// farol segue no arranjo antigo, que os outros testes da faixa cobrem: aqui não há o que conferir, e o teste para
// sem conferir nada. Qualquer outro erro derruba o teste.
const montarLinhas = async ($: Engine, alvo: ReturnType<typeof LINHAS>) => {
  try {
    return await $.ui.mount(alvo)
  } catch (erro) {
    if (!/is not a component/.test(String(erro))) throw erro
    return null
  }
}

const contem = (no: unknown, achou: (n: No) => boolean): boolean => {
  const n = no as No
  return achou(n) || (n.children ?? []).some(f => typeof f === 'object' && f !== null && contem(f, achou))
}
const ehFarol = (n: No) => n.props?.key === 'abrir-farol'
const ehOutro = (n: No) => n === OUTRO || (n.type === 'Text' && (n.children ?? []).includes('barra de outro mod'))

for (const surface of ['terminal', 'desktop'] as const) {
  test(`no ${surface === 'terminal' ? 'terminal' : 'app'}, o farol fica na mesma linha dos outros mods, à esquerda`, async ($, on) => {
    preparar(on)
    await $.session.start(INICIO)
    const linhaDoFarol = await $.ui.mount({ ...FAIXA, surface })
    const farol = (await linhaDoFarol.drawn()) as No
    await linhaDoFarol.unmount()

    const ui = await montarLinhas($, LINHAS([{ plugin: 'farol', tree: farol }, { plugin: 'barra-de-uso', tree: OUTRO }], surface))
    if (!ui) return
    const arvore = (await ui.drawn()) as No
    // Uma linha: o farol num filho, o outro mod num filho depois dele.
    expect(arvore.props?.flexDirection).toBe('row')
    const filhos = arvore.children ?? []
    const iFarol = filhos.findIndex(f => contem(f, ehFarol))
    const iOutro = filhos.findIndex(f => contem(f, ehOutro))
    expect(iFarol).toBeGreaterThanOrEqual(0)
    expect(iOutro).toBeGreaterThan(iFarol)
    expect(await ui.findAll({ key: 'abrir-farol' })).toHaveLength(1)
    await ui.unmount()
  })
}

test('com o farol escondido da faixa, ficam só as linhas dos outros mods', async ($, on) => {
  preparar(on, { guardado: { ajustes: { naFaixa: 'esconder' } } })
  await $.session.start(INICIO)
  const ui = await montarLinhas($, LINHAS([{ plugin: 'barra-de-uso', tree: OUTRO }], 'terminal'))
  if (!ui) return
  expect(await ui.findAll({ key: 'abrir-farol' })).toHaveLength(0)
  expect(JSON.stringify(await ui.drawn())).toContain('barra de outro mod')
  await ui.unmount()
})
