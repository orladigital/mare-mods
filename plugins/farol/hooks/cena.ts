// A cena do topo do painel no app: céu, lua, estrelas, rochedo, a torre com galeria e o mar com o caminho da lua.
// A lanterna e os efeitos (feixes, halo, boia) dizem o estado de todas as sessões juntas. Lógica pura e SVG.
import type { Registro } from '../types'
import { visualDe } from './estado'

// As seis situações da cena, da mais urgente à mais calma.
export type Situacao = 'esperando' | 'esperando-e-nao-visto' | 'nao-visto' | 'trabalhando' | 'livres' | 'vazia'

// Só contam as sessões com sinal: a que parou de renovar o registro não acende nada.
export const situacaoDaCena = (lista: readonly Registro[], agora: number): Situacao => {
  const visuais = new Set(lista.map(r => visualDe(r, agora)))
  const esperando = visuais.has('esperando')
  const naoVisto = visuais.has('nao-visto')
  if (esperando) return naoVisto ? 'esperando-e-nao-visto' : 'esperando'
  if (naoVisto) return 'nao-visto'
  if (visuais.has('trabalhando')) return 'trabalhando'
  return visuais.has('livre') ? 'livres' : 'vazia'
}

// A altura da cena no painel, em pixels. A largura é a do painel: o desenho é feito para uma largura estimada e
// preenche a que vier (preserveAspectRatio "slice": corta um pouco das bordas em vez de deixar faixa vazia).
export const ALTURA_CENA = 70
const HORIZONTE = 44

// Os tons da cena. Ela é noturna nos dois temas do app.
const COR = {
  ceuAlto: '#06121F',
  ceuBaixo: '#10284A',
  horizonte: '#5E8FB8',
  mar: '#1A4C78',
  marFundo: '#12385A',
  lua: '#F3EEDC',
  rochedo: '#03080E',
  torre: '#E9E4D8',
  ferro: '#1B2633',
  feixe: '#F2907F',
  boia: '#8FBDF5',
  trelica: '#9FB3C8',
}

// A lanterna de cada situação e a respiração dela: a opacidade parte de 1 (o quadro parado), desce a `ate` e volta.
const LANTERNA: Record<Situacao, { cor: string; respira?: { dur: string; ate: number } }> = {
  esperando: { cor: '#F2907F', respira: { dur: '1.8s', ate: 0.45 } },
  'esperando-e-nao-visto': { cor: '#C3D7EC', respira: { dur: '1.8s', ate: 0.45 } },
  'nao-visto': { cor: '#C3D7EC', respira: { dur: '1.8s', ate: 0.45 } },
  trabalhando: { cor: '#F2C35B', respira: { dur: '6s', ate: 0.55 } },
  livres: { cor: '#B8E6C4', respira: { dur: '9s', ate: 0.8 } },
  vazia: { cor: '#2A3646' },
}

const ESTRELAS: readonly [number, number][] = [
  [0.04, 9], [0.09, 24], [0.24, 6], [0.3, 20], [0.37, 11], [0.47, 27], [0.53, 7], [0.61, 17], [0.66, 30],
  [0.82, 8], [0.88, 22], [0.95, 13],
]

const umaCasa = (x: number) => Math.round(x * 10) / 10

// Uma animação SMIL que repete sem parar; com o movimento desligado, nada.
const anima = (movimento: boolean, atributos: string) =>
  movimento ? `<animate ${atributos} repeatCount="indefinite"/>` : ''
const giro = (movimento: boolean, atributos: string) =>
  movimento ? `<animateTransform attributeName="transform" ${atributos} repeatCount="indefinite"/>` : ''

// Uma linha de ondas de ponta a ponta, na altura y.
const onda = (largura: number, y: number, passo: number, desvio: number) => {
  let d = `M${-desvio} ${y}`
  for (let x = -desvio; x < largura + passo; x += passo) d += ` q${passo / 4} -1.2 ${passo / 2} 0 t${passo / 2} 0`
  return d
}

