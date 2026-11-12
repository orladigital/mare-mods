// A cena do topo do painel no app: céu, lua, estrelas, rochedo, a torre com galeria e o mar com o caminho da lua.
// A lanterna e os efeitos (feixes, halo, reflexo, sinalizadores, boia) dizem o estado de todas as sessões juntas: o
// vermelho na lanterna e no céu, o azul nos feixes e na boia. Lógica pura e SVG.
import type { Registro } from '../types'
import { visualDe } from './estado'

// As sete situações da cena, da mais urgente à mais calma.
export type Situacao =
  | 'esperando'
  | 'esperando-e-nao-visto'
  | 'nao-visto'
  | 'trabalhando-e-nao-visto'
  | 'trabalhando'
  | 'livres'
  | 'vazia'

// Só contam as sessões com sinal: a que parou de renovar o registro não acende nada.
export const situacaoDaCena = (lista: readonly Registro[], agora: number): Situacao => {
  const visuais = new Set(lista.map(r => visualDe(r, agora)))
  const esperando = visuais.has('esperando')
  const naoVisto = visuais.has('nao-visto')
  const trabalhando = visuais.has('trabalhando')
  if (esperando) return naoVisto ? 'esperando-e-nao-visto' : 'esperando'
  if (naoVisto) return trabalhando ? 'trabalhando-e-nao-visto' : 'nao-visto'
  if (trabalhando) return 'trabalhando'
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
  vermelho: '#FF5A4A',
  azul: '#6FA8FF',
  ambar: '#F2C35B',
  branca: '#FFF4D6',
  trelica: '#9FB3C8',
  estouro: '#FFE1DC',
}

// A lanterna de cada situação: piscando (o vermelho), respirando (a opacidade parte de 1, o quadro parado, desce a
// `ate` e volta) ou fixa.
type Lanterna = { cor: string; pisca?: string; respira?: { dur: string; ate: number } }
const LANTERNA: Record<Situacao, Lanterna> = {
  esperando: { cor: COR.vermelho, pisca: '0.9s' },
  'esperando-e-nao-visto': { cor: COR.vermelho, pisca: '0.9s' },
  'nao-visto': { cor: COR.azul },
  'trabalhando-e-nao-visto': { cor: COR.ambar, respira: { dur: '6s', ate: 0.55 } },
  trabalhando: { cor: COR.ambar, respira: { dur: '6s', ate: 0.55 } },
  livres: { cor: COR.branca, respira: { dur: '9s', ate: 0.8 } },
  vazia: { cor: '#2A3646' },
}

