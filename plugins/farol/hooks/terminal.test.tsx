import { expect, test } from 'claude-code/testing'

import { AGORA, ID, INICIO, PAINEL, gravarOutra, preparar } from './apoio-de-teste'

const MIN = 60_000

type Achado = { props: Record<string, unknown>; text?: string }
type Montado = { findAll: (q: { type: string }) => Promise<Achado[]> }

const textos = async (ui: Montado) => (await ui.findAll({ type: 'Text' })).map(t => String(t.text))
const caixas = async (ui: Montado) => (await ui.findAll({ type: 'Box' })).map(b => b.props)
const texto = async (ui: Montado, conteudo: string) => (await ui.findAll({ type: 'Text' })).find(t => t.text === conteudo)

// Uma de cada, mais um livre: o painel do terminal com todos os estados.
const umaDeCada = (m: ReturnType<typeof preparar>) => {
  gravarOutra(m, { id: 'livre', titulo: 'Revisar o PR', estado: 'livre', desde: AGORA - 70 * MIN })
  gravarOutra(m, { id: 'esperando', titulo: 'Escolher o tom', estado: 'esperando', desde: AGORA - 2 * MIN })
  gravarOutra(m, { id: 'trabalhando', titulo: 'Rodar os testes', estado: 'trabalhando', desde: AGORA - 5 * MIN })
  gravarOutra(m, { id: 'calada', titulo: 'Sessão travada', estado: 'trabalhando', vivoEm: AGORA - 4 * MIN })
  gravarOutra(m, { id: 'antiga', pasta: 'outra', estado: 'livre', vivoEm: AGORA - 35 * MIN })
}

test('no terminal: o resumo por estado no topo, um cartão por sessão e as sem sinal juntas numa linha no fim', async ($, on) => {
  const m = preparar(on)
  umaDeCada(m)
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  expect(await textos(ui)).toEqual([
    '1 Esperando',
    '1 Trabalhando',
    '2 Livres',
    'Escolher o tom',
    'exemplo · há 2 min · Esperando você',
    'Rodar os testes',
    'exemplo · há 5 min · Trabalhando',
    '(sem mensagem ainda)',
    'exemplo · agora · Livre · esta sessão',
    'exemplo · agora · Livre',
    ' · esta sessão',
    'Revisar o PR',
    'exemplo · há 1h10 · Livre',
    '2 sessões sem sinal · há 4 min a 35 min · exemplo, outra',
  ])
  await ui.unmount()
})

test('no terminal, o resumo só mostra os estados que têm sessão, e uma sessão sem sinal diz o tempo dela', async ($, on) => {
  const m = preparar(on)
  gravarOutra(m, { id: 'calada', estado: 'livre', vivoEm: AGORA - 4 * MIN })
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  const t = await textos(ui)
  expect(t[0]).toBe('1 Livre')
  expect(t).not.toContain('1 Esperando')
  expect(t).not.toContain('1 Trabalhando')
  expect(t.at(-1)).toBe('1 sessão sem sinal · há 4 min · exemplo')
  expect((await texto(ui, '1 sessão sem sinal · há 4 min · exemplo'))?.props.dimColor).toBe(true)
  await ui.unmount()
})

test('no terminal: fundo cheio só no esperando (com a borda grossa) e no trabalhando; o livre leva só uma borda clara', async ($, on) => {
  const m = preparar(on)
  umaDeCada(m)
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  const cartoes = (await caixas(ui)).filter(b => String(b.key ?? '').startsWith('cartao-'))
  expect(cartoes.map(b => [b.key, b.backgroundColor ?? null, b.borderStyle ?? null, b.borderColor ?? null])).toEqual([
    ['cartao-esperando', '#C4564D', 'bold', '#EA8F85'],
    ['cartao-trabalhando', '#2E7A73', 'round', '#2E7A73'],
    ['cartao-sessao-exemplo-1', '#2F3A42', 'double', '#9DB4BE'],
    ['cartao-livre', null, 'round', '#9DB4BE'],
  ])
  expect((await texto(ui, 'Escolher o tom'))?.props.color).toBe('#FFF3EF')
  expect((await texto(ui, 'exemplo · há 5 min · Trabalhando'))?.props.color).toBe('#E3F4F1')
  expect((await texto(ui, 'exemplo · há 1h10 · Livre'))?.props.dimColor).toBe(true)
  await ui.unmount()
})

test('no terminal, cada estado do resumo tem fundo claro e borda na cor dele', async ($, on) => {
  const m = preparar(on)
  umaDeCada(m)
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  const resumo = (await caixas(ui)).filter(b => String(b.key ?? '').startsWith('resumo-'))
  expect(resumo.map(b => [b.key, b.backgroundColor, b.borderStyle, b.borderColor])).toEqual([
    ['resumo-esperando', '#F6D3CE', 'round', '#C4564D'],
    ['resumo-trabalhando', '#CFEAE6', 'round', '#2E7A73'],
    ['resumo-livre', '#DCE5E4', 'round', '#4F6563'],
  ])
  expect((await texto(ui, '1 Esperando'))?.props.color).toBe('#8A2A22')
  await ui.unmount()
})

