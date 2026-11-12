// Os extras do app desktop no macOS, com os arquivos de sessão do app e o main.log fictícios: o não visto, o
// nome da sessão no app, o vermelho do pedido de permissão e o clique que troca de sessão.
import { expect, test } from 'claude-code/testing'

import { AGORA, ID, INICIO, PAINEL, ARQUIVOS_DO_APP, gravarNoApp, gravarOutra, preparar, registroDe } from './apoio-de-teste'
import type { Mundo } from './apoio-de-teste'

const FIM = { turnId: 't1', answer: 'pronto', durationMs: 1_000, isAborted: false, reason: 'answer' } as const
const MIN = 60_000
// O botão `parte` (1 a 3) do clique no cartão de uma sessão. Montado por função: um texto com número logo depois de
// `key:` parece chave de API para o gitleaks do CI.
const clique = (id: string, parte: number) => `clique-${id}-${parte}`

const textos = async (ui: { findAll: (q: { type: 'Text' }) => Promise<{ text: string }[]> }) => (await ui.findAll({ type: 'Text' })).map(t => t.text)
const barcos = async (ui: { findAll: (q: { type: 'Svg' }) => Promise<{ props: Record<string, unknown> }[]> }) =>
  (await ui.findAll({ type: 'Svg' })).map(s => String(s.props.alt)).filter(a => a.startsWith('Barco:'))
const cena = async (ui: { findAll: (q: { type: 'Svg' }) => Promise<{ props: Record<string, unknown> }[]> }) =>
  String((await ui.findAll({ type: 'Svg' }))[0]?.props.alt)

// Esta sessão aberta no app, na tela (aberta por último), no modo dado.
const nestaTela = (m: Mundo, modo = 'auto') => gravarNoApp(m, { cli: ID, local: 'local_eu', nome: 'Esta sessão', focadoEm: AGORA - MIN, modo })

test('no app, uma resposta numa sessão fora da tela deixa o cartão azul e acende a boia; abrir a sessão apaga', async ($, on) => {
  const m = preparar(on)
  nestaTela(m)
  gravarNoApp(m, { cli: 'outra', local: 'local_outra', nome: 'Revisar o PR', focadoEm: AGORA - 10 * MIN })
  gravarOutra(m, { id: 'outra', titulo: 'primeira mensagem', estado: 'livre', respondeuEm: AGORA - 5 * MIN })
  await $.session.start(INICIO)

  let ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  expect(await barcos(ui)).toEqual(['Barco: Não visto', 'Barco: Livre'])
  expect(await cena(ui)).toBe('Farol com a luz azul e a boia acesa: há resposta que você não viu')
  await ui.unmount()

  // Você abre a outra sessão no app: o foco dela passa a ser o mais recente, e a releitura (5 s) apaga o azul.
  gravarNoApp(m, { cli: 'outra', local: 'local_outra', nome: 'Revisar o PR', focadoEm: AGORA + 1_000 })
  await m.avancar(5_000)
  ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  expect(await barcos(ui)).toEqual(['Barco: Livre', 'Barco: Livre'])
  await ui.unmount()
})

test('no app, o título do cartão é o nome da sessão na barra lateral, e muda quando você renomeia', async ($, on) => {
  const m = preparar(on)
  nestaTela(m)
  gravarNoApp(m, { cli: 'outra', local: 'local_outra', nome: 'Revisar o PR', focadoEm: AGORA - 10 * MIN })
  gravarOutra(m, { id: 'outra', titulo: 'primeira mensagem da outra' })
  gravarOutra(m, { id: 'do-terminal', titulo: 'sessão aberta no terminal' })
  await $.session.start(INICIO)

  let ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  let t = await textos(ui)
  expect(t).toContain('Esta sessão')
  expect(t).toContain('Revisar o PR')
  expect(t).toContain('sessão aberta no terminal')
  expect(t).not.toContain('primeira mensagem da outra')
  await ui.unmount()

  gravarNoApp(m, { cli: 'outra', local: 'local_outra', nome: 'Novo nome', focadoEm: AGORA - 10 * MIN })
  await m.avancar(5_000)
  ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  t = await textos(ui)
  expect(t).toContain('Novo nome')
  expect(t).not.toContain('Revisar o PR')
  await ui.unmount()
})

