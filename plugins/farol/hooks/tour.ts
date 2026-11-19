// Os desenhos próprios do /farol demo no app: a abertura (a orla de dia) e o encerramento (a orla ao pôr do sol, com
// o farol aceso), vistos do calçadão de Copacabana, e os quatro cartões do "E tem mais". Lógica pura e SVG.
import { ALTURA_CENA, cenaSvg } from './cena'

export type Especial = 'abertura' | 'mais' | 'encerramento'

export type DesenhoDoTour = { svg: string; altura: number; alt: string }

const FONTE = 'font-family="-apple-system, BlinkMacSystemFont, system-ui, sans-serif"'
const umaCasa = (x: number) => Math.round(x * 10) / 10

// --- A abertura e o encerramento -----------------------------------------------------------------------------------

// A cena do farol, ampliada, em cima; o calçadão embaixo.
const ESCALA = 1.6
const ALTURA_CALCADAO = 40
const TOPO_DO_CALCADAO = Math.round(ALTURA_CENA * ESCALA)
export const ALTURA_DA_ORLA = TOPO_DO_CALCADAO + ALTURA_CALCADAO

// Os tons da cena do painel, que é noturna: a orla do tour troca cada um pelo da hora.
const NOITE = {
  ceuAlto: '#06121F',
  ceuBaixo: '#10284A',
  horizonte: '#5E8FB8',
  mar: '#1A4C78',
  marFundo: '#12385A',
  lua: '#F3EEDC',
  rochedo: '#03080E',
}

type Hora = 'dia' | 'entardecer'
type Paleta = typeof NOITE & {
  // A altura do sol no céu (a lua da cena fica em 14).
  alturaDoSol: number
  areia: string
  areiaClara: string
  pedraBranca: string
  pedraPreta: string
  postesAcesos: boolean
}

const PALETA: Record<Hora, Paleta> = {
  dia: {
    ceuAlto: '#4F9BD9',
    ceuBaixo: '#BFE3F7',
    horizonte: '#E6F4FC',
    mar: '#2C84C4',
    marFundo: '#1C66A3',
    lua: '#FFE27A',
    rochedo: '#3C4148',
    alturaDoSol: 13,
    areia: '#E3CF9E',
    areiaClara: '#F3E6C2',
    pedraBranca: '#F4F1EA',
    pedraPreta: '#262626',
    postesAcesos: false,
  },
  entardecer: {
    ceuAlto: '#3E2E66',
    ceuBaixo: '#F2915A',
    horizonte: '#FFD29A',
    mar: '#4A5E8B',
    marFundo: '#2D3962',
    lua: '#FFB45E',
    rochedo: '#1C1626',
    alturaDoSol: 37,
    areia: '#B8946C',
    areiaClara: '#D6B48C',
    pedraBranca: '#E8D9CA',
    pedraPreta: '#2A2228',
    postesAcesos: true,
  },
}

const POSTE = '#2B3540'
const LUZ_DO_POSTE = '#F2C35B'
const MEIO_FIO = '#4A4A4A'
const BRANCA = '#FFF4D6'

// As três linhas de ondas do mar da cena, pela altura: o comprimento de cada onda (o desenho se repete a cada um) e
// quanto tempo ela leva para correr um comprimento.
const ONDAS_DO_MAR: Record<string, { comprimento: number; dur: string }> = {
  '50': { comprimento: 24, dur: '3s' },
  '58': { comprimento: 30, dur: '4.5s' },
  '66': { comprimento: 36, dur: '6s' },
}

// As ondas do mar correndo para a esquerda sem parar: cada linha anda um comprimento de onda e recomeça, sem emenda.
const ondasCorrendo = (svg: string) =>
  svg.replace(/<path d="(M-?\d+ (50|58|66) [^"]*)"([^>]*)\/>/g, (inteira, d: string, y: string, resto: string) => {
    const onda = ONDAS_DO_MAR[y]
    if (!onda) return inteira
    return `<path d="${d}"${resto}><animateTransform attributeName="transform" type="translate" values="0 0;${-onda.comprimento} 0" dur="${onda.dur}" repeatCount="indefinite"/></path>`
  })

