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
  for (const key of ['ajuste-na-faixa', 'ajuste-contagem', 'ajuste-movimento']) expect(await app.find({ key })).toBeDefined()
  await app.unmount()

  const terminal = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  expect(await terminal.find({ key: 'ajuste-na-faixa' })).toBeDefined()
  expect(await terminal.find({ key: 'ajuste-contagem' })).toBeUndefined()
  expect(await terminal.find({ key: 'ajuste-movimento' })).toBeUndefined()
  await terminal.unmount()
})

test('"na faixa: esconder" tira o farol da faixa, e o /farol ainda abre o painel', async ($, on) => {
  const m = preparar(on)
  await $.session.start(INICIO)

  const painel = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
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