test('a resposta desta sessão fora da tela do app fica para o não visto; na tela, não', async ($, on) => {
  const m = preparar(on)
  gravarNoApp(m, { cli: ID, local: 'local_eu', focadoEm: AGORA - 10 * MIN })
  gravarNoApp(m, { cli: 'outra', local: 'local_outra', focadoEm: AGORA - MIN })
  await $.session.start(INICIO)
  await $.prompt.submit({ text: 'oi' } as never)
  await $.turn.complete(FIM)
  expect(registroDe(m)?.respondeuEm).toBe(AGORA)

  // Você abre esta sessão no app, e ela responde de novo: na tela.
  gravarNoApp(m, { cli: ID, local: 'local_eu', focadoEm: AGORA + 1 })
  await m.avancar(5_000)
  await $.prompt.submit({ text: 'de novo' } as never)
  await $.turn.complete(FIM)
  expect(registroDe(m)?.respondeuEm).toBe(undefined)
})

test('ao reabrir a sessão, a hora da última resposta continua (o não visto sobrevive a um reinício do app)', async ($, on) => {
  const m = preparar(on)
  gravarOutra(m, { id: ID, estado: 'trabalhando', respondeuEm: AGORA - 30 * MIN })
  await $.session.start(INICIO)
  expect(registroDe(m)).toEqual(expect.objectContaining({ estado: 'livre', respondeuEm: AGORA - 30 * MIN }))
})

// Um comando que a checagem manda perguntar, e a chamada dele (que termina quando você responde e ele roda).
const CHECAGEM = (id: string, agentId?: string) => ({ tool: 'Bash', tool_use_id: id, input: { command: 'ls' }, ...(agentId ? { agentId } : {}) }) as never
const CHAMADA = (id: string) => ({ tool: 'Bash', tool_use_id: id, command: 'ls' }) as never
const perguntar = (on: Parameters<typeof preparar>[0]) => {
  on('tool.check', () => ({ decision: 'ask' }))
  on('tool.call', () => ({ deny: 'respondida no teste' }))
}
const LOG_ANTIGO = '2026-11-10 14:00:00 [info] Emitted tool permission request antigo for Bash in session local_eu'
const emitido = (pedido: string, sessao = 'local_eu') => `2026-11-10 15:00:01 [info] Emitted tool permission request ${pedido} for Bash in session ${sessao}`
const respondido = (pedido: string) => `2026-11-10 15:00:09 [info] Received permission response for ${pedido}: once (tool: Bash)`

test('no app, no modo Manual, um pedido de permissão deixa a sessão esperando até a chamada terminar', async ($, on) => {
  const m = preparar(on)
  perguntar(on)
  nestaTela(m, 'default')
  await $.session.start(INICIO)
  await $.prompt.submit({ text: 'oi' } as never)

  await $.tool.check(CHECAGEM('b1'))
  expect(registroDe(m)?.estado).toBe('esperando')
  await $.tool.call(CHAMADA('b1'))
  expect(registroDe(m)?.estado).toBe('trabalhando')
})

test('no app, no Auto, o vermelho vem do main.log: acende com o pedido na tela e apaga com a sua resposta', async ($, on) => {
  const m = preparar(on)
  perguntar(on)
  nestaTela(m, 'auto')
  m.log.texto = LOG_ANTIGO
  await $.session.start(INICIO)
  await $.prompt.submit({ text: 'oi' } as never)

  // O classificador ainda decide: nada na tela.
  await $.tool.check(CHECAGEM('b1'))
  expect(registroDe(m)?.estado).toBe('trabalhando')
  expect(m.comandos.some(c => c[0] === 'grep' && c.at(-1) === '/Users/exemplo/Library/Logs/Claude/main.log')).toBe(true)

  // O pedido de outra sessão não conta; o desta, sim.
  m.log.texto = [LOG_ANTIGO, emitido('p-outra', 'local_outra')].join('\n')
  await m.avancar(1_000)
  expect(registroDe(m)?.estado).toBe('trabalhando')
  m.log.texto = [LOG_ANTIGO, emitido('p-outra', 'local_outra'), emitido('p1')].join('\n')
  await m.avancar(1_000)
  expect(registroDe(m)?.estado).toBe('esperando')

  // Você responde; o comando ainda roda, e a sessão já volta a trabalhando.
  m.log.texto = [LOG_ANTIGO, emitido('p-outra', 'local_outra'), emitido('p1'), respondido('p1')].join('\n')
  await m.avancar(1_000)
  expect(registroDe(m)?.estado).toBe('trabalhando')

  // Com a chamada terminada, a vigia do log para.
  await $.tool.call(CHAMADA('b1'))
  const greps = m.comandos.filter(c => c[0] === 'grep').length
  await m.avancar(5_000)
  expect(m.comandos.filter(c => c[0] === 'grep').length).toBe(greps)
})

