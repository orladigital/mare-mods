// A barra do contexto é uma praia: areia, o mar avançando conforme o contexto enche, e o calçadão no fim.
// Quando o mar passa do meio-fio (85%), vira ressaca e cobre a pedra de espuma: é hora de pensar num /compact.
// No app, a praia é um desenho; no terminal, uma barra em degradê que conta a mesma coisa pelas cores.

export type Pedaco = { texto: string; cor?: string; fundo?: string; apagado?: boolean; negrito?: boolean }

// Onde começa o calçadão, em % do contexto.
export const CALCADAO = 85

export const COR = {
  fundo: '#2F6FE0',
  beira: '#54C9C1',
  areia: '#F1DFA8',
  ressaca: '#54C9C1',
  // A espuma da ressaca no terminal: as casas depois do calçadão.
  espuma: '#CFF5F1',
} as const

const limitar = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

const rgb = (hex: string): number[] => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
const hex = (c: number[]): string => `#${c.map(v => limitar(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`
// A cor a `t` (0 a 1) do caminho entre `a` e `b`.
export const misturar = (a: string, b: string, t: number): string => {
  const x = rgb(a)
  const y = rgb(b)
  return hex(x.map((v, i) => v + ((y[i] ?? v) - v) * t))
}

// Terminal: as barras têm 10 casas de meia altura, as cheias cada uma na sua cor e as vazias apagadas.
// Sem animação: no terminal, cada movimento redesenharia a faixa.
export const CASAS = 10
const CASA = '▄'

// `corDaCasa` recebe o meio da casa, de 0 a 100%. Qualquer uso acima de zero já acende a primeira.
export const casas = (pct: number, corDaCasa: (meio: number) => string): Pedaco[] => {
  const cheias = pct > 0 ? limitar(Math.round((pct / 100) * CASAS), 1, CASAS) : 0
  return Array.from({ length: CASAS }, (_, i) =>
    i < cheias ? { texto: CASA, cor: corDaCasa(((i + 0.5) / CASAS) * 100) } : { texto: CASA, apagado: true },
  )
}

// O contexto no terminal: do azul fundo ao turquesa da beira até o calçadão; depois dele, espuma.
export const contextoTerminal = (pct: number): Pedaco[] =>
  casas(pct, meio => (meio > CALCADAO ? COR.espuma : misturar(COR.fundo, COR.beira, meio / CALCADAO)))

// App desktop: o mesmo desenho em SVG, com curvas. A animação (a beira indo e voltando e as faixas de
// brilho correndo) é do próprio SVG, então o mod não redesenha nada para o mar se mexer. A largura vem da
// faixa de cada pessoa; a altura é a mesma das outras cenas.
export const ALTURA = 16
// No app, o calçadão é mais claro e as ondas dele ficam recuadas, como fundo; o coqueiro é o destaque.
const CALCADAO_SVG = { pedra: '#E4E1DA', desenho: '#B9B4AA', meioFio: '#B5AFA3' } as const
const COQUEIRO = { tronco: '#5E4220', copa: '#1F6E3F' } as const
const PERIODO_OLA = 44
const SUAVE = '.45 0 .55 1;.45 0 .55 1'

// O coqueiro nasce no calçadão e se inclina um pouco para a areia; um contorno branco leve o separa das
// ondas da calçada.
const coqueiro = (cx: number, H: number): string => {
  const base = cx + 3
  const topoX = base - 3.5
  const topoY = H * 0.275
  const tronco = `M${base},${H} Q${base - 0.7},${H * 0.6} ${topoX},${topoY}`
  const copa = [
    `M${topoX},${topoY} q-4.2,-1.8 -6.3,1.9`,
    `M${topoX},${topoY} q4,-2.4 6,1.3`,
    `M${topoX},${topoY} q-1.2,-3.6 -4.2,-4`,
    `M${topoX},${topoY} q2.2,-3.6 5.2,-3`,
  ].join(' ')
  const traco = (d: string, cor: string, largura: number, opacidade = 1) =>
    `<path d="${d}" stroke="${cor}" stroke-width="${largura}" stroke-opacity="${opacidade}" fill="none" stroke-linecap="round"/>`
  return [
    traco(tronco, '#FFFFFF', 2.8, 0.7),
    traco(copa, '#FFFFFF', 2.8, 0.7),
    traco(tronco, COQUEIRO.tronco, 1.7),
    traco(copa, COQUEIRO.copa, 1.7),
  ].join('')
}