// Os efeitos de cada situação. O vermelho: feixes, halo, reflexo e os sinalizadores; o azul: feixes (com o halo e o
// reflexo só quando a lanterna também é azul) e a boia; o âmbar: o halo.
type Efeitos = { vermelho?: boolean; feixesAzuis?: boolean; azulNaLanterna?: boolean; boia?: boolean; haloAmbar?: boolean }
const EFEITOS: Record<Situacao, Efeitos> = {
  esperando: { vermelho: true },
  'esperando-e-nao-visto': { vermelho: true, boia: true },
  'nao-visto': { feixesAzuis: true, azulNaLanterna: true, boia: true },
  'trabalhando-e-nao-visto': { feixesAzuis: true, haloAmbar: true, boia: true },
  trabalhando: { haloAmbar: true },
  livres: {},
  vazia: {},
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
  const efeito = l.pisca
    ? anima(mov, `attributeName="opacity" values="1;0.2;1" dur="${l.pisca}"`)
    : l.respira
      ? anima(mov, `attributeName="opacity" values="1;${l.respira.ate};1" dur="${l.respira.dur}"`)
      : ''
  const brilho = l.respira
    ? `<circle cx="${cx}" cy="11" r="5" fill="${l.cor}" opacity="0.35">${anima(mov, `attributeName="opacity" values="0.35;0.1;0.35" dur="${l.respira.dur}"`)}</circle>`
    : ''
  const lanterna = `<rect id="lanterna" x="${cx - 2.5}" y="8.5" width="5" height="5" fill="${l.cor}">${efeito}</rect>`
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

// Dois feixes largos que giram em volta da lanterna (o giro visto de lado: encolhem e trocam de lado).
const feixes = (cx: number, w: number, mov: boolean, cor: 'V' | 'A', id: string, dur: string) => {
  const c = alcanceDoFeixe(w)
  return (
    `<g id="${id}" transform="translate(${cx} 11)"><g>` +
    giro(mov, `type="scale" values="1 1;0.06 1;-1 1;-0.06 1;1 1" keyTimes="0;0.25;0.5;0.75;1" dur="${dur}"`) +
    `<polygon fill="url(#feixeD${cor})" points="0,-2 ${c},-14 ${c},14 0,2"/>` +
    `<polygon fill="url(#feixeE${cor})" points="0,-2 ${-c},-14 ${-c},14 0,2"/>` +
    '</g></g>'
  )
}

// O halo em volta da lanterna, pulsando forte.
const halo = (cx: number, mov: boolean, id: string, gradiente: string, dur: string, ate: number) =>
  `<circle id="${id}" cx="${cx}" cy="11" r="12" fill="url(#${gradiente})">` +
  anima(mov, `attributeName="r" values="10;${ate};10" dur="${dur}"`) +
  anima(mov, `attributeName="opacity" values="1;0.3;1" dur="${dur}"`) +
  '</circle>'

// O reflexo da lanterna no mar, abaixo do rochedo.
const reflexo = (cx: number, mov: boolean, gradiente: string, dur: string) =>
  `<rect id="reflexo" x="${cx - 4}" y="${HORIZONTE + 3}" width="8" height="22" fill="url(#${gradiente})">` +
  anima(mov, `attributeName="opacity" values="1;0.3;1" dur="${dur}"`) +
  '</rect>'

// Um sinalizador de socorro: sobe do mar, estoura e avermelha o céu. `atraso` desloca o ciclo de 3 s.
const sinal = (x: number, topo: number, w: number, atraso: number, mov: boolean) => {
  const t = `dur="3s" begin="${atraso}s"`
  return (
    '<g class="sinal">' +
    `<rect width="${w}" height="${HORIZONTE}" fill="url(#ceu-vermelho)" opacity="0">${anima(mov, `attributeName="opacity" values="0;0;0.9;0" keyTimes="0;0.4;0.5;1" ${t}`)}</rect>` +
    `<line x1="${x}" y1="${HORIZONTE}" x2="${x}" y2="${HORIZONTE}" stroke="${COR.vermelho}" stroke-width="1" opacity="0">` +
    anima(mov, `attributeName="y2" values="${HORIZONTE};${topo};${topo}" keyTimes="0;0.45;1" ${t}`) +
    anima(mov, `attributeName="opacity" values="0.8;0.8;0;0" keyTimes="0;0.45;0.6;1" ${t}`) +
    '</line>' +
    `<circle cx="${x}" cy="${topo}" r="0" fill="url(#halo-vermelho-cor)">` +
    anima(mov, `attributeName="r" values="0;0;12;16" keyTimes="0;0.45;0.55;1" ${t}`) +
    anima(mov, `attributeName="opacity" values="1;1;1;0" keyTimes="0;0.45;0.6;1" ${t}`) +
    '</circle>' +
    `<circle cx="${x}" cy="${topo}" r="0" fill="${COR.estouro}">${anima(mov, `attributeName="r" values="0;0;2.2;0" keyTimes="0;0.45;0.55;0.8" ${t}`)}</circle>` +
    '</g>'
  )
}

// Dois sinalizadores alternando: o céu pisca vermelho a cada 1,5 s.
const sinalizadores = (w: number, mov: boolean) =>
  `<g id="sinalizadores">${sinal(Math.round(w * 0.24), 10, w, 0, mov)}${sinal(Math.round(w * 0.44), 14, w, 1.5, mov)}</g>`

// A boia de treliça no mar, maior, com cone no alto, a luz azul com um lampejo duplo forte e o reflexo; balança
// devagar e faz ondas em volta.
const boia = (bx: number, mov: boolean) => {
  const pisca = 'attributeName="opacity" values="1;0.15;1;0.15;0.15" keyTimes="0;0.12;0.24;0.36;1" dur="1.6s"'
  const ondas = mov
    ? [0, 1.5]
        .map(
          atraso =>
            `<ellipse cx="${bx}" cy="57.5" rx="6" ry="1.4" fill="none" stroke="${COR.azul}" stroke-width="0.7" opacity="0">` +
            anima(mov, `attributeName="rx" values="6;15" dur="3s" begin="${atraso}s"`) +
            anima(mov, `attributeName="opacity" values="0.6;0" dur="3s" begin="${atraso}s"`) +
            '</ellipse>',
        )
        .join('')
    : `<ellipse cx="${bx}" cy="57.5" rx="9" ry="1.6" fill="none" stroke="${COR.azul}" stroke-width="0.7" opacity="0.35"/>`
  return (
    `<g id="boia" transform="translate(${bx} 57) scale(1.5) translate(${-bx} -57)">` +
    `<rect x="${bx - 3}" y="58" width="6" height="12" fill="url(#reflexo-azul)">${anima(mov, pisca)}</rect>` +
    `${ondas}<g>` +
    giro(mov, `type="rotate" values="0 ${bx} 57;4 ${bx} 57;0 ${bx} 57;-4 ${bx} 57;0 ${bx} 57" dur="4s"`) +
    `<polygon fill="#2B3B4E" points="${bx - 6},55 ${bx + 6},55 ${bx + 4.5},58.5 ${bx - 4.5},58.5"/>` +
    `<path d="M${bx - 4} 55 L${bx - 1.5} 45 M${bx + 4} 55 L${bx + 1.5} 45 M${bx - 3.3} 52 L${bx + 2.3} 48 M${bx + 3.3} 52 L${bx - 2.3} 48 M${bx - 2.6} 49.5 L${bx + 2.6} 49.5" stroke="${COR.trelica}" stroke-width="0.8" fill="none"/>` +
    `<circle cx="${bx}" cy="44" r="9" fill="url(#halo-azul-cor)">${anima(mov, pisca)}</circle>` +
    `<circle cx="${bx}" cy="44" r="1.6" fill="${COR.azul}">${anima(mov, 'attributeName="opacity" values="1;0.45;1" dur="1.8s"')}</circle>` +
    `<polygon fill="${COR.trelica}" points="${bx - 1.8},42.2 ${bx + 1.8},42.2 ${bx},38.8"/>` +
    '</g></g>'
  )
}

const feixeGradiente = (id: string, cor: string, x2: number) =>
  `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${x2}" y2="0"><stop offset="0" stop-color="${cor}" stop-opacity="0.9"/><stop offset="1" stop-color="${cor}" stop-opacity="0"/></linearGradient>`
const haloGradiente = (id: string, cor: string, opacidade: number) =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${cor}" stop-opacity="${opacidade}"/><stop offset="1" stop-color="${cor}" stop-opacity="0"/></radialGradient>`
const reflexoGradiente = (id: string, cor: string, opacidade: number) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${cor}" stop-opacity="${opacidade}"/><stop offset="1" stop-color="${cor}" stop-opacity="0"/></linearGradient>`

const definicoes = (w: number) => {
  const c = alcanceDoFeixe(w)
  return (
    '<defs>' +
    `<linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COR.ceuAlto}"/><stop offset="1" stop-color="${COR.ceuBaixo}"/></linearGradient>` +
    `<linearGradient id="mar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COR.mar}"/><stop offset="1" stop-color="${COR.marFundo}"/></linearGradient>` +
    feixeGradiente('feixeDV', COR.vermelho, c) +
    feixeGradiente('feixeEV', COR.vermelho, -c) +
    feixeGradiente('feixeDA', COR.azul, c) +
    feixeGradiente('feixeEA', COR.azul, -c) +
    haloGradiente('halo-vermelho-cor', COR.vermelho, 0.85) +
    haloGradiente('halo-azul-cor', COR.azul, 0.85) +
    haloGradiente('halo-ambar-cor', COR.ambar, 0.9) +
    reflexoGradiente('reflexo-vermelho', COR.vermelho, 0.75) +
    reflexoGradiente('reflexo-azul', COR.azul, 0.6) +
    `<radialGradient id="ceu-vermelho" cx="0.5" cy="1" r="0.9"><stop offset="0" stop-color="${COR.vermelho}" stop-opacity="0.5"/><stop offset="1" stop-color="${COR.vermelho}" stop-opacity="0"/></radialGradient>` +
    `<clipPath id="moldura"><rect width="${w}" height="${ALTURA_CENA}" rx="8"/></clipPath>` +
    '</defs>'
  )
}

// No tema escuro do app, uma borda clara em volta da cena, para ela não se confundir com o fundo do painel; no
// claro, o contraste já basta.
const ESTILO = '<style>.borda{fill:none;stroke:#FFFFFF;stroke-opacity:0}@media (prefers-color-scheme: dark){.borda{stroke-opacity:0.28}}</style>'

// A cena inteira. `largura` é a largura estimada do painel em pixels: o desenho se ajusta a ela, e o app ainda
// o estica ou corta um pouco para caber.
export const cenaSvg = (s: Situacao, movimento: boolean, largura = 400): string => {
  const w = Math.round(Math.max(240, Math.min(1000, largura)))
  const cx = Math.round(w * 0.72)
  const e = EFEITOS[s]
  const m = movimento
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${ALTURA_CENA}" width="100%" height="${ALTURA_CENA}" preserveAspectRatio="xMidYMid slice">`,
    ESTILO,
    definicoes(w),
    '<g clip-path="url(#moldura)">',
    ceuEMar(w, m),
    e.vermelho ? feixes(cx, w, m, 'V', 'feixes-vermelhos', '2s') : '',
    e.feixesAzuis ? feixes(cx, w, m, 'A', 'feixes-azuis', '5s') : '',
    e.vermelho ? halo(cx, m, 'halo-vermelho', 'halo-vermelho-cor', '1.2s', 20) : '',
    e.vermelho ? reflexo(cx, m, 'reflexo-vermelho', '1.2s') : '',
    e.vermelho ? sinalizadores(w, m) : '',
    e.azulNaLanterna ? halo(cx, m, 'halo-azul', 'halo-azul-cor', '1.8s', 17) : '',
    e.azulNaLanterna ? reflexo(cx, m, 'reflexo-azul', '1.8s') : '',
    e.haloAmbar ? halo(cx, m, 'halo-ambar', 'halo-ambar-cor', '2s', 18) : '',
    torre(cx, s, m),
    e.boia ? boia(Math.round(w * 0.4), m) : '',
    '</g>',
    `<rect class="borda" x="0.5" y="0.5" width="${w - 1}" height="${ALTURA_CENA - 1}" rx="8"/>`,
    '</svg>',
  ].join('')
}

const DESCRICAO: Record<Situacao, string> = {
  esperando: 'Farol com a luz vermelha piscando e sinalizadores no céu: há sessão esperando você',
  'esperando-e-nao-visto': 'Farol com a luz vermelha, sinalizadores e a boia azul acesa: há sessão esperando você e resposta que você não viu',
  'nao-visto': 'Farol com a luz azul e a boia acesa: há resposta que você não viu',
  'trabalhando-e-nao-visto': 'Farol com a luz âmbar, os feixes azuis e a boia acesa: há sessão trabalhando e resposta que você não viu',
  trabalhando: 'Farol com a luz âmbar: há sessão trabalhando',
  livres: 'Farol com a luz branca: todas as sessões livres',
  vazia: 'Farol apagado: nenhuma sessão dando sinal',
}

export const descricaoDaCena = (s: Situacao): string => DESCRICAO[s]