test('o pedido de permissão de um subagente também conta; com dois abertos, a sessão espera até o último terminar', async ($, on) => {
  const m = preparar(on)
  perguntar(on)
  nestaTela(m, 'default')
  await $.session.start(INICIO)
  await $.prompt.submit({ text: 'oi' } as never)

  await $.tool.check(CHECAGEM('b1'))
  await $.tool.check(CHECAGEM('b2', 'subagente-1'))
  expect(registroDe(m)?.estado).toBe('esperando')
  await $.tool.call(CHAMADA('b2'))
  expect(registroDe(m)?.estado).toBe('esperando')
  await $.tool.call(CHAMADA('b1'))
  expect(registroDe(m)?.estado).toBe('trabalhando')
})

test('o fim da resposta fecha os pedidos que ficaram abertos (um pedido recusado, por exemplo)', async ($, on) => {
  const m = preparar(on)
  perguntar(on)
  nestaTela(m, 'default')
  await $.session.start(INICIO)
  await $.prompt.submit({ text: 'oi' } as never)
  await $.tool.check(CHECAGEM('b1'))
  await $.turn.complete(FIM)
  expect(registroDe(m)?.estado).toBe('livre')
  const greps = m.comandos.filter(c => c[0] === 'grep').length
  await m.avancar(3_000)
  expect(m.comandos.filter(c => c[0] === 'grep').length).toBe(greps)
})

test('no app, o clique em qualquer parte do cartão de outra sessão leva o app para ela', async ($, on) => {
  const m = preparar(on)
  nestaTela(m)
  gravarNoApp(m, { cli: 'outra', local: 'local_outra', focadoEm: AGORA - 10 * MIN })
  gravarOutra(m, { id: 'outra' })
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  for (const parte of [1, 2, 3]) await ui.press({ key: clique('outra', parte) })
  await ui.unmount()
  expect(m.comandos.filter(c => c[0] === 'open')).toEqual(Array(3).fill(['open', 'claude://code/continue?session=local_outra']))
  expect(m.avisos).toEqual([])
})

test('se o app não abrir a sessão, um aviso diz isso', async ($, on) => {
  const m = preparar(on, { codigoDoOpen: 1 })
  nestaTela(m)
  gravarNoApp(m, { cli: 'outra', local: 'local_outra', focadoEm: AGORA - 10 * MIN })
  gravarOutra(m, { id: 'outra' })
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  await ui.press({ key: clique('outra', 2) })
  await ui.unmount()
  expect(m.avisos).toEqual(['Não consegui abrir essa sessão no app.'])
})

test('o cartão desta sessão e o de uma sessão do terminal não trocam de sessão', async ($, on) => {
  const m = preparar(on)
  nestaTela(m)
  gravarOutra(m, { id: 'do-terminal' })
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  await ui.press({ key: clique(ID, 1) })
  await ui.press({ key: clique('do-terminal', 1) })
  await ui.unmount()
  expect(m.comandos.filter(c => c[0] === 'open')).toEqual([])
})

test('no painel do terminal não há não visto, mesmo com os arquivos do app', async ($, on) => {
  const m = preparar(on)
  nestaTela(m)
  gravarNoApp(m, { cli: 'outra', local: 'local_outra', focadoEm: AGORA - 10 * MIN })
  gravarOutra(m, { id: 'outra', respondeuEm: AGORA - 5 * MIN })
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  const t = await textos(ui)
  expect(t.some(x => x.includes('Não visto'))).toBe(false)
  expect(t).toContain('exemplo · agora · Livre')
  await ui.unmount()
})