// A areia não é de uma cor só: logo depois da água ela está molhada, mais escura, e clareia até a areia
// seca; mais adiante, grãos claros e escuros dão textura.
const AREIA_SVG = { molhada: '#C9AE6C', largura: 16, grao: ['#D9C38A', '#FFF3D0', '#E2CC93'] } as const
// Os grãos, em posições fixas dentro da areia seca (x de 0 a 1), com o raio e a cor de cada um.
const GRAOS: readonly [number, number, number, number][] = [
  [0.08, 0.25, 0.5, 0], [0.17, 0.7, 0.45, 1], [0.26, 0.4, 0.4, 0], [0.34, 0.85, 0.5, 2], [0.42, 0.15, 0.4, 1],
  [0.5, 0.6, 0.45, 0], [0.58, 0.3, 0.4, 2], [0.66, 0.8, 0.5, 1], [0.74, 0.5, 0.4, 0], [0.82, 0.2, 0.45, 2],
  [0.9, 0.7, 0.4, 0], [0.13, 0.5, 0.35, 2], [0.38, 0.6, 0.35, 0], [0.62, 0.55, 0.35, 1], [0.86, 0.45, 0.35, 0],
]

const areiaSvg = (fr: number, cx: number, H: number): string => {
  const fimMolhada = fr + AREIA_SVG.largura + 2
  const molhada = `<path class="molhada" d="M${fr},0 C${fr + 4},${H * 0.33} ${fr - 4},${H * 0.66} ${fr},${H} L${fimMolhada},${H} L${fimMolhada},0 Z" fill="url(#molhada)"/>`
  // Os grãos ficam só na areia seca, depois da molhada e antes do meio-fio.
  const ini = fr + AREIA_SVG.largura / 2
  const fim = cx - 1
  const graos =
    fim - ini < 4
      ? ''
      : GRAOS.map(
          ([x, y, r, c]) =>
            `<circle class="grao" cx="${(ini + x * (fim - ini)).toFixed(1)}" cy="${(y * H).toFixed(1)}" r="${r}" fill="${AREIA_SVG.grao[c] ?? AREIA_SVG.grao[0]}"/>`,
        ).join('')
  return molhada + graos
}

// Bolhas pequenas da espuma, em posições fixas dentro do trecho de calçadão que a água cobriu (x de 0 a 1).
const BOLHAS: readonly [number, number, number, number][] = [
  [0.1, 0.2, 0.45, 0.7], [0.3, 0.55, 0.35, 0.6], [0.5, 0.15, 0.4, 0.8], [0.2, 0.85, 0.5, 0.65],
  [0.65, 0.7, 0.35, 0.75], [0.8, 0.35, 0.45, 0.9], [0.45, 0.95, 0.3, 0.6], [0.9, 0.75, 0.4, 0.85],
  [0.7, 0.05, 0.3, 0.7], [0.35, 0.35, 0.3, 0.55], [0.85, 0.55, 0.35, 0.8], [0.55, 0.45, 0.3, 0.65],
]

// Ressaca: a água passou do meio-fio e invade o calçadão como espuma. Ela clareia em direção à frente da
// onda, ganha uma borda rendada e bolhas pequenas.
const ressacaSvg = (cx: number, fr: number, H: number): string => {
  const largura = fr - cx
  let renda = `M${(fr - 1.2).toFixed(1)},0`
  for (let y = 0; y < H; y += 2.3) renda += ' q1.6,1.15 0,2.3'
  const bolhas = BOLHAS.map(
    ([x, y, r, o]) => `<circle cx="${(cx + x * largura).toFixed(1)}" cy="${(y * H).toFixed(1)}" r="${r}" fill="#fff" fill-opacity="${o}"/>`,
  ).join('')
  return [
    `<rect x="${cx}" width="${largura}" height="${H}" fill="${COR.ressaca}"/>`,
    `<rect class="veu" x="${cx}" width="${largura}" height="${H}" fill="url(#veu)"/>`,
    bolhas,
    `<path d="${renda}" stroke="#fff" stroke-width="1.3" stroke-opacity=".95" fill="none"/>`,
  ].join('')
}

