// Os ajustes de cada pessoa, guardados no $.store (valem para todas as sessões).
import type { Ajustes, NaFaixa } from '../types'

// Quem instala começa com o farol na faixa, sem o número na torre do app, com a cena se mexendo e com os dois sons
// ligados.
export const PADRAO: Ajustes = { naFaixa: 'mostrar', contagem: false, movimento: true, somEsperando: true, somNaoVisto: true }

const NA_FAIXA: readonly NaFaixa[] = ['mostrar', 'esconder']

// Os ajustes de ligar e desligar (as chaves de `Ajustes` com valor booleano).
export type AjusteLigado = { [K in keyof Ajustes]: Ajustes[K] extends boolean ? K : never }[keyof Ajustes]

// O que veio guardado, completado com o padrão (um ajuste novo numa versão futura nasce no padrão).
export const lerAjustes = (guardado: unknown): Ajustes => {
  const g = guardado !== null && typeof guardado === 'object' ? (guardado as Partial<Record<keyof Ajustes, unknown>>) : {}
  const ligado = (campo: AjusteLigado) =>
    typeof g[campo] === 'boolean' ? (g[campo] as boolean) : PADRAO[campo]
  return {
    naFaixa: NA_FAIXA.includes(g.naFaixa as NaFaixa) ? (g.naFaixa as NaFaixa) : PADRAO.naFaixa,
    contagem: ligado('contagem'),
    movimento: ligado('movimento'),
    somEsperando: ligado('somEsperando'),
    somNaoVisto: ligado('somNaoVisto'),
  }
}

// O número de sessões esperando aparece na faixa? No terminal, sempre (🚨 N); no app, só com o ajuste.
export const contagemNaFaixa = (a: Ajustes, superficie: string): boolean => superficie === 'terminal' || a.contagem

export const NOME_NA_FAIXA: Record<NaFaixa, string> = { mostrar: 'mostrar (padrão)', esconder: 'esconder' }