// Linux, Windows, o terminal, ou o app sem os arquivos: o núcleo, sem erro.
test('sem os arquivos do app, o farol fica no núcleo: sem azul, sem vermelho pelo log, sem troca e com a primeira mensagem', async ($, on) => {
  const m = preparar(on)
  perguntar(on)
  gravarOutra(m, { id: 'outra', titulo: 'primeira mensagem da outra', respondeuEm: AGORA - 5 * MIN })
  await $.session.start(INICIO)
  await $.prompt.submit({ text: 'oi' } as never)
  await $.tool.check(CHECAGEM('b1'))
  await m.avancar(2_000)
  expect(registroDe(m)?.estado).toBe('trabalhando')

  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  expect(await barcos(ui)).toEqual(['Barco: Trabalhando', 'Barco: Livre'])
  expect(await textos(ui)).toContain('primeira mensagem da outra')
  await ui.press({ key: clique('outra', 1) })
  await ui.unmount()
  expect(m.comandos.filter(c => c[0] === 'grep' || c[0] === 'open')).toEqual([])

  // Fora do app, a hora da resposta não é gravada (não há não visto).
  await $.turn.complete(FIM)
  expect(registroDe(m)?.respondeuEm).toBe(undefined)
})

test('dois pedidos ao mesmo tempo (dois subagentes) fazem uma vigia só do log', async ($, on) => {
  const m = preparar(on)
  perguntar(on)
  nestaTela(m, 'auto')
  await $.session.start(INICIO)
  await $.prompt.submit({ text: 'oi' } as never)

  await Promise.all([$.tool.check(CHECAGEM('b1', 'subagente-1')), $.tool.check(CHECAGEM('b2', 'subagente-2'))])
  const greps = () => m.comandos.filter(c => c[0] === 'grep').length
  const antes = greps()
  await m.avancar(1_000)
  expect(greps()).toBe(antes + 1)

  await $.tool.call(CHAMADA('b1'))
  await $.tool.call(CHAMADA('b2'))
  const depois = greps()
  await m.avancar(3_000)
  expect(greps()).toBe(depois)
})

test('no Manual, a resposta de um pedido anterior não apaga o vermelho de um novo que ainda não chegou ao log', async ($, on) => {
  const m = preparar(on)
  perguntar(on)
  nestaTela(m, 'default')
  await $.session.start(INICIO)
  await $.prompt.submit({ text: 'oi' } as never)

  // O primeiro pedido aparece e é respondido; o comando dele ainda roda.
  await $.tool.check(CHECAGEM('b1'))
  m.log.texto = [emitido('p1'), respondido('p1')].join('\n')
  await m.avancar(1_000)
  expect(registroDe(m)?.estado).toBe('trabalhando')

  // Um segundo pedido: na tela pelo modo, ainda fora do log.
  await $.tool.check(CHECAGEM('b2', 'subagente-1'))
  await m.avancar(1_000)
  expect(registroDe(m)?.estado).toBe('esperando')

  // O app registra o segundo e a sua resposta.
  m.log.texto = [emitido('p1'), respondido('p1'), emitido('p2'), respondido('p2')].join('\n')
  await m.avancar(1_000)
  expect(registroDe(m)?.estado).toBe('trabalhando')
})

test('um subagente que pede depois do fim da resposta deixa a sessão esperando, e ela volta a livre', async ($, on) => {
  const m = preparar(on)
  perguntar(on)
  nestaTela(m, 'default')
  await $.session.start(INICIO)
  await $.prompt.submit({ text: 'oi' } as never)
  await $.turn.complete(FIM)
  expect(registroDe(m)?.estado).toBe('livre')

  await $.tool.check(CHECAGEM('b1', 'subagente-1'))
  expect(registroDe(m)?.estado).toBe('esperando')
  await $.tool.call(CHAMADA('b1'))
  expect(registroDe(m)?.estado).toBe('livre')
})

test('o fim da resposta não fecha o pedido de um subagente que segue rodando; o fim do subagente, sim', async ($, on) => {
  const m = preparar(on)
  perguntar(on)
  nestaTela(m, 'default')
  await $.session.start(INICIO)
  await $.prompt.submit({ text: 'oi' } as never)
  await $.tool.check(CHECAGEM('b1', 'subagente-1'))
  await $.turn.complete(FIM)
  expect(registroDe(m)?.estado).toBe('esperando')

  await $.turn.complete({ ...FIM, agentId: 'subagente-1' } as never)
  expect(registroDe(m)?.estado).toBe('livre')
})