test('no terminal, uma linha em branco separa as abas do painel; os cartões vão colados, cada um na sua borda', async ($, on) => {
  const m = preparar(on)
  gravarOutra(m, { id: 'outra' })
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  const [painel] = await caixas(ui)
  expect(painel?.marginTop).toBe(1)
  const cartoes = (await caixas(ui)).find(b => b.key === 'cartoes')
  expect(cartoes?.gap ?? 0).toBe(0)
  for (const b of (await caixas(ui)).filter(x => String(x.key ?? '').startsWith('cartao-'))) expect(b.borderStyle).toBeDefined()
  await ui.unmount()
})

test('no terminal, o título troca os símbolos de largura ambígua e corta no fim da linha, sem quebrar', async ($, on) => {
  const m = preparar(on)
  gravarOutra(m, { id: 'setas', titulo: 'De → para ◆ ⚓ ✅', estado: 'esperando' })
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  const titulo = await texto(ui, 'De -> para * ~ ✅')
  expect(titulo?.props.wrap).toBe('truncate-end')
  expect((await texto(ui, 'exemplo · agora · Esperando você'))?.props.wrap).toBe('truncate-end')
  await ui.unmount()
})

test('no terminal, o cartão desta sessão tem borda dupla e "esta sessão" em negrito, sem o apagado do resto', async ($, on) => {
  const m = preparar(on)
  gravarOutra(m, { id: 'outra' })
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  const minha = (await caixas(ui)).find(b => b.key === `cartao-${ID}`)
  expect([minha?.borderStyle, minha?.borderColor]).toEqual(['double', '#9DB4BE'])
  // Um fundo bem leve, só nele: sem o tema do Claude Code, o do escuro.
  expect(minha?.backgroundColor).toBe('#2F3A42')
  const outra = (await caixas(ui)).find(b => b.key === 'cartao-outra')
  expect([outra?.borderStyle, outra?.backgroundColor ?? null]).toEqual(['round', null])
  const esta = await texto(ui, ' · esta sessão')
  expect(esta?.props.bold).toBe(true)
  expect(esta?.props.dimColor).toBeFalsy()
  expect((await texto(ui, 'exemplo · agora · Livre'))?.props.dimColor).toBe(true)
  await ui.unmount()
})

test('no terminal, com esta sessão esperando, o cartão fica com a borda grossa do aviso', async ($, on) => {
  const m = preparar(on)
  await $.session.start(INICIO)
  // O registro desta sessão relido como esperando, na releitura seguinte.
  gravarOutra(m, { id: ID, estado: 'esperando' })
  await m.avancar(5_000)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  const minha = (await caixas(ui)).find(b => b.key === `cartao-${ID}`)
  expect([minha?.borderStyle, minha?.borderColor]).toEqual(['bold', '#EA8F85'])
  expect((await texto(ui, ' · esta sessão'))?.props.bold).toBe(true)
  await ui.unmount()
})

test('no terminal, com o tema claro do Claude Code, o fundo desta sessão é o tom claro', async ($, on) => {
  const m = preparar(on)
  on('config.list', () => ({ value: [{ key: 'theme', value: 'light' }] }) as never)
  gravarOutra(m, { id: 'outra' })
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  expect((await caixas(ui)).find(b => b.key === `cartao-${ID}`)?.backgroundColor).toBe('#EFF4F6')
  await ui.unmount()
})

test('no terminal, esta sessão trabalhando ou esperando fica num tom bem mais claro do fundo do estado, com o texto escuro', async ($, on) => {
  const m = preparar(on)
  gravarOutra(m, { id: 'outra', estado: 'trabalhando' })
  await $.session.start(INICIO)

  for (const [estado, fundo, cor, doEstado] of [
    ['trabalhando', '#4FA79E', '#0B2E2A', '#2E7A73'],
    ['esperando', '#D9726A', '#3A0F0B', '#C4564D'],
  ] as const) {
    gravarOutra(m, { id: ID, estado })
    await m.avancar(5_000)
    const ui = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
    expect((await caixas(ui)).find(b => b.key === `cartao-${ID}`)?.backgroundColor).toBe(fundo)
    expect((await ui.findAll({ type: 'Text' })).find(t => t.text === ID)?.props.color).toBe(cor)
    if (estado === 'trabalhando') expect((await caixas(ui)).find(b => b.key === 'cartao-outra')?.backgroundColor).toBe(doEstado)
    await ui.unmount()
  }
})