// A cena do painel com os tons da hora: o céu, o mar e o rochedo trocados, sem as estrelas, e a lua virando o sol
// (mais baixo ao pôr do sol); com o movimento, as ondas correm. Sem a moldura arredondada e a borda dela, que ficam
// no desenho inteiro.
const cenaDaHora = (wc: number, mov: boolean, p: Paleta) => {
  let svg = cenaSvg('livres', mov, wc)
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>$/, '')
    .replace(/<rect class="borda"[^>]*\/>/, '')
    .replace(/(<clipPath id="moldura"><rect[^>]*?) rx="8"/, '$1')
    .replace(/<circle [^>]*r="0\.7" fill="#E8EEF6"[^>]*\/>/g, '')
    .replace(/cy="14" r="11" fill="#F3EEDC" opacity="0\.1"/, `cy="14" r="11" fill="#F3EEDC" opacity="0.35"`)
    .replace(/cy="14"/g, `cy="${p.alturaDoSol}"`)
  for (const k of Object.keys(NOITE) as (keyof typeof NOITE)[]) svg = svg.split(NOITE[k]).join(p[k])
  return mov ? ondasCorrendo(svg) : svg
}

// Uma linha de ondas suaves de ponta a ponta, como as do calçadão.
const ondaDoCalcadao = (w: number, y: number, periodo: number, altura: number) => {
  let d = `M${-periodo} ${y}`
  for (let x = -periodo; x < w + periodo; x += periodo) d += ` q${periodo / 4} ${-altura} ${periodo / 2} 0 t${periodo / 2} 0`
  return d
}

// A faixa de areia e o calçadão de pedras brancas com as ondas pretas, com três postes (acesos ao pôr do sol).
const calcadao = (w: number, p: Paleta) => {
  const y = TOPO_DO_CALCADAO
  const ondas = [14, 23, 32]
    .map(dy => `<path d="${ondaDoCalcadao(w, y + dy, 36, 3.4)}" fill="none" stroke="${p.pedraPreta}" stroke-width="3.6"/>`)
    .join('')
  const postes = [0.08, 0.46, 0.92]
    .map(fx => {
      const x = Math.round(w * fx)
      const luz = p.postesAcesos
        ? `<circle cx="${x}" cy="${y - 23}" r="9" fill="url(#tour-luz-do-poste)"/><circle cx="${x}" cy="${y - 23}" r="2.2" fill="${LUZ_DO_POSTE}"/>`
        : `<circle cx="${x}" cy="${y - 23}" r="2.2" fill="#B9C2CB"/>`
      return `<line x1="${x}" y1="${y + 10}" x2="${x}" y2="${y - 22}" stroke="${POSTE}" stroke-width="2"/>${luz}`
    })
    .join('')
  return [
    `<rect y="${y}" width="${w}" height="7" fill="${p.areia}"/>`,
    `<rect y="${y}" width="${w}" height="1.2" fill="${p.areiaClara}"/>`,
    `<rect y="${y + 7}" width="${w}" height="${ALTURA_CALCADAO - 9}" fill="${p.pedraBranca}"/>`,
    `<g clip-path="url(#tour-pedras)">${ondas}</g>`,
    `<rect y="${y + ALTURA_CALCADAO - 2}" width="${w}" height="2" fill="${MEIO_FIO}"/>`,
    postes,
  ].join('')
}

// A luz do farol: o halo pulsando e os dois feixes girando sem parar. Ao pôr do sol, o farol aceso, forte; de dia,
// a luz fraca e mais lenta, que mal aparece contra o céu claro. Parado, só o halo.
const luzDoFarol = (cx: number, alcance: number, mov: boolean, forte: boolean) => {
  const dur = forte ? '4s' : '7s'
  const halo =
    `<circle cx="${cx}" cy="11" r="10" fill="url(#tour-halo)" opacity="${forte ? 1 : 0.6}">` +
    (mov ? `<animate attributeName="r" values="9;14;9" dur="${dur}" repeatCount="indefinite"/>` : '') +
    '</circle>'
  if (!mov) return halo
  return (
    halo +
    `<g transform="translate(${cx} 11)"><g opacity="${forte ? 1 : 0.4}">` +
    `<animateTransform attributeName="transform" type="scale" values="1 1;0.06 1;-1 1;-0.06 1;1 1" keyTimes="0;0.25;0.5;0.75;1" dur="${dur}" repeatCount="indefinite"/>` +
    `<polygon fill="url(#tour-feixe-d)" points="0,-2 ${alcance},-14 ${alcance},14 0,2"/>` +
    `<polygon fill="url(#tour-feixe-e)" points="0,-2 ${-alcance},-14 ${-alcance},14 0,2"/>` +
    '</g></g>'
  )
}