test('com o log ilegível, o Auto fica sem o vermelho pelo log, e o Manual apaga quando a chamada termina', async ($, on) => {
  const m = preparar(on, { semGrep: true })
  perguntar(on)
  nestaTela(m, 'auto')
  await $.session.start(INICIO)
  await $.prompt.submit({ text: 'oi' } as never)
  await $.tool.check(CHECAGEM('b1'))
  await m.avancar(2_000)
  expect(registroDe(m)?.estado).toBe('trabalhando')
  await $.tool.call(CHAMADA('b1'))

  nestaTela(m, 'default')
  await m.avancar(5_000)
  await $.tool.check(CHECAGEM('b2'))
  await m.avancar(2_000)
  expect(registroDe(m)?.estado).toBe('esperando')
  await $.tool.call(CHAMADA('b2'))
  expect(registroDe(m)?.estado).toBe('trabalhando')
})

test('um arquivo do app estragado ou de outro formato é ignorado, sem erro', async ($, on) => {
  const m = preparar(on)
  nestaTela(m)
  m.arquivos.set(`${ARQUIVOS_DO_APP}/conta-exemplo/ambiente-exemplo/local_estragado.json`, '{"cliSessionId":')
  m.arquivos.set(`${ARQUIVOS_DO_APP}/conta-exemplo/ambiente-exemplo/local_outro.json`, JSON.stringify({ cliSessionId: 'outra', title: 7 }))
  gravarOutra(m, { id: 'outra', titulo: 'primeira mensagem da outra' })
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  expect(await textos(ui)).toContain('primeira mensagem da outra')
  expect(await barcos(ui)).toEqual(['Barco: Livre', 'Barco: Livre'])
  await ui.unmount()
})

test('sem o arquivo desta sessão no app no primeiro minuto (terminal), o farol para de ler os arquivos do app', async ($, on) => {
  const m = preparar(on)
  gravarNoApp(m, { cli: 'outra', local: 'local_outra', focadoEm: AGORA - 10 * MIN })
  await $.session.start(INICIO)
  const leiturasDoApp = () => m.listadas.filter(p => p === ARQUIVOS_DO_APP).length
  expect(leiturasDoApp()).toBeGreaterThan(0)

  await m.avancar(65_000)
  const depois = leiturasDoApp()
  await m.avancar(30_000)
  expect(leiturasDoApp()).toBe(depois)
})

// Uma sessão que o app deixa pré-aberta, na pasta das spares, à espera de você abrir uma sessão nova.
const INICIO_SPARE = { ...INICIO, cwd: '/Users/exemplo/Library/Application Support/Claude/claude-code-spare/spare-exemplo1' } as const

test('uma sessão spare do app só entra no farol quando o app a usa, e com a pasta do app', async ($, on) => {
  const m = preparar(on)
  await $.session.start(INICIO_SPARE)
  expect(registroDe(m)).toBeUndefined()

  // Ninguém a usou por dois minutos: continua fora (e segue procurando, sem o limite de 1 min).
  await m.avancar(120_000)
  expect(registroDe(m)).toBeUndefined()

  // Você abre uma sessão nova; o app usa esta spare, e o arquivo dela aparece.
  gravarNoApp(m, { cli: ID, local: 'local_eu', nome: 'Sessão nova', focadoEm: AGORA + 120_000, cwd: '/Users/exemplo/projetos/meu-projeto' })
  await m.avancar(30_000)
  expect(registroDe(m)).toEqual(expect.objectContaining({ id: ID, pasta: 'meu-projeto' }))
})

test('no app, a pasta de cada sessão é a que o app diz', async ($, on) => {
  const m = preparar(on)
  gravarNoApp(m, { cli: ID, local: 'local_eu', focadoEm: AGORA - MIN, cwd: '/Users/exemplo/projetos/exemplo' })
  gravarNoApp(m, { cli: 'outra', local: 'local_outra', focadoEm: AGORA - 10 * MIN, cwd: '/Users/exemplo/projetos/outro-projeto' })
  gravarOutra(m, { id: 'outra', pasta: 'spare-exemplo2' })
  await $.session.start(INICIO)

  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  const t = await textos(ui)
  expect(t.some(x => x.startsWith('outro-projeto · '))).toBe(true)
  expect(t.some(x => x.startsWith('spare-exemplo2'))).toBe(false)
  await ui.unmount()
})
