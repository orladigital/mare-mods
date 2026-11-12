import { expect, test } from 'claude-code/testing'

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
