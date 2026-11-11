// Só para os testes: o mundo por baixo do farol, no papel do Claude Code. O disco e os comandos ficam em
// memória, para nenhum teste gravar em ~/.claude de verdade.
import { mock } from 'claude-code/testing'
import type { On } from 'claude-code'

import type { Registro } from '../types'

export const CASA = '/Users/exemplo'
export const PASTA = `${CASA}/.claude/farol`
export const AGORA = Date.parse('2026-11-10T15:00:00Z')
export const ID = 'sessao-exemplo-1'
export const INICIO = { cwd: '/Users/exemplo/projetos/exemplo', surface: 'terminal', isInteractive: true } as const
export const FIM_DA_SESSAO = { reason: 'prompt_input_exit', sessionId: ID, resume: {} } as never

export const FAIXA = {
  plugin: 'farol',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 10, bodyColumns: 140, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const
export const PAINEL = {
  plugin: 'farol',
  component: 'Pane',
  requestId: 'farol',
  props: { title: 'Farol', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const

export type Mundo = {
  arquivos: Map<string, string>
  // A hora da última mudança de cada arquivo, como o `$.fs.list` a dá (0 se não está aqui).
  mudancas: Map<string, number>
  comandos: string[][]
  // As linhas do main.log do app que o `grep` devolve (vazio: o log não tem pedidos).
  log: { texto: string }
  // Os avisos mostrados pelo farol ($.ui.toast).
  avisos: string[]
  // As pastas listadas, na ordem.
  listadas: string[]
  // Quantas vezes o farol listou a pasta dos registros (cada releitura lista uma vez).
  listagens: () => number
  // Os painéis abertos e fechados, na ordem ("farol", "fechou farol").
  paineis: string[]
  avancar: (ms: number) => Promise<void>
}

export type Opcoes = {
  variaveis?: Record<string, string>
  guardado?: Record<string, unknown>
  // `rm` responde com este código (1 = falhou); `semRm` faz o comando nem começar, como no Windows.
  codigoDoRm?: number
  semRm?: boolean
  // `open` responde com este código (1 = falhou).
  codigoDoOpen?: number
  // O `grep` nem começa (o log ilegível).
  semGrep?: boolean
}

export const preparar = (on: On, o: Opcoes = {}): Mundo => {
  const relogio = mock.clock(on, { now: AGORA })
  mock.store(on, o.guardado ?? {})
  mock.env(on, o.variaveis ?? { HOME: CASA })

  // A sessão: o id, a conversa (vazia, como numa sessão nova) e as respostas do Claude Code a cada evento.
  on('session.id', () => ({ value: ID }))
  on('session.messages', () => ({ value: [] }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.end', (_, e) => ({ sessionId: e.sessionId }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_, e) => ({ text: e.answer }))
  on('command.register', (_, e) => ({ value: { command: e.name } }))

  // Por baixo da faixa não há nada (nem outros mods); os painéis abrem e fecham.
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  const paineis: string[] = []
  on('ui.open', (_, e) => {
    paineis.push(e.id)
    return { value: { isPlaced: true } }
  })
  on('ui.close', (_, e) => {
    paineis.push(`fechou ${e.id}`)
    return { value: undefined }
  })

  const avisos: string[] = []
  on('ui.toast', (_, e) => {
    avisos.push(e.text)
    return { value: undefined }
  })

  // O disco e os comandos. A listagem de uma pasta dá o que está logo dentro dela: os arquivos e as subpastas.
  const arquivos = new Map<string, string>()
  const mudancas = new Map<string, number>()
  const comandos: string[][] = []
  const log = { texto: '' }
  let listagens = 0
  on('fs.write', (_, e) => {
    arquivos.set(e.path, e.text)
    return { value: undefined }
  })
  on('fs.read', (_, e) => {
    const texto = arquivos.get(e.path)
    return texto === undefined ? { deny: `ENOENT: ${e.path}` } : { value: texto }
  })
  const listadas: string[] = []
  on('fs.list', (_, e) => {
    listadas.push(e.path)
    if (e.path === PASTA) listagens += 1
    const nomes = new Map<string, 'file' | 'dir'>()
    for (const p of arquivos.keys()) {
      if (!p.startsWith(`${e.path}/`)) continue
      const resto = p.slice(e.path.length + 1).split('/')
      nomes.set(resto[0] ?? '', resto.length > 1 ? 'dir' : 'file')
    }
    if (nomes.size === 0) return { deny: `ENOENT: ${e.path}` }
    return {
      value: [...nomes].map(([name, kind]) => ({
        name, kind, size: 1, mtimeMs: kind === 'file' ? (mudancas.get(`${e.path}/${name}`) ?? 0) : 0, isLink: false,
      })),
    }
  })
  on('process.run', (_, e) => {
    comandos.push([...e.argv])
    if (e.argv[0] === 'rm' && o.semRm) return { deny: 'ENOENT: rm' }
    if (e.argv[0] === 'grep' && o.semGrep) return { deny: 'EACCES: grep' }
    const codigo = e.argv[0] === 'rm' ? (o.codigoDoRm ?? 0) : e.argv[0] === 'open' ? (o.codigoDoOpen ?? 0) : 0
    if (e.argv[0] === 'rm' && codigo === 0) for (const p of e.argv.slice(2)) arquivos.delete(p)
    const stdout = e.argv[0] === 'grep' ? log.texto : ''
    return { value: { exitCode: codigo, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })

  return { arquivos, mudancas, comandos, log, avisos, listadas, listagens: () => listagens, paineis, avancar: ms => relogio.advance(ms) }
}

// Os arquivos de sessão do app desktop no macOS, na casa de exemplo.
export const ARQUIVOS_DO_APP = `${CASA}/Library/Application Support/Claude/claude-code-sessions`

// O arquivo de uma sessão no app, como o app grava: `cli` é o id da sessão no Claude Code; `local` o id no app.
// Cada gravação muda a hora do arquivo, como no disco.
export const gravarNoApp = (
  m: Mundo,
  s: { cli: string; local: string; nome?: string; focadoEm?: number; modo?: string },
) => {
  const caminho = `${ARQUIVOS_DO_APP}/conta-exemplo/ambiente-exemplo/${s.local}.json`
  m.arquivos.set(
    caminho,
    JSON.stringify({ cliSessionId: s.cli, sessionId: s.local, title: s.nome, lastFocusedAt: s.focadoEm, permissionMode: s.modo ?? 'auto' }),
  )
  m.mudancas.set(caminho, (m.mudancas.get(caminho) ?? 0) + 1)
}

// O registro de uma sessão, como está no disco agora.
export const registroDe = (m: Mundo, id = ID) => {
  const texto = m.arquivos.get(`${PASTA}/${id}.json`)
  return texto === undefined ? undefined : (JSON.parse(texto) as Registro)
}

// Outra sessão aberta na máquina, com o registro já gravado.
export const gravarOutra = (m: Mundo, r: Partial<Registro> & { id: string }) =>
  m.arquivos.set(`${PASTA}/${r.id}.json`, JSON.stringify({ pasta: 'exemplo', titulo: r.id, estado: 'livre', desde: AGORA, vivoEm: AGORA, ...r }))
