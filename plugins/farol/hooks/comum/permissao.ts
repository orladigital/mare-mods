// Gerado de comum/permissao.ts por scripts/copiar-comum.mjs; não edite aqui.

// Quando um pedido de permissão aparece na sua tela: pelo modo da sessão e pelo log do app desktop.
// Usado pela barra de uso (Explain) e pelo farol (esperando você).
import type { EngineInterface } from 'claude-code'

// Ferramentas que o modo "aceitar edições" libera sem perguntar.
const EDICOES = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])

// Um "perguntar" da checagem vira pedido na sua tela? Manual e plano: sim. Aceitar edições: só fora das
// edições. Auto, bypass e "não perguntar": quem decide é o modo. Modo desconhecido (terminal): não, lá vale o
// evento de pedido de permissão.
export const modoPede = (modo: string | undefined, ferramenta: string): boolean => {
  if (modo === 'default' || modo === 'plan') return true
  if (modo === 'acceptEdits') return !EDICOES.has(ferramenta)
  return false
}

// Log do app desktop: ele registra cada pedido de permissão que mostra e cada resposta sua, em qualquer
// modo (no Auto, só os que o classificador mandou para você). Linhas que interessam:
//   Emitted tool permission request <pedido> for <ferramenta> in session <local_…>
//   Received permission response for <pedido>: <once|always|deny> (tool: <ferramenta>)
export const FILTRO_LOG_PERMISSAO = 'Emitted tool permission request|Received permission response'

const EMITIDO = /Emitted tool permission request (\S+) for \S+ in session (\S+)/
const RESPONDIDO = /Received permission response for ([^\s:]+):/

// Pedidos que já estão no log: os anteriores à checagem atual não contam.
export const pedidosNoLog = (log: string): Set<string> => {
  const ids = new Set<string>()
  for (const linha of log.split('\n')) {
    const m = EMITIDO.exec(linha)
    if (m?.[1]) ids.add(m[1])
  }
  return ids
}

// Os pedidos novos desta sessão no app desde a checagem: quantos apareceram na sua tela e quantos ainda esperam a
// sua resposta.
export const contarNoLog = (log: string, sessaoApp: string, conhecidos: ReadonlySet<string>): { emitidos: number; abertos: number } => {
  const meus = new Map<string, boolean>()
  for (const linha of log.split('\n')) {
    const e = EMITIDO.exec(linha)
    if (e?.[1] && e[2] === sessaoApp && !conhecidos.has(e[1])) {
      meus.set(e[1], false)
      continue
    }
    const r = RESPONDIDO.exec(linha)
    if (r?.[1] && meus.has(r[1])) meus.set(r[1], true)
  }
  return { emitidos: meus.size, abertos: [...meus.values()].filter(respondido => !respondido).length }
}

// Situação desta sessão no app desde a checagem: um pedido novo esperando você, um já respondido, ou nada.
export const situacaoNoLog = (log: string, sessaoApp: string, conhecidos: ReadonlySet<string>): 'aberto' | 'respondido' | 'nada' => {
  const { emitidos, abertos } = contarNoLog(log, sessaoApp, conhecidos)
  return abertos > 0 ? 'aberto' : emitidos > 0 ? 'respondido' : 'nada'
}

// As linhas do main.log com os pedidos e as respostas (as últimas 400). O log passa do limite do `$.fs.read`
// (4 MiB; ele gira perto de 10 MB), então vai pelo `grep`, que existe no macOS, o único sistema onde há esse log.
// Se falhar, vem vazio.
export async function lerLogDePermissoes($: EngineInterface, casa: string): Promise<string> {
  const log = `${casa}/Library/Logs/Claude/main.log`
  const r = await $.process.run(['grep', '-h', '-E', FILTRO_LOG_PERMISSAO, log]).catch(() => ({ stdout: '' }))
  return r.stdout.split('\n').slice(-400).join('\n')
}
