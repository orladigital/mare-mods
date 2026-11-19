// Os cartões do painel no app: um por sessão, com o título e "pasta · tempo · estado" à esquerda e um barco à
// direita, na cor do estado. O desenho saiu das prévias feitas no app.
import type { EngineInterface, RenderElement, RenderInput } from 'claude-code'

import type { Registro } from '../types'
import { detalheDe, esperaLonga, rotuloDe, tempoDe, visualDe } from './estado'
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
  pergunta: { titulo: '#C2643A', borda: '#E0835A', fundo: '#E0835A1F', realce: '#E0835A38', casco: '#E0835A', bandeira: '#E0835A', mastro: '#E0835A' },
  'nao-visto': { titulo: '#2F6FE0', borda: '#2F6FE0', fundo: '#2F6FE01F', realce: '#2F6FE038', casco: '#2F6FE0', aviso: { claro: '#7FB0FF', vezes: 1 }, bandeira: '#2F6FE0', mastro: '#2F6FE0' },
  trabalhando: { titulo: '#2E8C83', borda: '#4FB3A97A', fundo: '#4FB3A91A', realce: '#4FB3A933', casco: '#6AA59E', bandeira: '#2E6F68', mastro: '#2E6F68', esteira: true },
  livre: { titulo: '#5E7F8C', borda: '#5E7F8C99', fundo: '#5E7F8C1A', realce: '#5E7F8C33', casco: '#6F8E9A', mastro: '#5E7F8C' },
  'sem-sinal': { titulo: '#A39D92', borda: '#8A847833', fundo: '#8A84780A', realce: '#8A84781A', casco: '#8A8478', mastro: '#8A8478', esmaecido: true },
}

export const tonsDoCartao = (v: Visual): Tons => TONS[v]

// O ritmo do aviso sem o relógio do painel (um barco animado sozinho), a cada 2,5 s: dois lampejos de ~0,4 s no
// esperando, um de ~0,6 s no não visto. Com o relógio do painel (nas duas intensidades), o barco não se anima
// sozinho: o relógio (a cada 0,6 s) escolhe o desenho aceso ou o apagado, e a borda do cartão esperando troca de cor
// junto. Desenhos animados cada um no seu relógio nunca ficam juntos.
const CICLO = '2.5s'
const RITMO = {
  2: { tempos: '0;0.08;0.16;0.24;0.32;1', vezes: (base: string, claro: string) => [base, claro, base, claro, base, base] },
  1: { tempos: '0;0.12;0.24;1', vezes: (base: string, claro: string) => [base, claro, base, base] },
} as const

// O barco de vela branca, com o casco na cor do estado; a bandeira e o casco piscam juntos, nas mesmas duas cores (a
// do estado e o lampejo claro). `aceso`: a fase do relógio do painel (sem ele, a animação própria do barco).
export const barcoSvg = (v: Visual, movimento: boolean, aceso?: boolean): string => {
  const t = TONS[v]
  const ritmo = movimento && t.aviso ? RITMO[t.aviso.vezes] : null
  const pelaFase = aceso !== undefined && ritmo !== null && t.aviso !== undefined
  // Em contraponto à borda: com ela acesa, o barco fica na cor do estado (mais escuro); apagada, no lampejo claro.
  const cor = pelaFase && !aceso && t.aviso ? t.aviso.claro : t.casco
  const pisca =
    !ritmo || !t.aviso || pelaFase
      ? ''
      : `<animate attributeName="fill" values="${ritmo.vezes(t.casco, t.aviso.claro).join(';')}" keyTimes="${ritmo.tempos}" dur="${CICLO}" repeatCount="indefinite"/>`
  const bandeira = t.bandeira ? `<path id="bandeira" d="M66 6 L80 10 L66 14 Z" fill="${pelaFase ? cor : t.bandeira}">${pisca}</path>` : ''
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
    `<path id="casco" d="M34 46 L98 46 L90 56 L42 56 Z" fill="${cor}">${pisca}</path>`,
    `<path d="M4 60 Q16 56 28 60 T52 60 T76 60 T100 60 T126 60" fill="none" stroke="${t.mastro}" stroke-opacity="0.45" stroke-width="1.2"/>`,
    '</g></svg>',
  ].join('')
}

// A borda do cartão esperando na fase apagada do relógio do painel: a mesma cor, bem fraca.
const BORDA_APAGADA = `${TONS.esperando.borda}33`

// O botão do app só recebe texto, tira a cor e o negrito, tem uma linha só e é o único elemento com clique; e
// desenha o `label` mesmo com filhos. Por isso o texto é um `Text` com estilo e, por cima do cartão, vão três
// botões sem moldura, um sobre o outro, com rótulo de espaços não separáveis. Eles passam um pouco das bordas do
// cartão, que corta o que sobra (`overflow="hidden"`): o clique pega o cartão inteiro, e o "…" que o app põe no
// fim de um rótulo longo demais fica do lado de fora, sem precisar estimar a largura.
const COBERTURA = '\u00a0'.repeat(400)

// Na linha de baixo do cartão desta sessão, em negrito depois do resto (apagado).
const ESTA_SESSAO = ' · esta sessão'

