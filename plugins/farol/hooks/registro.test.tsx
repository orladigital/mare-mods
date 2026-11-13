import { expect, test } from 'claude-code/testing'

import { AGORA, CASA, FIM_DA_SESSAO, ID, INICIO, PAINEL, PASTA, preparar, registroDe } from './apoio-de-teste'

const PERGUNTA = { tool: 'AskUserQuestion', tool_use_id: 'pergunta-1', input: { questions: [] } } as never
const PERGUNTA_DO_SUBAGENTE = { tool: 'AskUserQuestion', tool_use_id: 'pergunta-2', agentId: 'subagente-1', input: { questions: [] } } as never
const FIM = { turnId: 't1', answer: 'pronto', durationMs: 1_000, isAborted: false, reason: 'answer' } as const

test('ao começar, a sessão grava o registro em ~/.claude/farol/, livre, com o nome da pasta', async ($, on) => {
  const m = preparar(on)
  await $.session.start(INICIO)
  expect(registroDe(m)).toEqual(expect.objectContaining({ id: ID, estado: 'livre', pasta: 'exemplo', desde: AGORA, vivoEm: AGORA }))
})

test('sem HOME, a casa vem do USERPROFILE (Windows)', async ($, on) => {
  const m = preparar(on, { variaveis: { USERPROFILE: CASA } })
  await $.session.start(INICIO)
  expect(m.arquivos.has(`${PASTA}/${ID}.json`)).toBe(true)
})

test('sem HOME nem USERPROFILE, nada é gravado e nada quebra', async ($, on) => {
  const m = preparar(on, { variaveis: {} })
  await $.session.start(INICIO)
  await $.prompt.submit({ text: 'oi' } as never)
  await $.session.end(FIM_DA_SESSAO)
  expect(m.arquivos.size).toBe(0)
  expect(m.comandos).toEqual([])
})

test('o prompt deixa a sessão trabalhando e dá o título; o fim da resposta a deixa livre', async ($, on) => {
  const m = preparar(on)
  await $.session.start(INICIO)
  await $.prompt.submit({ text: 'corrige o teste do farol' } as never)
  expect(registroDe(m)).toEqual(expect.objectContaining({ estado: 'trabalhando', titulo: 'corrige o teste do farol' }))

  await $.turn.complete(FIM)
  expect(registroDe(m)?.estado).toBe('livre')
})

test('o fim do turno de um subagente não deixa a sessão livre', async ($, on) => {
  const m = preparar(on)
  await $.session.start(INICIO)
  await $.prompt.submit({ text: 'oi' } as never)
  await $.turn.complete({ ...FIM, agentId: 'subagente-1' } as never)
  expect(registroDe(m)?.estado).toBe('trabalhando')
})

test('uma pergunta (AskUserQuestion) deixa a sessão esperando até ser respondida', async ($, on) => {
  const m = preparar(on)
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

test('com duas perguntas abertas (uma de subagente), a sessão só volta a trabalhando depois da última', async ($, on) => {
  const m = preparar(on)
  // Cada pergunta fica aberta até o teste respondê-la; `abertas` resolve quando as duas chegaram aqui embaixo.
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
  await primeira
  expect(registroDe(m)?.estado).toBe('esperando')

  respostas[1]?.()
  await segunda
  expect(registroDe(m)?.estado).toBe('trabalhando')
})

test('o batimento renova o registro a cada 30 s', async ($, on) => {
  const m = preparar(on)
  await $.session.start(INICIO)
  await m.avancar(30_000)
  expect(registroDe(m)?.vivoEm).toBe(AGORA + 30_000)
})

test('com o farol fora da faixa e o painel fechado, a releitura das outras sessões para; o painel aberto a religa', async ($, on) => {
  const m = preparar(on, { guardado: { ajustes: { naFaixa: 'esconder' } } })
  await $.session.start(INICIO)

  const antes = m.listagens()
  await m.avancar(20_000)
  expect(m.listagens()).toBe(antes)

  await $.command.run({ command: 'farol', args: '' } as never)
  const aberto = m.listagens()
  await m.avancar(10_000)
  expect(m.listagens()).toBe(aberto + 2)

  const painel = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  await painel.press({ key: 'fechar' })
  await painel.unmount()
  const fechado = m.listagens()
  await m.avancar(20_000)
  expect(m.listagens()).toBe(fechado)
})

test('com o farol na faixa, a releitura roda a cada 5 s', async ($, on) => {
  const m = preparar(on)
  await $.session.start(INICIO)
  const antes = m.listagens()
  await m.avancar(10_000)
  expect(m.listagens()).toBe(antes + 2)
})

test('ao terminar, o registro é apagado com rm -f', async ($, on) => {
  const m = preparar(on)
  await $.session.start(INICIO)
  await $.session.end(FIM_DA_SESSAO)
  expect(m.comandos).toContainEqual(['rm', '-f', `${PASTA}/${ID}.json`])
  expect(m.arquivos.has(`${PASTA}/${ID}.json`)).toBe(false)
})

for (const [caso, opcoes] of [
  ['sem rm (Windows)', { semRm: true }],
  ['com o rm falhando', { codigoDoRm: 1 }],
] as const) {
  test(`${caso}, o registro fica (é esquecido depois de 12 h) e nada quebra`, async ($, on) => {
    const m = preparar(on, opcoes)
    await $.session.start(INICIO)
    await $.session.end(FIM_DA_SESSAO)
    expect(m.arquivos.has(`${PASTA}/${ID}.json`)).toBe(true)
  })
}

// A caixa de fim de turno do app (a pergunta com botões abaixo da resposta). `blocked`: a sessão parou porque
// depende de você.
const FIM_DE_TURNO = (blocked: boolean) =>
  ({ tool: 'mcp__ccd_turn__wrap_up', tool_use_id: `fim-${blocked}`, recap: 'resumo', ask: 'Que dia é hoje?', blocked }) as never

test('a caixa de fim de turno que depende de você deixa a sessão esperando até o próximo prompt', async ($, on) => {
  const m = preparar(on)
  on('tool.call', () => ({ result: 'mostrada' }) as never)
  await $.session.start(INICIO)
  await $.prompt.submit({ text: 'oi' } as never)
  await $.tool.call(FIM_DE_TURNO(true))
  await $.turn.complete(FIM)
  expect(registroDe(m)?.estado).toBe('esperando')

  await $.prompt.submit({ text: 'A' } as never)
  expect(registroDe(m)?.estado).toBe('trabalhando')
  await $.turn.complete(FIM)
  expect(registroDe(m)?.estado).toBe('livre')
})

test('a caixa de fim de turno que só sugere um próximo passo deixa a sessão livre', async ($, on) => {
  const m = preparar(on)
  on('tool.call', () => ({ result: 'mostrada' }) as never)
  await $.session.start(INICIO)
  await $.prompt.submit({ text: 'oi' } as never)
  await $.tool.call(FIM_DE_TURNO(false))
  await $.turn.complete(FIM)
  expect(registroDe(m)?.estado).toBe('livre')
})