const orlaSvg = (largura: number, mov: boolean, hora: Hora): string => {
  const p = PALETA[hora]
  const w = Math.round(Math.max(240 * ESCALA, Math.min(1000, largura)))
  // A cena na largura que, ampliada, enche o desenho.
  const wc = Math.round(w / ESCALA)
  const cx = Math.round(wc * 0.72)
  const alcance = umaCasa(Math.min(160, wc * 0.45))
  const gradiente = (id: string, x2: number) =>
    `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${x2}" y2="0"><stop offset="0" stop-color="${BRANCA}" stop-opacity="0.85"/><stop offset="1" stop-color="${BRANCA}" stop-opacity="0"/></linearGradient>`
  // Ao pôr do sol, o farol acende forte; de dia, a luz é fraca.
  const forte = hora === 'entardecer'
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${ALTURA_DA_ORLA}" width="100%" height="${ALTURA_DA_ORLA}" preserveAspectRatio="xMidYMid slice">`,
    '<defs>',
    gradiente('tour-feixe-d', alcance) + gradiente('tour-feixe-e', -alcance),
    `<radialGradient id="tour-halo"><stop offset="0" stop-color="${BRANCA}" stop-opacity="0.9"/><stop offset="1" stop-color="${BRANCA}" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="tour-luz-do-poste"><stop offset="0" stop-color="${LUZ_DO_POSTE}" stop-opacity="0.55"/><stop offset="1" stop-color="${LUZ_DO_POSTE}" stop-opacity="0"/></radialGradient>`,
    `<clipPath id="tour-moldura"><rect width="${w}" height="${ALTURA_DA_ORLA}" rx="8"/></clipPath>`,
    `<clipPath id="tour-pedras"><rect y="${TOPO_DO_CALCADAO + 7}" width="${w}" height="${ALTURA_CALCADAO - 9}"/></clipPath>`,
    '</defs>',
    '<g clip-path="url(#tour-moldura)">',
    `<g transform="scale(${ESCALA})">${cenaDaHora(wc, mov, p)}${luzDoFarol(cx, alcance, mov, forte)}</g>`,
    calcadao(w, p),
    '</g>',
    '</svg>',
  ].join('')
}

// --- O "E tem mais": quatro cartões ilustrados -----------------------------------------------------------------------

const COR = {
  vermelho: '#FF5A4A',
  azul: '#6FA8FF',
  cartao: '#0F2236',
  bordaDoCartao: '#2B4A6B',
  texto: '#E8EEF6',
  textoApagado: '#9FB3C8',
  torre: '#E6E3DE',
}

const ALTURA_DO_CARTAO = 124
const VAO = 8

const texto = (x: number, y: number, tamanho: number, cor: string, conteudo: string, negrito = false) =>
  `<text x="${x}" y="${y}" ${FONTE} font-size="${tamanho}" fill="${cor}" text-anchor="middle"${negrito ? ' font-weight="700"' : ''}>${conteudo}</text>`

