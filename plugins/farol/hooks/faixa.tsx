// O botão do farol na faixa acima do prompt: no app, a torre em SVG, com o feixe aceso quando uma sessão pede
// você; no terminal, 🚦 sem aviso e 🚨 N com N sessões esperando. Um clique abre o painel.
import type { EngineInterface, RenderElement, RenderInput } from 'claude-code'

import type { Ajustes, Registro } from '../types'
import { contagemNaFaixa } from './ajustes'
import { esperandoAgora, estadoGeral } from './estado'

export const LARGURA_TORRE = 26
export const ALTURA_TORRE = 16

// A luz do feixe: vermelha com alguma sessão esperando; azul só com não visto (no app no macOS).
export type Luz = 'vermelha' | 'azul' | null

export const luzDaFaixa = (lista: readonly Registro[], agora: number): Luz => {
  const geral = estadoGeral(lista, agora)
  return geral === 'esperando' ? 'vermelha' : geral === 'nao-visto' ? 'azul' : null
}

// A torre em silhueta na cor do texto: o tema do app chega ao SVG pelo prefers-color-scheme (o mod não sabe
// o tema). O feixe sai da lanterna para os dois lados.
// A classe do SVG de cada luz; as cores de cada classe, nos dois temas, estão no <style> da torre.
const CLASSE_DA_LUZ = { vermelha: 'v', azul: 'a' } as const

export const torreSvg = (luz: Luz): string => {
  const cor = luz ? CLASSE_DA_LUZ[luz] : null
  const feixes = cor
    ? `<polygon class="${cor}" opacity="0.8" points="11,4 0,1 0,7"/><polygon class="${cor}" opacity="0.8" points="15,4 26,1 26,7"/>`
    : ''
  const lanterna = cor ? `<rect class="${cor}" x="11" y="2.5" width="4" height="3"/>` : '<rect class="t" opacity="0.55" x="11" y="2.5" width="4" height="3"/>'
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARGURA_TORRE} ${ALTURA_TORRE}" width="${LARGURA_TORRE}" height="${ALTURA_TORRE}">`,
    '<style>.t{fill:#2B2B2B}.v{fill:#D6453B}.a{fill:#2F6FE0}',
    '@media (prefers-color-scheme: dark){.t{fill:#E6E3DE}.v{fill:#F2907F}.a{fill:#8FBDF5}}</style>',
    feixes,
    '<polygon class="t" points="10.5,2.5 13,0.5 15.5,2.5"/>',
    lanterna,
    '<rect class="t" x="9.5" y="5.5" width="7" height="1"/>',
    '<polygon class="t" points="10.5,6.5 15.5,6.5 17,15 9,15"/>',
    '<rect class="t" x="7" y="15" width="12" height="1"/>',
    '</svg>',
  ].join('')
}

const sessoesEsperando = (n: number): string => (n === 1 ? '1 sessão esperando você' : n > 1 ? `${n} sessões esperando você` : 'nenhuma sessão esperando você')

export const descricaoDaTorre = (luz: Luz, n: number): string =>
  luz === 'azul' && n === 0 ? 'Farol: uma sessão respondeu e você não viu' : `Farol: ${sessoesEsperando(n)}`

export const rotuloTerminal = (n: number): string => (n > 0 ? `🚨 ${n}` : '🚦')

// O botão do app não aceita um SVG dentro (o desenho não sai) e é o único elemento com clique: por cima da
// torre vai um botão sem moldura de espaços não separáveis, um pouco menor que ela (maior, o app mostra "…").
const COBERTURA = ' '.repeat(7)
const COBERTURA_COM_NUMERO = ' '.repeat(11)

export type DadosDaFaixa = { lista: readonly Registro[]; agora: number; ajustes: Ajustes; abrir: () => unknown }

// O pedaço do farol na faixa, à esquerda do que os outros mods desenharam (`outros`). Os itens se alinham pela
// base no terminal, para quem deixa uma linha de espaço em cima descer junto.
export function desenharFaixa($: EngineInterface, e: RenderInput<'AbovePrompt'>, outros: RenderElement, d: DadosDaFaixa): RenderElement {
  const elementos = $.ui.resolve(e)
  const { Box, Text, Button } = elementos
  const n = esperandoAgora(d.lista, d.agora)
  if (e.surface === 'terminal' || !('Svg' in elementos)) {
    return (
      <Box flexDirection="row" gap={2} alignItems="flex-end">
        <Button key="abrir-farol" label={rotuloTerminal(n)} onPress={() => void d.abrir()} />
        {outros}
      </Box>
    )
  }
  const { Svg } = elementos
  const luz = luzDaFaixa(d.lista, d.agora)
  const numero = contagemNaFaixa(d.ajustes, e.surface) && n > 0
  return (
    <Box flexDirection="row" gap={2} alignItems="center">
      <Box position="relative" overflow="hidden" flexDirection="row" alignItems="center" gap={1} flexShrink={0}>
        <Svg key="torre" source={torreSvg(luz)} alt={descricaoDaTorre(luz, n)} width={LARGURA_TORRE} height={ALTURA_TORRE} />
        {numero && <Text bold>{String(n)}</Text>}
        <Box position="absolute" top={0} left={0} right={0}>
          <Button key="abrir-farol" label={numero ? COBERTURA_COM_NUMERO : COBERTURA} plain onPress={() => void d.abrir()} />
        </Box>
      </Box>
      {outros}
    </Box>
  )
}
