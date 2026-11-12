// Os estados das sessões, a prioridade entre eles e os tempos, a partir dos registros em ~/.claude/farol/.
// Lógica pura: quem lê e grava os arquivos é o register.tsx.
import type { Estado, Registro } from '../types'

// Sem renovar o registro por mais que isto, a sessão fica sem sinal (travada ou fechada sem aviso).
export const SEM_SINAL_MS = 3 * 60_000
// Sem renovar por mais que isto, a sessão é esquecida.
export const ESQUECER_MS = 12 * 3600_000
export const SEM_TITULO = '(sem mensagem ainda)'
const TITULO_MAX = 70

// O que se mostra de uma sessão: o estado gravado, o não visto (só no app) ou o sem sinal.
export type Visual = Estado | 'nao-visto' | 'sem-sinal'

// A ordem é a prioridade: esperando > não visto > trabalhando > livre; sem sinal por último.
const VISUAL: Record<Visual, { rotulo: string; ordem: number }> = {
  esperando: { rotulo: 'Esperando', ordem: 0 },
  'nao-visto': { rotulo: 'Não visto', ordem: 1 },
  trabalhando: { rotulo: 'Trabalhando', ordem: 2 },
  livre: { rotulo: 'Livre', ordem: 3 },
  'sem-sinal': { rotulo: 'Sem sinal', ordem: 4 },
}

export const rotuloDe = (v: Visual): string => VISUAL[v].rotulo

export const visualDe = (r: Registro, agora: number): Visual =>
  agora - r.vivoEm > SEM_SINAL_MS ? 'sem-sinal' : r.estado === 'livre' && r.naoVisto ? 'nao-visto' : r.estado

// As sessões a mostrar, pela prioridade e, dentro dela, a mais recente primeiro; as esquecidas saem.
export const ordenar = (lista: readonly Registro[], agora: number): Registro[] =>
  lista
    .filter(r => agora - r.vivoEm < ESQUECER_MS)
    .sort((a, b) => VISUAL[visualDe(a, agora)].ordem - VISUAL[visualDe(b, agora)].ordem || b.desde - a.desde)

// O estado de todas juntas, que acende a faixa: o de maior prioridade entre as que têm sinal.
export const estadoGeral = (lista: readonly Registro[], agora: number): Estado | 'nao-visto' | 'nenhuma' => {
  const primeira = ordenar(lista, agora)[0]
  const v = primeira ? visualDe(primeira, agora) : 'sem-sinal'
  return v === 'sem-sinal' ? 'nenhuma' : v
}

export const esperandoAgora = (lista: readonly Registro[], agora: number): number =>
  lista.filter(r => visualDe(r, agora) === 'esperando').length

export const ha = (ms: number): string => {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return 'agora'
  const m = Math.round(s / 60)
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  return h < 24 ? `há ${h}h${String(m % 60).padStart(2, '0')}` : `há ${Math.floor(h / 24)}d`
}

// Título legível a partir do texto de uma mensagem: tira blocos de saída e marcações, mostra comando de shell
// como "$ …"; vazio quando é comando de barra, resumo de conversa retomada, interrupção ou não sobra texto.
export const tituloDe = (texto: string): string => {
  const inicio = texto.trim()
  if (/<command-name>/.test(texto) || inicio.startsWith('/')) return ''
  if (/^(This session is being continued|Caveat:)/.test(inicio)) return ''
  if (inicio.startsWith('[Request interrupted by user') || inicio.startsWith('Background (from the session that started this one)')) return ''
  const limpo = texto
    .replace(/<(bash-stdout|bash-stderr|system-reminder|local-command-stdout|local-command-stderr)>[\s\S]*?<\/\1>/g, ' ')
    .replace(/<bash-input>([\s\S]*?)<\/bash-input>/g, '$ $1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return limpo.length > TITULO_MAX ? `${limpo.slice(0, TITULO_MAX - 1)}…` : limpo
}

// O nome da pasta da sessão: a última parte do cwd, com / ou \ (Windows).
export const pastaDoRegistro = (cwd: string): string => cwd.split(/[\\/]/).filter(Boolean).pop() ?? cwd

const ESTADOS: readonly Estado[] = ['esperando', 'trabalhando', 'livre']

// O registro de outra sessão, lido do arquivo dela; um arquivo estragado ou de outro formato é ignorado. Só os
// campos gravados valem: o não visto e o id no app são calculados ao ler, pelo app, e não vêm do arquivo.
export const lerRegistro = (texto: string): Registro | null => {
  try {
    const r = JSON.parse(texto) as Partial<Registro>
    const valido =
      typeof r.id === 'string' &&
      typeof r.pasta === 'string' &&
      typeof r.titulo === 'string' &&
      typeof r.desde === 'number' &&
      typeof r.vivoEm === 'number' &&
      ESTADOS.includes(r.estado as Estado)
    if (!valido) return null
    const lido = { id: r.id, pasta: r.pasta, titulo: r.titulo, estado: r.estado, desde: r.desde, vivoEm: r.vivoEm } as Registro
    return typeof r.respondeuEm === 'number' ? { ...lido, respondeuEm: r.respondeuEm } : lido
  } catch {
    return null
  }
}

// A pasta da casa, que a API não dá: o HOME; vazio, o USERPROFILE (Windows); os dois vazios, nenhuma.
export const casaDe = (home: string | undefined, perfil: string | undefined): string | undefined =>
  home?.trim() || perfil?.trim() || undefined

// O tempo de uma sessão no painel: o da sem sinal conta desde a última renovação do registro; o das outras, desde
// que entraram no estado.
export const tempoDe = (r: Registro, agora: number): string =>
  ha(agora - (visualDe(r, agora) === 'sem-sinal' ? r.vivoEm : r.desde))

// A segunda linha de cada sessão no painel: "pasta · tempo · estado", e "esta sessão" na que está aberta aqui.
export const detalheDe = (r: Registro, agora: number, minha: string): string =>
  `${r.pasta} · ${tempoDe(r, agora)} · ${rotuloDe(visualDe(r, agora))}${r.id === minha ? ' · esta sessão' : ''}`