// A torre do farol na faixa, ao lado de uma barra de uso genérica, acima da caixa do prompt; a luz vermelha pisca.
const naFaixa = (cx: number, y: number, mov: boolean) => {
  const pisca = mov ? '<animate attributeName="opacity" values="1;0.25;1" dur="1.2s" repeatCount="indefinite"/>' : ''
  // A torre da faixa (26 × 16), ampliada.
  const torre =
    `<g transform="translate(${cx - 58} ${y + 12}) scale(1.4)">` +
    `<g fill="${COR.vermelho}">${pisca}<polygon opacity="0.8" points="11,4 0,1 0,7"/><polygon opacity="0.8" points="15,4 26,1 26,7"/><rect x="11" y="2.5" width="4" height="3"/></g>` +
    `<g fill="${COR.torre}"><polygon points="10.5,2.5 13,0.5 15.5,2.5"/><rect x="9.5" y="5.5" width="7" height="1"/><polygon points="10.5,6.5 15.5,6.5 17,15 9,15"/><rect x="7" y="15" width="12" height="1"/></g>` +
    '</g>'
  return (
    torre +
    `<rect x="${cx - 14}" y="${y + 26}" width="66" height="7" rx="3.5" fill="${COR.bordaDoCartao}"/>` +
    `<rect x="${cx - 14}" y="${y + 26}" width="40" height="7" rx="3.5" fill="#5E8FB8"/>` +
    `<rect x="${cx - 58}" y="${y + 42}" width="116" height="18" rx="6" fill="#1A2D44" stroke="#3A5878"/>` +
    `<rect x="${cx - 50}" y="${y + 49}" width="40" height="4" rx="2" fill="#3A5878"/>`
  )
}

// Um cartão de sessão (o esperando) com o ponteiro do mouse clicando nele: o clique leva à sessão.
const clicaveis = (cx: number, y: number, mov: boolean) => {
  const toque = mov
    ? '<animate attributeName="r" values="0;9;9" keyTimes="0;0.4;1" dur="1.6s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.9;0;0" keyTimes="0;0.4;1" dur="1.6s" repeatCount="indefinite"/>'
    : ''
  const px = cx + 22
  const py = y + 40
  return (
    `<rect x="${cx - 50}" y="${y + 14}" width="100" height="34" rx="6" fill="#4A1F1C" stroke="#E5534B" stroke-width="1.5"/>` +
    `<rect x="${cx - 42}" y="${y + 22}" width="58" height="5" rx="2.5" fill="#F6C9C3"/>` +
    `<rect x="${cx - 42}" y="${y + 33}" width="40" height="4" rx="2" fill="#B87872"/>` +
    `<rect x="${cx - 50}" y="${y + 52}" width="100" height="14" rx="5" fill="#16314C" stroke="${COR.bordaDoCartao}"/>` +
    `<circle cx="${px}" cy="${py}" r="${mov ? 0 : 6}" fill="none" stroke="${COR.texto}" stroke-width="1.4" opacity="${mov ? 0.9 : 0.6}">${toque}</circle>` +
    `<polygon points="${px},${py} ${px},${py + 15} ${px + 4},${py + 11} ${px + 7},${py + 17} ${px + 9.5},${py + 16} ${px + 6.5},${py + 10} ${px + 11},${py + 10}" fill="${COR.texto}" stroke="#0B0F14" stroke-width="0.8"/>`
  )
}

// O alto-falante com as ondas: duas vermelhas (o esperando) e duas azuis (a resposta não vista), pulsando em vez.
const sons = (cx: number, y: number, mov: boolean) => {
  const pulso = (atraso: number) =>
    mov ? `<animate attributeName="opacity" values="0.25;1;0.25" dur="2.4s" begin="${atraso}s" repeatCount="indefinite"/>` : ''
  const arco = (dx: number, abre: number, alto: number, cor: string, atraso: number) =>
    `<path d="M${cx + dx} ${y + 36 - alto} Q${cx + dx + abre} ${y + 36} ${cx + dx} ${y + 36 + alto}" fill="none" stroke="${cor}" stroke-width="2.4" stroke-linecap="round">${pulso(atraso)}</path>`
  return (
    `<rect x="${cx - 30}" y="${y + 29}" width="9" height="14" rx="1.5" fill="${COR.texto}"/>` +
    `<polygon points="${cx - 21},${y + 29} ${cx - 9},${y + 20} ${cx - 9},${y + 52} ${cx - 21},${y + 43}" fill="${COR.texto}"/>` +
    arco(-3, 7, 7, COR.vermelho, 0) +
    arco(3, 10, 12, COR.vermelho, 0.3) +
    arco(10, 13, 17, COR.azul, 1.2) +
    arco(17, 16, 22, COR.azul, 1.5)
  )
}

