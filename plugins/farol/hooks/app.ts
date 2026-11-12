// Os extras do app desktop no macOS: o que o app sabe de cada sessão (o nome na barra lateral, o id no app, a
// última vez que você a abriu, o modo de permissão), lido dos arquivos de sessão dele, e o link que troca de
// sessão. Fora do app no macOS esses arquivos não existem: a leitura vem vazia e o farol fica no núcleo. O
// main.log, com os pedidos de permissão, se lê pelo código comum (comum/permissao.ts).
import type { EngineInterface } from 'claude-code'

import type { Registro } from '../types'
import { pastaDoRegistro } from './estado'

// A pasta dos arquivos de sessão do app, dentro da casa (só existe no macOS).
const PASTA_DO_APP = 'Library/Application Support/Claude/claude-code-sessions'

// O app deixa sessões pré-abertas (spares) numa pasta própria e usa uma delas quando você abre uma sessão nova; o
// Claude Code segue achando que ela roda ali. A spare só entra no farol quando o app a usa.
export const ehSpareDoApp = (cwd: string): boolean => /[\\/]Claude[\\/]claude-code-spare[\\/]/.test(cwd)

// O que o app sabe de uma sessão, lido do arquivo dela; `cwd` é a pasta onde ela roda para o app.
export type NoApp = { titulo?: string; appId?: string; focadoEm?: number; ativoEm?: number; modo?: string; cwd?: string }
// Um arquivo de sessão do app: o id da sessão no Claude Code (`cliSessionId`) e o que o app sabe dela.
export type ArquivoDoApp = { cli: string; info: NoApp }

const texto = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)
const numero = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined)

// Lê um arquivo de sessão do app. Sem o `cliSessionId`, estragado ou de outro formato, é ignorado.
export const lerNoApp = (conteudo: string): ArquivoDoApp | null => {
  try {
    const j = JSON.parse(conteudo) as unknown
    if (!j || typeof j !== 'object' || Array.isArray(j)) return null
    const o = j as Record<string, unknown>
    const cli = texto(o.cliSessionId)
    if (!cli) return null
    const info: NoApp = {
      titulo: texto(o.title),
      appId: texto(o.sessionId),
      focadoEm: numero(o.lastFocusedAt),
      ativoEm: numero(o.lastActivityAt),
      modo: texto(o.permissionMode),
      cwd: texto(o.cwd),
    }
    for (const k of Object.keys(info) as (keyof NoApp)[]) if (info[k] === undefined) delete info[k]
    return { cli, info }
  } catch {
    return null
  }
}

const recencia = (n: NoApp) => Math.max(n.focadoEm ?? 0, n.ativoEm ?? 0)

// O app às vezes guarda mais de um arquivo para a mesma sessão (o antigo fica para trás). Vale o mais recente
// para o nome, o link e o modo, e o foco mais recente entre todos: senão um arquivo velho lido por último
// mantém o azul aceso depois que você já abriu a sessão.
export const mesclarNoApp = (atual: NoApp | undefined, novo: NoApp): NoApp => {
  if (!atual) return novo
  const base = recencia(novo) > recencia(atual) ? novo : atual
  const focos = [atual.focadoEm, novo.focadoEm].filter((f): f is number => f !== undefined)
  return { ...base, ...(focos.length ? { focadoEm: Math.max(...focos) } : {}) }
}

// A sessão na tela do app é a que você abriu por último.
export const idEmFoco = (app: ReadonlyMap<string, NoApp>): string | undefined => {
  let melhor: [string, number] | undefined
  for (const [id, n] of app) if (n.focadoEm !== undefined && (!melhor || n.focadoEm > melhor[1])) melhor = [id, n.focadoEm]
  return melhor?.[0]
}

// Não visto: respondeu depois da última vez que você abriu a sessão no app, e ela não é a que está na tela.
// Sem a hora da resposta ou a do foco não há como saber.
export const naoVistoDe = (respondeuEm: number | undefined, focadoEm: number | undefined, naTela: boolean): boolean =>
  respondeuEm !== undefined && focadoEm !== undefined && !naTela && focadoEm < respondeuEm

// O link do app que abre a sessão (o mesmo do atalho "Continue" do app); só de um id do app, que vai ao `open`.
export const linkDaSessao = (appId: string | undefined): string | undefined =>
  appId && /^local_[A-Za-z0-9-]{1,64}$/.test(appId) ? `claude://code/continue?session=${appId}` : undefined

// As sessões com o que o app sabe delas: o nome na barra lateral vira o título (a primeira mensagem fica de
// reserva), a pasta é a do app, e vêm o id no app e o não visto. Sessão que o app não conhece (do terminal) fica
// como está.
export const comOApp = (lista: readonly Registro[], app: ReadonlyMap<string, NoApp>): Registro[] => {
  const naTela = idEmFoco(app)
  return lista.map(r => {
    const n = app.get(r.id)
    if (!n) return r
    return {
      ...r,
      titulo: n.titulo?.trim() || r.titulo,
      pasta: n.cwd ? pastaDoRegistro(n.cwd) : r.pasta,
      appId: n.appId,
      naoVisto: naoVistoDe(r.respondeuEm, n.focadoEm, r.id === naTela),
    }
  })
}

// O que já se leu de cada arquivo de sessão do app, pela hora da última mudança: a releitura (a cada 5 s) só
// abre o que mudou. São dezenas de arquivos, de até dezenas de KB cada.
export type LeituraDoApp = Map<string, { mtimeMs: number; lido: ArquivoDoApp | null }>

// O que o app sabe de cada sessão, pelo id dela no Claude Code. Os arquivos ficam em
// <pasta do app>/<conta>/<ambiente>/local_<id>.json; sem a pasta (fora do macOS), vem vazio.
export async function lerArquivosDoApp($: EngineInterface, casa: string, cache: LeituraDoApp): Promise<Map<string, NoApp>> {
  const base = `${casa}/${PASTA_DO_APP}`
  const app = new Map<string, NoApp>()
  const vistos = new Set<string>()
  for (const a of await $.fs.list(base).catch(() => [])) {
    if (a.kind !== 'dir') continue
    for (const b of await $.fs.list(`${base}/${a.name}`).catch(() => [])) {
      if (b.kind !== 'dir') continue
      const pasta = `${base}/${a.name}/${b.name}`
      for (const f of await $.fs.list(pasta).catch(() => [])) {
        if (f.kind !== 'file' || !f.name.startsWith('local_') || !f.name.endsWith('.json')) continue
        const caminho = `${pasta}/${f.name}`
        vistos.add(caminho)
        let c = cache.get(caminho)
        // Sem a hora (0), relê sempre.
        if (!c || c.mtimeMs !== f.mtimeMs || f.mtimeMs === 0) {
          c = { mtimeMs: f.mtimeMs, lido: lerNoApp(await $.fs.read(caminho).catch(() => '')) }
          cache.set(caminho, c)
        }
        if (c.lido) app.set(c.lido.cli, mesclarNoApp(app.get(c.lido.cli), c.lido.info))
      }
    }
  }
  for (const caminho of cache.keys()) if (!vistos.has(caminho)) cache.delete(caminho)
  return app
}

// Leva o app para a sessão, como um clique nela na barra lateral. A API não abre `claude://` (o `Link` só abre
// `https:`), então vai pelo `open` do macOS. Diz se abriu.
export async function abrirNoApp($: EngineInterface, appId: string): Promise<boolean> {
  const link = linkDaSessao(appId)
  if (!link) return false
  const r = await $.process.run(['open', link]).catch(() => ({ exitCode: 1 }))
  return r.exitCode === 0
}
