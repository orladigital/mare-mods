import type { Ajustes, Ola, Semana } from '../types'

// Quem instala começa com as três barras, o Explain ligado, o 📋 desligado, o mar se mexendo no app e a
// semana só em número.
export const PADRAO: Ajustes = { explain: true, copiar: false, ola: 'ligada', semana: 'numero' }

const SEMANAS: Semana[] = ['numero', 'barra', 'escondida']

// A ola de versões antigas tinha "escrevendo" e "sempre"; as duas animavam no app, então valem "ligada".
const lerOla = (o: unknown): Ola => (o === 'desligada' ? 'desligada' : o === undefined ? PADRAO.ola : 'ligada')

// O que veio guardado, completado com o padrão (um ajuste novo numa versão futura nasce no padrão).
export const lerAjustes = (guardado: unknown): Ajustes => {
  const g = guardado !== null && typeof guardado === 'object' ? (guardado as Partial<Record<keyof Ajustes, unknown>>) : {}
  return {
    explain: typeof g.explain === 'boolean' ? g.explain : PADRAO.explain,
    copiar: typeof g.copiar === 'boolean' ? g.copiar : PADRAO.copiar,
    ola: lerOla(g.ola),
    semana: SEMANAS.includes(g.semana as Semana) ? (g.semana as Semana) : PADRAO.semana,
  }
}

const proximo = <T>(lista: readonly T[], atual: T, padrao: T): T => lista[(lista.indexOf(atual) + 1) % lista.length] ?? padrao
export const proximaSemana = (s: Semana): Semana => proximo(SEMANAS, s, PADRAO.semana)

export const NOME_OLA: Record<Ola, string> = {
  ligada: 'ligada (padrão)',
  desligada: 'desligada',
}

export const NOME_SEMANA: Record<Semana, string> = {
  numero: 'só número (padrão)',
  barra: 'com barra',
  escondida: 'escondida',
}

// O mar se mexe? Só no app, onde a animação é do próprio SVG; no terminal a barra é parada.
export const marAnimado = (ola: Ola, superficie: string): boolean => ola === 'ligada' && superficie !== 'terminal'

// Largura das barras no app, a mesma para as três: acompanha a largura da faixa de cada pessoa, de 64 a 96 px.
export const LARGURA_MIN = 64
export const LARGURA_MAX = 96
export const larguraDasBarras = (colunas: number): number =>
  Math.max(LARGURA_MIN, Math.min(LARGURA_MAX, Math.round(colunas * 0.8)))
