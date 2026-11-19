// Os ajustes de cada pessoa, guardados no $.store (valem para todas as sessões).
import type { Ajustes, Intensidade, NaFaixa, Volume } from '../types'

// Quem instala começa com o farol na faixa, sem o número na torre do app, com a cena se mexendo, com os dois sons
// ligados no volume alto e na intensidade padrão.
export const PADRAO: Ajustes = {
  naFaixa: 'mostrar',
  contagem: false,
  movimento: true,
  somEsperando: true,
  somNaoVisto: true,
  intensidade: 'padrao',
  volume: 'alto',
}

const NA_FAIXA: readonly NaFaixa[] = ['mostrar', 'esconder']
const INTENSIDADES: readonly Intensidade[] = ['padrao', 'alta']
const VOLUMES: readonly Volume[] = ['baixo', 'medio', 'alto']

// Um ajuste de escolha: o valor guardado, se é uma das opções; senão, o padrão.
const escolha = <T extends string>(opcoes: readonly T[], valor: unknown, padrao: T): T =>
  opcoes.includes(valor as T) ? (valor as T) : padrao

// Os ajustes de ligar e desligar (as chaves de `Ajustes` com valor booleano).
export type AjusteLigado = { [K in keyof Ajustes]: Ajustes[K] extends boolean ? K : never }[keyof Ajustes]

// O que veio guardado, completado com o padrão (um ajuste novo numa versão futura nasce no padrão).
export const lerAjustes = (guardado: unknown): Ajustes => {
  const g = guardado !== null && typeof guardado === 'object' ? (guardado as Partial<Record<keyof Ajustes, unknown>>) : {}
  const ligado = (campo: AjusteLigado) =>
    typeof g[campo] === 'boolean' ? (g[campo] as boolean) : PADRAO[campo]
  return {
    naFaixa: escolha(NA_FAIXA, g.naFaixa, PADRAO.naFaixa),
    contagem: ligado('contagem'),
    movimento: ligado('movimento'),
    somEsperando: ligado('somEsperando'),
    somNaoVisto: ligado('somNaoVisto'),
    intensidade: escolha(INTENSIDADES, g.intensidade, PADRAO.intensidade),
    volume: escolha(VOLUMES, g.volume, PADRAO.volume),
  }
}

// O número de sessões esperando aparece na faixa? No terminal, sempre (🚨 N); no app, com o ajuste ou na Alta.
export const contagemNaFaixa = (a: Ajustes, superficie: string): boolean =>
  superficie === 'terminal' || a.contagem || a.intensidade === 'alta'

export const NOME_NA_FAIXA: Record<NaFaixa, string> = { mostrar: 'mostrar (padrão)', esconder: 'esconder' }
export const NOME_INTENSIDADE: Record<Intensidade, string> = { padrao: 'padrão', alta: 'alta' }
export const NOME_VOLUME: Record<Volume, string> = { baixo: 'baixo', medio: 'médio', alto: 'alto (padrão)' }