const ceuEMar = (w: number, mov: boolean) => {
  const lx = umaCasa(w * 0.16)
  const estrelas = ESTRELAS.map(([fx, y]) => `<circle cx="${umaCasa(w * fx)}" cy="${y}" r="0.7" fill="#E8EEF6" opacity="0.8"/>`).join('')
  // O caminho da lua no mar: traços claros que alargam e somem em direção à praia.
  const caminho = [48, 52, 56, 60, 64, 68]
    .map((y, i) => `<line x1="${umaCasa(lx - 3 - i * 2.4)}" y1="${y}" x2="${umaCasa(lx + 3 + i * 2.4)}" y2="${y}" stroke="${COR.lua}" stroke-width="1.1" stroke-linecap="round" opacity="${umaCasa(0.6 - i * 0.08)}"/>`)
    .join('')
  return [
    `<rect width="${w}" height="${HORIZONTE}" fill="url(#ceu)"/>`,
    `<rect y="${HORIZONTE}" width="${w}" height="${ALTURA_CENA - HORIZONTE}" fill="url(#mar)"/>`,
    `<rect y="${HORIZONTE - 1}" width="${w}" height="1.4" fill="${COR.horizonte}" opacity="0.85"/>`,
    estrelas,
    `<circle cx="${lx}" cy="14" r="11" fill="${COR.lua}" opacity="0.1"/>`,
    `<circle cx="${lx}" cy="14" r="6" fill="${COR.lua}"/>`,
    `<g>${caminho}${anima(mov, 'attributeName="opacity" values="0.7;1;0.7" dur="5s"')}</g>`,
    `<path d="${onda(w, 50, 24, 0)}" fill="none" stroke="${COR.horizonte}" stroke-width="0.8" opacity="0.35"/>`,
    `<path d="${onda(w, 58, 30, 9)}" fill="none" stroke="${COR.horizonte}" stroke-width="0.8" opacity="0.3"/>`,
    `<path d="${onda(w, 66, 36, 17)}" fill="none" stroke="${COR.horizonte}" stroke-width="0.8" opacity="0.25"/>`,
  ].join('')
}

// O rochedo e a torre com galeria; a lanterna fica em (cx, 11).
const torre = (cx: number, s: Situacao, mov: boolean) => {
  const l = LANTERNA[s]
  const respira = l.respira ? anima(mov, `attributeName="opacity" values="1;${l.respira.ate};1" dur="${l.respira.dur}"`) : ''
  const brilho = l.respira
    ? `<circle cx="${cx}" cy="11" r="5" fill="${l.cor}" opacity="0.35">${anima(mov, `attributeName="opacity" values="0.35;0.1;0.35" dur="${l.respira.dur}"`)}</circle>`
    : ''
  const lanterna = `<rect id="lanterna" x="${cx - 2.5}" y="8.5" width="5" height="5" fill="${l.cor}">${respira}</rect>`
  return [
    `<polygon fill="${COR.rochedo}" points="${cx - 36},${HORIZONTE + 3} ${cx - 24},${HORIZONTE - 4} ${cx - 11},${HORIZONTE - 7} ${cx + 9},${HORIZONTE - 8} ${cx + 21},${HORIZONTE - 5} ${cx + 32},${HORIZONTE - 2} ${cx + 42},${HORIZONTE + 3}"/>`,
    `<polygon fill="${COR.torre}" points="${cx - 5},${HORIZONTE - 7} ${cx + 5},${HORIZONTE - 7} ${cx + 3.5},15 ${cx - 3.5},15"/>`,
    `<polygon fill="${COR.ferro}" opacity="0.75" points="${cx - 4.3},28 ${cx + 4.3},28 ${cx + 4},24 ${cx - 4},24"/>`,
    `<rect x="${cx - 5.5}" y="13.5" width="11" height="1.5" fill="${COR.ferro}"/>`,
    `<line x1="${cx - 5.5}" y1="12" x2="${cx + 5.5}" y2="12" stroke="${COR.ferro}" stroke-width="0.6"/>`,
    brilho,
    lanterna,
    `<polygon fill="${COR.ferro}" points="${cx - 3.5},8.5 ${cx},5 ${cx + 3.5},8.5"/>`,
  ].join('')
}

// Até onde os feixes vão a partir da lanterna.
const alcanceDoFeixe = (w: number) => umaCasa(Math.min(160, w * 0.45))

// Dois feixes vermelhos que giram em volta da lanterna (o giro visto de lado: encolhem e trocam de lado).
const feixes = (cx: number, w: number, mov: boolean) => {
  const c = alcanceDoFeixe(w)
  return (
    `<g id="feixes" transform="translate(${cx} 11)"><g>` +
    giro(mov, 'type="scale" values="1 1;0.06 1;-1 1;-0.06 1;1 1" keyTimes="0;0.25;0.5;0.75;1" dur="4s"') +
    `<polygon class="feixe" fill="url(#feixeD)" points="0,-1.3 ${c},-8 ${c},8 0,1.3"/>` +
    `<polygon class="feixe" fill="url(#feixeE)" opacity="0.6" points="0,-1.3 ${-c},-8 ${-c},8 0,1.3"/>` +
    '</g></g>'
  )
}

const halo = (cx: number, mov: boolean) =>
  `<circle id="halo" cx="${cx}" cy="11" r="10" fill="url(#halo-cor)">` +
  anima(mov, 'attributeName="r" values="10;13;10" dur="1.8s"') +
  anima(mov, 'attributeName="opacity" values="1;0.5;1" dur="1.8s"') +
  '</circle>'

