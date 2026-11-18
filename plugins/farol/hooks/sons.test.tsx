// Os sons do farol: o "esperando por você" quando esta sessão passa a esperar você e a "resposta não vista" quando
// ela responde fora da tela do app. Cada sessão toca só a própria virada.
import { expect, test } from 'claude-code/testing'

import { AGORA, ID, INICIO, gravarNoApp, gravarOutra, preparar, registroDe } from './apoio-de-teste'
import type { Mundo, Opcoes } from './apoio-de-teste'

const PERGUNTA = { tool: 'AskUserQuestion', tool_use_id: 'pergunta-1', input: { questions: [] } } as never
const PERGUNTA_DO_SUBAGENTE = { tool: 'AskUserQuestion', tool_use_id: 'pergunta-2', agentId: 'subagente-1', input: { questions: [] } } as never
const FIM = { turnId: 't1', answer: 'pronto', durationMs: 1_000, isAborted: false, reason: 'answer' } as const
const MIN = 60_000
const ESPERANDO = 'sons/esperando.wav x1'
const NAO_VISTO = 'sons/nao-visto.wav x1'

// Uma sessão com as perguntas respondidas na hora.
const comPerguntas = (on: Parameters<typeof preparar>[0], o: Opcoes = {}): Mundo => {
  const m = preparar(on, o)
  on('tool.call', () => ({ deny: 'respondida no teste' }))
  return m
}

// Esta sessão aberta no app; `naTela`: aberta por último (senão, outra sessão foi aberta depois dela).
const noApp = (m: Mundo, naTela: boolean) => {
  gravarNoApp(m, { cli: ID, local: 'local_eu', focadoEm: naTela ? AGORA - MIN : AGORA - 10 * MIN })
  gravarNoApp(m, { cli: 'outra', local: 'local_outra', focadoEm: naTela ? AGORA - 10 * MIN : AGORA - MIN })
}

test('uma pergunta deixa a sessão esperando e toca o "esperando por você", uma vez', async ($, on) => {
  const m = comPerguntas(on)
  await $.session.start(INICIO)
  await $.prompt.submit({ text: 'oi' } as never)
  expect(m.sons).toEqual([])

  await $.tool.call(PERGUNTA)
  expect(m.sons).toEqual([ESPERANDO])
})

test('sem virada para esperando, nada toca: o prompt, o fim da resposta e a sessão que já começa', async ($, on) => {
  const m = preparar(on)
  await $.session.start(INICIO)
  await $.prompt.submit({ text: 'oi' } as never)
  await $.turn.complete(FIM)
  await $.prompt.submit({ text: 'de novo' } as never)
  expect(m.sons).toEqual([])
})

test('duas perguntas abertas juntas (a da sessão e a de um subagente) são uma virada só: um som', async ($, on) => {
  const m = preparar(on)
  const respostas: Array<() => void> = []
  let duasAbertas = () => {}
  const abertas = new Promise<void>(r => (duasAbertas = r))
  on('tool.call', () =>
    new Promise(resolve => {
      respostas.push(() => resolve({ deny: 'respondida no teste' }))
      if (respostas.length === 2) duasAbertas()
    }),
  )

  await $.session.start(INICIO)
  await $.prompt.submit({ text: 'oi' } as never)
  const primeira = $.tool.call(PERGUNTA)
  const segunda = $.tool.call(PERGUNTA_DO_SUBAGENTE)
  await abertas
  respostas[0]?.()
  respostas[1]?.()
  await primeira
  await segunda
  expect(m.sons).toEqual([ESPERANDO])
})

test('o mesmo som não toca de novo antes de 10 s; depois, toca', async ($, on) => {
  const m = comPerguntas(on)
  await $.session.start(INICIO)
  await $.prompt.submit({ text: 'oi' } as never)
  await $.tool.call(PERGUNTA)

  await m.avancar(9_000)
  await $.tool.call(PERGUNTA)
  expect(m.sons).toEqual([ESPERANDO])

  await m.avancar(1_000)
  await $.tool.call(PERGUNTA)
  expect(m.sons).toEqual([ESPERANDO, ESPERANDO])
})

test('outra sessão que passa a esperar você não toca nesta: cada sessão toca a própria virada', async ($, on) => {
  const m = preparar(on)
  gravarOutra(m, { id: 'outra', estado: 'trabalhando' })
  await $.session.start(INICIO)

  gravarOutra(m, { id: 'outra', estado: 'esperando', desde: AGORA + 1_000 })
  await m.avancar(5_000)
  expect(m.sons).toEqual([])
})

test('com o "esperando por você" desligado, a pergunta não toca, e a sessão fica esperando igual', async ($, on) => {
  const m = preparar(on, { guardado: { ajustes: { somEsperando: false } } })
  let durante: string | undefined
  on('tool.call', () => {
    durante = registroDe(m)?.estado
    return { deny: 'respondida no teste' }
  })
  await $.session.start(INICIO)
  await $.prompt.submit({ text: 'oi' } as never)
  await $.tool.call(PERGUNTA)
  expect(durante).toBe('esperando')
  expect(m.sons).toEqual([])
})