export type DadosDosCartoes = {
  lista: readonly Registro[]
  agora: number
  minha: string
  movimento: boolean
  // A fase do relógio do painel (aceso ou apagado): os barcos que piscam e a borda do esperando a seguem,
  // juntos. Sem relógio (o painel parado), nada.
  aceso?: boolean
  // O clique no cartão (a troca de sessão, no app no macOS).
  trocar: (r: Registro) => unknown
}

// Os cartões, na ordem em que vêm (o register.tsx já os ordena pela prioridade).
export function desenharCartoes($: EngineInterface, e: RenderInput<'Pane'>, d: DadosDosCartoes): RenderElement {
  const elementos = $.ui.resolve(e)
  const { Box, Text, Button } = elementos
  if (!('Svg' in elementos)) return <Box />
  const { Svg } = elementos

  // "pasta · tempo · estado", apagada. Esta sessão leva "esta sessão" em negrito no fim; a espera longa, o tempo em
  // vermelho e negrito.
  const linhaDeBaixo = (r: Registro, minha: boolean) => {
    const longa = esperaLonga(r, d.agora)
    if (!minha && !longa) return <Text dimColor wrap="truncate-end">{detalheDe(r, d.agora, d.minha)}</Text>
    return (
      <Text wrap="truncate-end">
        <Text dimColor>{`${r.pasta} · `}</Text>
        <Text dimColor={!longa} bold={longa || undefined} color={longa ? TONS.esperando.titulo : undefined}>{tempoDe(r, d.agora)}</Text>
        <Text dimColor>{` · ${rotuloDe(visualDe(r, d.agora))}`}</Text>
        {minha && <Text bold>{ESTA_SESSAO}</Text>}
      </Text>
    )
  }

  // O cartão desta sessão tem o aspecto de uma aba selecionada: uma barra na cor cheia do estado à esquerda (o texto
  // afastado dela) e o fundo do estado um tom mais forte.
  const cartao = (r: Registro) => {
    const v = visualDe(r, d.agora)
    const t = TONS[v]
    const minha = r.id === d.minha
    // A borda do esperando troca de cor com o relógio do painel.
    const borda = v === 'esperando' && d.aceso === false ? BORDA_APAGADA : t.borda
    return (
      <Box key={`cartao-${r.id}`} hover={{ backgroundColor: t.realce }} position="relative" overflow="hidden" flexDirection="row" alignItems="center" borderStyle="round" borderColor={borda} backgroundColor={minha ? t.realce : t.fundo} paddingLeft={minha ? 2 : 1} paddingRight={1} paddingY="xs">
        {minha && <Box key={`aba-${r.id}`} position="absolute" top={0} bottom={0} left={0} width={1} backgroundColor={t.casco} />}
        <Box flexGrow={1} flexShrink={1} minWidth={0} flexDirection="column" paddingRight={1} gap={0}>
          <Text bold color={t.titulo} wrap="truncate-end">{r.titulo}</Text>
          {linhaDeBaixo(r, minha)}
        </Box>
        <Box flexShrink={0}>
          <Svg key={`barco-${r.id}`} source={barcoSvg(v, d.movimento, d.aceso)} alt={`Barco: ${rotuloDe(v)}`} width={LARGURA_BARCO} height={ALTURA_BARCO} isInteractive={(d.movimento && d.aceso === undefined) || undefined} />
        </Box>
        <Box position="absolute" top={-1} left={0} right={-3} bottom={-1} flexDirection="column" justifyContent="center">
          {[1, 2, 3].map(i => (
            <Button key={`clique-${r.id}-${i}`} label={COBERTURA} plain onPress={() => void d.trocar(r)} />
          ))}
        </Box>
      </Box>
    )
  }

  // O resumo no topo, como no terminal: só o que pede atenção ou está em curso (sem o livre e sem o sem sinal), nos
  // tons do cartão de cada estado. Pequeno (fonte "footnote"), com negrito só no esperando.
  const quantos = (v: Visual) => d.lista.filter(r => visualDe(r, d.agora) === v).length
  const resumo = NO_RESUMO.filter(x => quantos(x.estado) > 0).map(x => (
    <Box key={`resumo-${x.estado}`} borderStyle="round" borderColor={TONS[x.estado].borda} backgroundColor={TONS[x.estado].fundo} paddingX={1} paddingY={0} flexShrink={0}>
      <Text size="footnote" bold={x.estado === 'esperando' || undefined} color={TONS[x.estado].titulo}>{`${quantos(x.estado)} ${x.nome(quantos(x.estado))}`}</Text>
    </Box>
  ))

  return (
    <Box flexDirection="column" gap={1}>
      {resumo.length > 0 && (
        <Box key="resumo" flexDirection="row" flexWrap="wrap" gap={1}>
          {resumo}
        </Box>
      )}
      {d.lista.map(cartao)}
    </Box>
  )
}

const NO_RESUMO: readonly { estado: Visual; nome: (n: number) => string }[] = [
  { estado: 'esperando', nome: () => 'Esperando' },
  { estado: 'pergunta', nome: n => (n === 1 ? 'Pergunta' : 'Perguntas') },
  { estado: 'nao-visto', nome: n => (n === 1 ? 'Não visto' : 'Não vistos') },
  { estado: 'trabalhando', nome: () => 'Trabalhando' },
]