export const praiaSvg = (pct: number, animado: boolean, W: number): string => {
  const H = ALTURA
  const cx = Math.round((W * CALCADAO) / 100)
  const fr = Math.max(4, Math.round((W * limitar(pct, 0, 100)) / 100))
  const ressaca = fr > cx
  const beira = (dx: number, o: number) =>
    `M0,0 L${fr + o},0 C${fr + o + dx},${H * 0.33} ${fr + o - dx},${H * 0.66} ${fr + o},${H} L0,${H} Z`

  // O calçadão de Copacabana com respiro: duas ondas largas, que cabem nos poucos pixels do fim da barra.
  const listras = [H * 0.34, H * 0.72]
    .map(y => `<path d="M${cx},${y.toFixed(1)} q3.5,-3 7,0 t7,0 t7,0" stroke="${CALCADAO_SVG.desenho}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`)
    .join('')

  const vaiEVem = animado
    ? `<animate attributeName="d" dur="5.5s" repeatCount="indefinite" calcMode="spline" keySplines="${SUAVE}" values="${beira(4, 0)};${beira(-4, -5)};${beira(4, 0)}"/>`
    : ''
  const ola = animado
    ? `<rect x="${-PERIODO_OLA}" width="${W + PERIODO_OLA}" height="${H}" fill="url(#ola)"><animateTransform attributeName="transform" type="translate" dur="3.6s" repeatCount="indefinite" values="0,0;${PERIODO_OLA},0"/></rect>`
    : ''
  const espumaVaiEVem = animado
    ? `<animateTransform attributeName="transform" type="translate" dur="5.5s" repeatCount="indefinite" calcMode="spline" keySplines="${SUAVE}" values="0,0;-5,0;0,0"/>`
    : ''

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    '<defs>',
    `<linearGradient id="mar" x1="0" x2="1"><stop offset="0" stop-color="${COR.fundo}"/><stop offset="1" stop-color="${COR.beira}"/></linearGradient>`,
    `<linearGradient id="ola" gradientUnits="userSpaceOnUse" x1="0" x2="${PERIODO_OLA}" spreadMethod="repeat"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".26"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`,
    `<linearGradient id="molhada" gradientUnits="userSpaceOnUse" x1="${fr}" x2="${fr + AREIA_SVG.largura}"><stop offset="0" stop-color="${AREIA_SVG.molhada}"/><stop offset="1" stop-color="${COR.areia}"/></linearGradient>`,
    `<linearGradient id="veu" gradientUnits="userSpaceOnUse" x1="${cx}" x2="${fr}"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity=".75"/></linearGradient>`,
    `<clipPath id="agua"><path d="${beira(4, 0)}">${vaiEVem}</path></clipPath>`,
    `<clipPath id="moldura"><rect width="${W}" height="${H}" rx="5"/></clipPath>`,
    '</defs>',
    '<g clip-path="url(#moldura)">',
    `<rect width="${W}" height="${H}" fill="${COR.areia}"/>`,
    areiaSvg(fr, cx, H),
    `<rect x="${cx}" width="${W - cx}" height="${H}" fill="${CALCADAO_SVG.pedra}"/>`,
    listras,
    `<rect x="${cx - 1}" width="1.2" height="${H}" fill="${CALCADAO_SVG.meioFio}"/>`,
    '<g clip-path="url(#agua)">',
    `<rect width="${W}" height="${H}" fill="url(#mar)"/>`,
    ressaca ? ressacaSvg(cx, fr, H) : '',
    ola,
    '</g>',
    `<path fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="1.8" d="M${fr + 1.5},0 C${fr + 5.5},${H * 0.33} ${fr - 2.5},${H * 0.66} ${fr + 1.5},${H}">${espumaVaiEVem}</path>`,
    coqueiro(cx, H),
    '</g>',
    '</svg>',
  ].join('')
}
