// O botão do farol na faixa acima do prompt: no app, a torre em SVG, com o feixe aceso quando uma sessão pede
// você; no terminal, 🚦 sem aviso e 🚨 N com N sessões esperando. Um clique abre o painel.
import type { EngineInterface, RenderElement, RenderInput } from 'claude-code'

import type { Ajustes, Registro } from '../types'
import { contagemNaFaixa } from './ajustes'
import { esperandoAgora, estadoGeral } from './estado'

// A área da torre na faixa, perto da dos outros botões. O desenho é feito em 26 × 16 e sai ampliado, com folga em
// volta (o viewBox).
export const LARGURA_TORRE = 34
export const ALTURA_TORRE = 24
const VIEWBOX = '-1.5 -2.4 29 20.5'

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

// O vermelho pisca (`pisca`, só no app e com o movimento ligado); o azul fica parado.
export const torreSvg = (luz: Luz, pisca = false): string => {
  const cor = luz ? CLASSE_DA_LUZ[luz] : null
  const piscando = pisca && luz === 'vermelha' ? '<animate attributeName="opacity" values="1;0.25;1" dur="1.2s" repeatCount="indefinite"/>' : ''
  const luzAcesa = cor
    ? `<g class="${cor}">${piscando}<polygon opacity="0.8" points="11,4 0,1 0,7"/><polygon opacity="0.8" points="15,4 26,1 26,7"/><rect x="11" y="2.5" width="4" height="3"/></g>`
    : '<rect class="t" opacity="0.55" x="11" y="2.5" width="4" height="3"/>'
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" width="${LARGURA_TORRE}" height="${ALTURA_TORRE}">`,
    '<style>.t{fill:#2B2B2B}.v{fill:#D6453B}.a{fill:#2F6FE0}',
    '@media (prefers-color-scheme: dark){.t{fill:#E6E3DE}.v{fill:#F2907F}.a{fill:#8FBDF5}}</style>',
    luzAcesa,
    '<polygon class="t" points="10.5,2.5 13,0.5 15.5,2.5"/>',
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
// torre vai um botão sem moldura de espaços não separáveis, um pouco menor que ela (maior, o app mostra "…"). O
// número da contagem é um botão próprio, com ele mesmo de rótulo, e não alarga o rótulo da torre.
const COBERTURA = ' '.repeat(9)

export type DadosDaFaixa = { lista: readonly Registro[]; agora: number; ajustes: Ajustes; abrir: () => unknown }

// O pedaço do farol na faixa, à esquerda do que os outros mods desenharam (`outros`). Os itens se alinham pela
// base no terminal, para quem deixa uma linha de espaço em cima descer junto.
export function desenharFaixa($: EngineInterface, e: RenderInput<'AbovePrompt'>, outros: RenderElement, d: DadosDaFaixa): RenderElement {
  const elementos = $.ui.resolve(e)
  const { Box, Button } = elementos
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
  // A torre vermelha pisca; animada, o app a desenha como página (isInteractive), e só enquanto pisca.
  const pisca = luz === 'vermelha' && d.ajustes.movimento
  return (
    <Box flexDirection="row" gap={2} alignItems="center">
      <Box flexDirection="row" alignItems="center" gap={1} flexShrink={0}>
        <Box position="relative" flexShrink={0}>
          <Svg key="torre" source={torreSvg(luz, pisca)} alt={descricaoDaTorre(luz, n)} width={LARGURA_TORRE} height={ALTURA_TORRE} isInteractive={pisca || undefined} />
          <Box position="absolute" top={0} left={0} right={0} bottom={0} justifyContent="center">
            <Button key="abrir-farol" label={COBERTURA} plain onPress={() => void d.abrir()} />
          </Box>
        </Box>
        {numero && <Button key="abrir-farol-numero" label={String(n)} plain onPress={() => void d.abrir()} />}
      </Box>
      {outros}
    </Box>
  )
}
