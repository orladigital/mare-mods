// Os sons do farol: o "esperando por você" quando esta sessão passa a esperar você e a "resposta não vista" quando
// ela responde fora da tela do app. Os WAV e o script que os gera estão em sons/, na pasta do mod.
import type { EngineInterface } from 'claude-code'

import type { Volume } from '../types'
import { lerAjustes } from './ajustes'
import type { AjusteLigado } from './ajustes'

export type Som = 'esperando' | 'nao-visto'

// Cada som: o arquivo, relativo à pasta do mod, e o ajuste que o liga.
const SONS: Record<Som, { arquivo: string; ajuste: AjusteLigado }> = {
  esperando: { arquivo: 'sons/esperando.wav', ajuste: 'somEsperando' },
  'nao-visto': { arquivo: 'sons/nao-visto.wav', ajuste: 'somNaoVisto' },
}

// O volume dos ajustes, como o ganho do som (os arquivos estão a 60% do máximo).
const GANHO: Record<Volume, number> = { baixo: 0.4, medio: 0.7, alto: 1 }

// Cada som, no máximo uma vez a cada 10 s nesta sessão: uma pergunta logo depois de outra não toca de novo.
const INTERVALO_MS = 10_000
const tocadoEm = new Map<Som, number>()

// Toca o som sem esperar o fim (a pergunta não espera o som acabar) e sem lançar: sem tocador (terminal no Linux ou
// no Windows), sem o arquivo ou num Claude Code sem a API de som, o farol segue igual. O ajuste se lê do que está
// guardado na hora de tocar: desligado no painel de outra sessão, vale aqui sem reiniciar esta.
export async function tocar($: EngineInterface, som: Som): Promise<void> {
  try {
    const { arquivo, ajuste } = SONS[som]
    const a = lerAjustes(await $.store.get('ajustes'))
    if (!a[ajuste]) return
    const t = await $.clock.now()
    const antes = tocadoEm.get(som)
    if (antes !== undefined && t - antes < INTERVALO_MS) return
    tocadoEm.set(som, t)
    void $.audio.play({ asset: arquivo }, { gain: GANHO[a.volume] }).catch(() => undefined)
  } catch {
    // sem som
  }
}
