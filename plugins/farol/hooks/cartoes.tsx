// Os cartões do painel no app: um por sessão, com o título e "pasta · tempo · estado" à esquerda e um barco à
// direita, na cor do estado. O desenho saiu das prévias feitas no app.
import type { EngineInterface, RenderElement, RenderInput } from 'claude-code'

import type { Registro } from '../types'
import { detalheDe, rotuloDe, visualDe } from './estado'
import type { Visual } from './estado'

export const LARGURA_BARCO = 80
export const ALTURA_BARCO = 37

type Tons = {
  // O título vai num `Text`, que não sabe o tema do app: um tom médio, que se lê no claro e no escuro.
  titulo: string
  // A borda do aviso é cheia; a dos outros estados tem transparência: sobre o branco dá o tom claro da prévia, e no
  // escuro não brilha mais que a vermelha.
  borda: string
  fundo: string
  // O fundo com o mouse em cima do cartão: um tom a mais da mesma cor.
  realce: string
  casco: string
  // O aviso pisca: a bandeira e o casco, este no tom `claro`, uma ou duas vezes a cada 2,5 s.
  aviso?: { claro: string; vezes: 1 | 2 }
  bandeira?: string
  mastro: string
  esteira?: boolean
  esmaecido?: boolean
}

const TONS: Record<Visual, Tons> = {
  esperando: { titulo: '#C9433A', borda: '#D6453B', fundo: '#D6453B1F', realce: '#D6453B38', casco: '#D6453B', aviso: { claro: '#FF8A7A', vezes: 2 }, bandeira: '#D6453B', mastro: '#D6453B' },
  'nao-visto': { titulo: '#2F6FE0', borda: '#2F6FE0', fundo: '#2F6FE01F', realce: '#2F6FE038', casco: '#2F6FE0', aviso: { claro: '#7FB0FF', vezes: 1 }, bandeira: '#2F6FE0', mastro: '#2F6FE0' },
  trabalhando: { titulo: '#2E8C83', borda: '#4FB3A97A', fundo: '#4FB3A91A', realce: '#4FB3A933', casco: '#6AA59E', bandeira: '#2E6F68', mastro: '#2E6F68', esteira: true },
  livre: { titulo: '#5E7F8C', borda: '#5E7F8C99', fundo: '#5E7F8C1A', realce: '#5E7F8C33', casco: '#6F8E9A', mastro: '#5E7F8C' },
  'sem-sinal': { titulo: '#8A8478', borda: '#8A84784D', fundo: '#8A847812', realce: '#8A847826', casco: '#8A8478', mastro: '#8A8478', esmaecido: true },
}

export const tonsDoCartao = (v: Visual): Tons => TONS[v]

// O ritmo do aviso, a cada 2,5 s: dois lampejos de ~0,4 s no esperando, um de ~0,6 s no não visto.
const CICLO = '2.5s'
const RITMO = {
  2: { tempos: '0;0.08;0.16;0.24;0.32;1', vezes: (base: string, claro: string) => [base, claro, base, claro, base, base] },
  1: { tempos: '0;0.12;0.24;1', vezes: (base: string, claro: string) => [base, claro, base, base] },
} as const