test('uma falha ao tocar não atrapalha o farol: a sessão fica esperando e volta a trabalhando', async ($, on) => {
  const m = preparar(on, { falhaNoSom: true })
  let durante: string | undefined
  on('tool.call', () => {
    durante = registroDe(m)?.estado
    return { deny: 'respondida no teste' }
  })
  await $.session.start(INICIO)
  await $.prompt.submit({ text: 'oi' } as never)
  await $.tool.call(PERGUNTA)
  expect(durante).toBe('esperando')
  expect(registroDe(m)?.estado).toBe('trabalhando')
})

test('no app, a resposta fora da tela toca a "resposta não vista"', async ($, on) => {
  const m = preparar(on)
  noApp(m, false)
  await $.session.start({ ...INICIO, surface: 'desktop' })
  await $.prompt.submit({ text: 'oi' } as never)
  await $.turn.complete(FIM)
  expect(registroDe(m)?.respondeuEm).toBe(AGORA)
  expect(m.sons).toEqual([NAO_VISTO])
})

test('no app, a resposta na tela não toca a "resposta não vista"; a pergunta na tela toca o "esperando"', async ($, on) => {
  const m = comPerguntas(on)
  noApp(m, true)
  await $.session.start({ ...INICIO, surface: 'desktop' })
  await $.prompt.submit({ text: 'oi' } as never)
  await $.turn.complete(FIM)
  expect(m.sons).toEqual([])

  await $.prompt.submit({ text: 'de novo' } as never)
  await $.tool.call(PERGUNTA)
  expect(m.sons).toEqual([ESPERANDO])
})

test('com a "resposta não vista" desligada, a resposta fora da tela não toca, e fica para o não visto igual', async ($, on) => {
  const m = preparar(on, { guardado: { ajustes: { somNaoVisto: false } } })
  noApp(m, false)
  await $.session.start({ ...INICIO, surface: 'desktop' })
  await $.prompt.submit({ text: 'oi' } as never)
  await $.turn.complete(FIM)
  expect(registroDe(m)?.respondeuEm).toBe(AGORA)
  expect(m.sons).toEqual([])
})

test('no terminal, o fim da resposta não toca nada: lá não há não visto', async ($, on) => {
  const m = preparar(on)
  await $.session.start(INICIO)
  await $.prompt.submit({ text: 'oi' } as never)
  await m.avancar(61_000)
  await $.turn.complete(FIM)
  expect(m.sons).toEqual([])
})

test('o ajuste desligado em outra sessão vale nesta, já aberta: o som lê o ajuste guardado na hora de tocar', async ($, on) => {
  const m = comPerguntas(on)
  await $.session.start(INICIO)
  // Outra sessão desliga o som no painel dela: o ajuste guardado muda, e esta sessão não reiniciou.
  m.guardado.ajustes = { somEsperando: false }
  await $.prompt.submit({ text: 'oi' } as never)
  await $.tool.call(PERGUNTA)
  expect(m.sons).toEqual([])
})

test('a pergunta de um subagente também toca o "esperando por você"', async ($, on) => {
  const m = comPerguntas(on)
  await $.session.start(INICIO)
  await $.prompt.submit({ text: 'oi' } as never)
  await $.tool.call(PERGUNTA_DO_SUBAGENTE)
  expect(m.sons).toEqual([ESPERANDO])
})

// Um comando que a checagem manda perguntar, e a chamada dele.
const CHECAGEM = { tool: 'Bash', tool_use_id: 'b1', input: { command: 'ls' } } as never
const CHAMADA = { tool: 'Bash', tool_use_id: 'b1', command: 'ls' } as never

test('no app, no modo Manual, um pedido de permissão toca o "esperando por você"', async ($, on) => {
  const m = preparar(on)
  on('tool.check', () => ({ decision: 'ask' }))
  on('tool.call', () => ({ deny: 'respondida no teste' }))
  gravarNoApp(m, { cli: ID, local: 'local_eu', focadoEm: AGORA - MIN, modo: 'default' })
  await $.session.start({ ...INICIO, surface: 'desktop' })
  await $.prompt.submit({ text: 'oi' } as never)
  await $.tool.check(CHECAGEM)
  expect(m.sons).toEqual([ESPERANDO])
  await $.tool.call(CHAMADA)
})

// A caixa de fim de turno do app que depende de você.
const FIM_DE_TURNO = { tool: 'mcp__ccd_turn__wrap_up', tool_use_id: 'fim-1', recap: 'resumo', ask: 'Que dia é hoje?', blocked: true } as never

test('a resposta que termina numa pergunta que depende de você toca só o "esperando", também fora da tela', async ($, on) => {
  const m = preparar(on)
  on('tool.call', () => ({ result: 'mostrada' }) as never)
  noApp(m, false)
  await $.session.start({ ...INICIO, surface: 'desktop' })
  await $.prompt.submit({ text: 'oi' } as never)
  await $.tool.call(FIM_DE_TURNO)
  await $.turn.complete(FIM)
  expect(registroDe(m)?.estado).toBe('esperando')
  expect(m.sons).toEqual([ESPERANDO])
})
