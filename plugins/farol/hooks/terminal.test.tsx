import { expect, test } from 'claude-code/testing'

import { AGORA, INICIO, PAINEL, gravarOutra, preparar } from './apoio-de-teste'

const MIN = 60_000

type Achado = { props: Record<string, unknown>; text?: string }
type Montado = { findAll: (q: { type: string }) => Promise<Achado[]> }

// As linhas de sessão do painel: os `Text` que começam por uma das quatro marcas.
const linhas = async (ui: Montado) =>
  (await ui.findAll({ type: 'Text' })).filter(t => /^(!!|>>|~ |\? )/.test(String(t.text)))

const caixas = async (ui: Montado) => (await ui.findAll({ type: 'Box' })).map(b => b.props)

test('no terminal, uma linha por sessão com a marca, o estado, o tempo, a pasta e o título, pela prioridade', async ($, on) => {
  const m = preparar(on)
  gravarOutra(m, { id: 'livre', titulo: 'Revisar o PR', estado: 'livre', desde: AGORA - 70 * MIN })
  gravarOutra(m, { id: 'esperando', titulo: 'Escolher o tom', estado: 'esperando', desde: AGORA - 2 * MIN })
  gravarOutra(m, { id: 'trabalhando', titulo: 'Rodar os testes', estado: 'trabalhando', desde: AGORA - 5 * MIN })
  gravarOutra(m, { id: 'calada', titulo: 'Sessão travada', estado: 'trabalhando', vivoEm: AGORA - 4 * MIN })
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  expect((await linhas(ui)).map(t => t.text)).toEqual([
    '!! Esperando você · há 2 min · exemplo · Escolher o tom',
    '>> Trabalhando · há 5 min · exemplo · Rodar os testes',
    '~  Livre · agora · exemplo · esta sessão · (sem mensagem ainda)',
    '~  Livre · há 1h10 · exemplo · Revisar o PR',
    '?  Sem sinal · há 4 min · exemplo · Sessão travada',
  ])
  await ui.unmount()
})

test('no terminal, cada estado tem o seu fundo e a sua cor de texto; só o esperando leva a borda grossa', async ($, on) => {
  const m = preparar(on)
  gravarOutra(m, { id: 'esperando', estado: 'esperando' })
  gravarOutra(m, { id: 'trabalhando', estado: 'trabalhando' })
  gravarOutra(m, { id: 'calada', estado: 'livre', vivoEm: AGORA - 4 * MIN })
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  const cores = (await linhas(ui)).map(t => [String(t.text).slice(0, 2), t.props.color, t.props.bold === true])
  expect(cores).toEqual([
    ['!!', '#FFF3EF', true],
    ['>>', '#E3F4F1', false],
    ['~ ', '#E1EAE8', false],
    ['? ', '#F2F2EF', false],
  ])
  const comFundo = (await caixas(ui)).filter(b => b.backgroundColor)
  expect(comFundo.map(b => [b.backgroundColor, b.borderStyle ?? null, b.borderColor ?? null])).toEqual([
    ['#C4564D', 'bold', '#EA8F85'],
    ['#2E7A73', null, null],
    ['#4F6563', null, null],
    ['#6E7472', null, null],
  ])
  await ui.unmount()
})

test('no terminal, o título troca os símbolos de largura ambígua e corta no fim da linha, sem quebrar', async ($, on) => {
  const m = preparar(on)
  gravarOutra(m, { id: 'setas', titulo: 'De → para ◆ ⚓ ✅', estado: 'esperando' })
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  const [linha] = await linhas(ui)
  expect(linha?.text).toBe('!! Esperando você · agora · exemplo · De -> para * ~ ✅')
  expect(linha?.props.wrap).toBe('truncate-end')
  await ui.unmount()
})