// O barco de vela branca, com o casco na cor do estado; a bandeira e o casco piscam no ritmo do aviso.
export const barcoSvg = (v: Visual, movimento: boolean): string => {
  const t = TONS[v]
  const ritmo = movimento && t.aviso ? RITMO[t.aviso.vezes] : null
  const piscaBandeira = ritmo
    ? `<animate attributeName="opacity" values="${ritmo.vezes('0.3', '1').join(';')}" keyTimes="${ritmo.tempos}" dur="${CICLO}" repeatCount="indefinite"/>`
    : ''
  const piscaCasco =
    ritmo && t.aviso
      ? `<animate attributeName="fill" values="${ritmo.vezes(t.casco, t.aviso.claro).join(';')}" keyTimes="${ritmo.tempos}" dur="${CICLO}" repeatCount="indefinite"/>`
      : ''
  const bandeira = t.bandeira ? `<path id="bandeira" d="M66 6 L80 10 L66 14 Z" fill="${t.bandeira}">${piscaBandeira}</path>` : ''
  const esteira = t.esteira
    ? `<path id="esteira" d="M6 52 L28 52 M12 56 L34 56" stroke="${t.mastro}" stroke-opacity="0.6" stroke-width="1.4"/>`
    : ''
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 2 130 60" width="${LARGURA_BARCO}" height="${ALTURA_BARCO}">`,
    '<style>.vela{fill:#FFFFFF;stroke:#C9D2DA;stroke-width:0.6}@media (prefers-color-scheme: dark){.vela{fill:#E8EEF3;stroke:none}}</style>',
    t.esmaecido ? '<g opacity="0.85">' : '<g>',
    esteira,
    `<line x1="66" y1="6" x2="66" y2="46" stroke="${t.mastro}" stroke-width="1.6"/>`,
    bandeira,
    '<path class="vela" d="M64 12 L64 44 L40 44 Z"/>',
    '<path class="vela" d="M68 14 L68 44 L88 44 Z"/>',
    `<path id="casco" d="M34 46 L98 46 L90 56 L42 56 Z" fill="${t.casco}">${piscaCasco}</path>`,
    `<path d="M4 60 Q16 56 28 60 T52 60 T76 60 T100 60 T126 60" fill="none" stroke="${t.mastro}" stroke-opacity="0.45" stroke-width="1.2"/>`,
    '</g></svg>',
  ].join('')
}

// O botão do app só recebe texto, tira a cor e o negrito, tem uma linha só e é o único elemento com clique; e
// desenha o `label` mesmo com filhos. Por isso o texto é um `Text` com estilo e, por cima do cartão, vão três
// botões sem moldura, um sobre o outro, com rótulo de espaços não separáveis. Eles passam um pouco das bordas do
// cartão, que corta o que sobra (`overflow="hidden"`): o clique pega o cartão inteiro, e o "…" que o app põe no
// fim de um rótulo longo demais fica do lado de fora, sem precisar estimar a largura.
const COBERTURA = '\u00a0'.repeat(400)

export type DadosDosCartoes = {
  lista: readonly Registro[]
  agora: number
  minha: string
  movimento: boolean
  // O clique no cartão (a troca de sessão, no app no macOS).
  trocar: (r: Registro) => unknown
}

// Os cartões, na ordem em que vêm (o register.tsx já os ordena pela prioridade).
export function desenharCartoes($: EngineInterface, e: RenderInput<'Pane'>, d: DadosDosCartoes): RenderElement {
  const elementos = $.ui.resolve(e)
  const { Box, Text, Button } = elementos
  if (!('Svg' in elementos)) return <Box />
  const { Svg } = elementos

  const cartao = (r: Registro) => {
    const v = visualDe(r, d.agora)
    const t = TONS[v]
    return (
      <Box key={`cartao-${r.id}`} hover={{ backgroundColor: t.realce }} position="relative" overflow="hidden" flexDirection="row" alignItems="center" borderStyle="round" borderColor={t.borda} backgroundColor={t.fundo} paddingX={1} paddingY="xs">
        <Box flexGrow={1} flexShrink={1} minWidth={0} flexDirection="column" paddingRight={1} gap={0}>
          <Text bold color={t.titulo} wrap="truncate-end">{r.titulo}</Text>
          <Text dimColor wrap="truncate-end">{detalheDe(r, d.agora, d.minha)}</Text>
        </Box>
        <Box flexShrink={0}>
          <Svg key={`barco-${r.id}`} source={barcoSvg(v, d.movimento)} alt={`Barco: ${rotuloDe(v)}`} width={LARGURA_BARCO} height={ALTURA_BARCO} isInteractive={d.movimento || undefined} />
        </Box>
        <Box position="absolute" top={-1} left={0} right={-3} bottom={-1} flexDirection="column" justifyContent="center">
          {[1, 2, 3].map(i => (
            <Button key={`clique-${r.id}-${i}`} label={COBERTURA} plain onPress={() => void d.trocar(r)} />
          ))}
        </Box>
      </Box>
    )
  }

  return <Box flexDirection="column" gap={1}>{d.lista.map(cartao)}</Box>
}