// A boia de treliça no mar, com cone no alto e a luz azul respirando; balança devagar e faz ondas em volta.
const boia = (bx: number, mov: boolean) => {
  const ondas = mov
    ? [0, 1.5]
        .map(
          atraso =>
            `<ellipse cx="${bx}" cy="57.5" rx="6" ry="1.4" fill="none" stroke="${COR.boia}" stroke-width="0.7" opacity="0">` +
            anima(mov, `attributeName="rx" values="6;15" dur="3s" begin="${atraso}s"`) +
            anima(mov, `attributeName="opacity" values="0.6;0" dur="3s" begin="${atraso}s"`) +
            '</ellipse>',
        )
        .join('')
    : `<ellipse cx="${bx}" cy="57.5" rx="9" ry="1.6" fill="none" stroke="${COR.boia}" stroke-width="0.7" opacity="0.35"/>`
  return (
    `<g id="boia">${ondas}<g>` +
    giro(mov, `type="rotate" values="0 ${bx} 57;4 ${bx} 57;0 ${bx} 57;-4 ${bx} 57;0 ${bx} 57" dur="4s"`) +
    `<polygon fill="#2B3B4E" points="${bx - 6},55 ${bx + 6},55 ${bx + 4.5},58.5 ${bx - 4.5},58.5"/>` +
    `<path d="M${bx - 4} 55 L${bx - 1.5} 45 M${bx + 4} 55 L${bx + 1.5} 45 M${bx - 3.3} 52 L${bx + 2.3} 48 M${bx + 3.3} 52 L${bx - 2.3} 48 M${bx - 2.6} 49.5 L${bx + 2.6} 49.5" stroke="${COR.trelica}" stroke-width="0.8" fill="none"/>` +
    `<circle cx="${bx}" cy="44" r="4.5" fill="${COR.boia}" opacity="0.4">${anima(mov, 'attributeName="opacity" values="0.4;0.1;0.4" dur="1.8s"')}</circle>` +
    `<circle cx="${bx}" cy="44" r="1.6" fill="${COR.boia}">${anima(mov, 'attributeName="opacity" values="1;0.45;1" dur="1.8s"')}</circle>` +
    `<polygon fill="${COR.trelica}" points="${bx - 1.8},42.2 ${bx + 1.8},42.2 ${bx},38.8"/>` +
    '</g></g>'
  )
}

const definicoes = (w: number) =>
  '<defs>' +
  `<linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COR.ceuAlto}"/><stop offset="1" stop-color="${COR.ceuBaixo}"/></linearGradient>` +
  `<linearGradient id="mar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COR.mar}"/><stop offset="1" stop-color="${COR.marFundo}"/></linearGradient>` +
  `<linearGradient id="feixeD" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${alcanceDoFeixe(w)}" y2="0"><stop offset="0" stop-color="${COR.feixe}" stop-opacity="0.85"/><stop offset="1" stop-color="${COR.feixe}" stop-opacity="0"/></linearGradient>` +
  `<linearGradient id="feixeE" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${-alcanceDoFeixe(w)}" y2="0"><stop offset="0" stop-color="${COR.feixe}" stop-opacity="0.85"/><stop offset="1" stop-color="${COR.feixe}" stop-opacity="0"/></linearGradient>` +
  `<radialGradient id="halo-cor"><stop offset="0" stop-color="${COR.feixe}" stop-opacity="0.7"/><stop offset="1" stop-color="${COR.feixe}" stop-opacity="0"/></radialGradient>` +
  `<clipPath id="moldura"><rect width="${w}" height="${ALTURA_CENA}" rx="8"/></clipPath>` +
  '</defs>'

// A cena inteira. `largura` é a largura estimada do painel em pixels: o desenho se ajusta a ela, e o app ainda
// o estica ou corta um pouco para caber.
export const cenaSvg = (s: Situacao, movimento: boolean, largura = 400): string => {
  const w = Math.round(Math.max(240, Math.min(1000, largura)))
  const cx = Math.round(w * 0.72)
  const comFeixes = s === 'esperando' || s === 'esperando-e-nao-visto'
  const comBoia = s === 'nao-visto' || s === 'esperando-e-nao-visto'
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${ALTURA_CENA}" width="100%" height="${ALTURA_CENA}" preserveAspectRatio="xMidYMid slice">`,
    definicoes(w),
    '<g clip-path="url(#moldura)">',
    ceuEMar(w, movimento),
    comBoia ? boia(Math.round(w * 0.4), movimento) : '',
    comFeixes ? feixes(cx, w, movimento) : '',
    torre(cx, s, movimento),
    comFeixes ? halo(cx, movimento) : '',
    '</g></svg>',
  ].join('')
}

const DESCRICAO: Record<Situacao, string> = {
  esperando: 'Farol com a luz vermelha: há sessão esperando você',
  'esperando-e-nao-visto': 'Farol com os feixes vermelhos e a boia acesa: há sessão esperando você e resposta que você não viu',
  'nao-visto': 'Farol com a boia acesa: há resposta que você não viu',
  trabalhando: 'Farol com a luz âmbar: há sessão trabalhando',
  livres: 'Farol com a luz verde: todas as sessões livres',
  vazia: 'Farol apagado: nenhuma sessão dando sinal',
}

export const descricaoDaCena = (s: Situacao): string => DESCRICAO[s]
