import type { SessionRateLimit } from 'claude-code'

import { casas, misturar } from './praia'
import type { Pedaco } from './praia'

// Os horários saem no fuso de São Paulo, para todo mundo.
const TZ = 'America/Sao_Paulo'
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
// No painel, a janela fica amarela a partir de 50% e vermelha a partir daqui.
const LIMIAR_ALERTA = 80

// Hora local de São Paulo; sem Intl, cai no UTC-3 fixo (sem horário de verão desde 2019).
const partes = (iso: string): { dia: string; data: string; hora: string } | null => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  try {
    const f = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, weekday: 'short', day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(d)
    const get = (t: string) => f.find(p => p.type === t)?.value ?? ''
    const idx = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'))
    return { dia: DIAS[idx] ?? get('weekday'), data: `${get('day')}/${get('month')}`, hora: `${get('hour')}:${get('minute')}` }
  } catch {
    const l = new Date(d.getTime() - 3 * 3600_000)
    return {
      dia: DIAS[l.getUTCDay()] ?? '',
      data: `${pad(l.getUTCDate())}/${pad(l.getUTCMonth() + 1)}`,
      hora: `${pad(l.getUTCHours())}:${pad(l.getUTCMinutes())}`,
    }
  }
}

const restante = (iso: string, agora: number): string | null => {
  const ms = new Date(iso).getTime() - agora
  if (Number.isNaN(ms)) return null
  if (ms <= 0) return 'agora'
  const min = Math.round(ms / 60_000)
  const d = Math.floor(min / 1440)
  const h = Math.floor((min % 1440) / 60)
  const m = min % 60
  return d > 0 ? `em ${d}d ${h}h` : h > 0 ? `em ${h}h${String(m).padStart(2, '0')}` : `em ${m} min`
}

export const pctTxt = (pct: number) => `${Math.round(pct)}%`

export const corDe = (pct: number): 'error' | 'warning' | undefined =>
  pct >= LIMIAR_ALERTA ? 'error' : pct >= 50 ? 'warning' : undefined

export const sessaoDe = (limites: readonly SessionRateLimit[]) => limites.find(l => l.kind === 'five_hour')
export const semanaDe = (limites: readonly SessionRateLimit[]) => limites.find(l => l.kind === 'seven_day')

// As barras finas das janelas: a de 5h vai do verde-mar à areia e ao coral; a semanal é a cor da lua.
export const CORES_5H = ['#54C9C1', '#E2B55A', '#E08362'] as const
export const CORES_SEMANA = ['#A9C1C6'] as const


// A cor do ponto `t` (0 a 1) de uma escala de cores.
const tom = (escala: readonly string[], t: number): string => {
  if (escala.length === 1) return escala[0] ?? '#FFFFFF'
  const pos = Math.max(0, Math.min(1, t)) * (escala.length - 1)
  const i = Math.min(escala.length - 2, Math.floor(pos))
  return misturar(escala[i] ?? '#FFFFFF', escala[i + 1] ?? '#FFFFFF', pos - i)
}

// Terminal: a mesma barra de casas do contexto, cada casa na cor da escala.
export const barraTerminal = (pct: number, escala: readonly string[]): Pedaco[] => casas(pct, meio => tom(escala, meio / 100))

// App desktop: um trilho arredondado com a parte cheia em degradê.
export const ALTURA_FINA = 6
export const barraFinaSvg = (pct: number, escala: readonly string[], W: number): string => {
  const H = ALTURA_FINA
  const cheio = pct > 0 ? Math.max(1, Math.round((W * Math.min(100, pct)) / 100)) : 0
  const paradas = escala.map((c, i) => `<stop offset="${escala.length > 1 ? i / (escala.length - 1) : 0}" stop-color="${c}"/>`).join('')
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    `<defs><linearGradient id="tom" gradientUnits="userSpaceOnUse" x1="0" x2="${W}">${paradas}</linearGradient></defs>`,
    `<rect width="${W}" height="${H}" rx="${H / 2}" fill="#8A8F98" fill-opacity=".3"/>`,
    cheio > 0 ? `<rect width="${Math.max(H, cheio)}" height="${H}" rx="${H / 2}" fill="url(#tom)"/>` : '',
    '</svg>',
  ].join('')
}

// Uma janela na faixa: o rótulo, a barra, o % e o reset ("━━━━──── 42% - 17:00", "Sem. 70%").
export type Janela = { chave: 'sessao' | 'semana'; rotulo: string; pct: number; escala: readonly string[]; sufixo: string }

export const janelas = (limites: readonly SessionRateLimit[]): Janela[] => {
  const sessao = sessaoDe(limites)
  const semana = semanaDe(limites)
  const lista: Janela[] = []
  if (sessao) {
    const r = sessao.resetsAt ? partes(sessao.resetsAt) : null
    lista.push({ chave: 'sessao', rotulo: '', pct: sessao.percentUsed, escala: CORES_5H, sufixo: r ? ` - ${r.hora}` : '' })
  }
  if (semana) lista.push({ chave: 'semana', rotulo: 'Sem.', pct: semana.percentUsed, escala: CORES_SEMANA, sufixo: '' })
  return lista
}

// No app, o pôr do sol já diz que a barra é a janela de 5h; no terminal, ela leva o rótulo.
export const rotuloTerminal = (j: Janela): string => (j.chave === 'sessao' ? '5h' : j.rotulo)

// A janela em texto, como o terminal mostra.
export const janelaEmTexto = (j: Janela): string =>
  `${rotuloTerminal(j)} ${barraTerminal(j.pct, j.escala).map(p => p.texto).join('')} ${pctTxt(j.pct)}${j.sufixo}`

// Linhas do painel /barra-de-uso.
export const detalhar = (
  limites: readonly SessionRateLimit[],
  agora: number,
): { titulo: string; uso: string; reset: string; cor?: 'error' | 'warning' }[] => {
  const linha = (titulo: string, l: SessionRateLimit) => {
    const r = l.resetsAt ? partes(l.resetsAt) : null
    const falta = l.resetsAt ? restante(l.resetsAt, agora) : null
    const cheio = Math.max(0, Math.min(20, Math.round((l.percentUsed / 100) * 20)))
    return {
      titulo,
      uso: `${'█'.repeat(cheio)}${'░'.repeat(20 - cheio)} ${l.percentUsed}%`,
      reset: r ? `reset ${r.dia} ${r.data} às ${r.hora}${falta ? ` (${falta})` : ''}` : 'reset: sem horário informado',
      cor: corDe(l.percentUsed),
    }
  }
  const sessao = sessaoDe(limites)
  const semana = semanaDe(limites)
  return [
    ...(sessao ? [linha('Sessão (janela de 5h)', sessao)] : []),
    ...(semana ? [linha('Semana (janela de 7 dias)', semana)] : []),
  ]
}

// Os limites são da conta, não da sessão: uma medição que chega sem leitura (sessão recém-aberta, medição
// só de contexto) não apaga os números. Vale a última leitura guardada, até o reset de cada janela.
export const limitesVigentes = (
  novos: readonly SessionRateLimit[],
  guardados: readonly SessionRateLimit[],
  agora: number,
): SessionRateLimit[] =>
  novos.length > 0
    ? [...novos]
    : guardados.filter(l => !l.resetsAt || new Date(l.resetsAt).getTime() > agora)
