import { expect, test } from 'claude-code/testing'

import type { Registro } from '../types'
import { FAIXA, INICIO, gravarOutra, preparar } from './apoio-de-teste'
import type { Mundo } from './apoio-de-teste'

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
  expect(await ui.find({ type: 'Text', text: '3' })).toBeDefined()
  await ui.unmount()
})

test('no app, sem o ajuste, a torre fica sem número', async ($, on) => {
  const m = preparar(on)
  outras(m, ['esperando', 'esperando', 'esperando'])
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...FAIXA, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: '3' })).toBeUndefined()
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