// Uma janela de terminal escura, com 🚨 2 na faixa e dois cartões de linha (o esperando e o trabalhando).
const noTerminal = (cx: number, y: number) =>
  `<rect x="${cx - 54}" y="${y + 8}" width="108" height="60" rx="5" fill="#0B0F14" stroke="#3A4656"/>` +
  [0, 1, 2].map(i => `<circle cx="${cx - 46 + i * 7}" cy="${y + 15}" r="2" fill="#3A4656"/>`).join('') +
  `<text x="${cx - 46}" y="${y + 33}" ${FONTE} font-size="10" fill="${COR.vermelho}" font-weight="700">🚨 2</text>` +
  `<rect x="${cx - 46}" y="${y + 39}" width="92" height="10" rx="2" fill="#C4564D"/>` +
  `<rect x="${cx - 46}" y="${y + 52}" width="92" height="10" rx="2" fill="#2E6F69"/>`

const CARTOES: readonly { titulo: string; linhas: [string, string]; desenho: (cx: number, y: number, mov: boolean) => string }[] = [
  { titulo: 'Na faixa', linhas: ['a torre acende com aviso', 'e um clique abre o painel'], desenho: naFaixa },
  { titulo: 'Cartões clicáveis', linhas: ['um clique num cartão leva', 'você àquela sessão (macOS)'], desenho: clicaveis },
  { titulo: 'Sons', linhas: ['ao esperar você e na', 'resposta não vista (macOS)'], desenho: sons },
  { titulo: 'No terminal', linhas: ['uma versão simplificada,', 'com 🚦 e 🚨 N na faixa'], desenho: noTerminal },
]

// Os quatro numa linha num painel largo; dois a dois num painel médio; um embaixo do outro num estreito.
const maisSvg = (largura: number, mov: boolean): DesenhoDoTour => {
  const w = Math.round(Math.max(240, Math.min(1000, largura)))
  const colunas = w >= 720 ? 4 : w >= 400 ? 2 : 1
  const linhas = Math.ceil(CARTOES.length / colunas)
  const cw = (w - (colunas - 1) * VAO) / colunas
  const altura = linhas * ALTURA_DO_CARTAO + (linhas - 1) * VAO
  const cartoes = CARTOES.map((c, i) => {
    const x = (i % colunas) * (cw + VAO)
    const y = Math.floor(i / colunas) * (ALTURA_DO_CARTAO + VAO)
    const cx = umaCasa(x + cw / 2)
    return (
      `<rect x="${umaCasa(x + 0.5)}" y="${y + 0.5}" width="${umaCasa(cw - 1)}" height="${ALTURA_DO_CARTAO - 1}" rx="10" fill="${COR.cartao}" stroke="${COR.bordaDoCartao}"/>` +
      c.desenho(cx, y, mov) +
      texto(cx, y + 86, 12, COR.texto, c.titulo, true) +
      texto(cx, y + 101, 10, COR.textoApagado, c.linhas[0]) +
      texto(cx, y + 114, 10, COR.textoApagado, c.linhas[1])
    )
  }).join('')
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${altura}" width="100%" height="${altura}" preserveAspectRatio="xMidYMid meet">${cartoes}</svg>`,
    altura,
    alt: 'Quatro cartões: a torre do farol na faixa, ao lado da barra de uso; os cartões clicáveis; os sons; e a versão do terminal',
  }
}

// O desenho de cada situação especial do tour, na largura estimada do painel.
export const desenhoDoTour = (especial: Especial, largura: number, movimento: boolean): DesenhoDoTour => {
  if (especial === 'mais') return maisSvg(largura, movimento)
  const deDia = especial === 'abertura'
  return {
    svg: orlaSvg(largura, movimento, deDia ? 'dia' : 'entardecer'),
    altura: ALTURA_DA_ORLA,
    alt: deDia
      ? 'O farol no mar, de dia, visto do calçadão de Copacabana'
      : 'O farol aceso ao pôr do sol, visto do calçadão de Copacabana',
  }
}
