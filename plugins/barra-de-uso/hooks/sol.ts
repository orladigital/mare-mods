// A janela de 5h no app é um pôr do sol: o céu vai do azul do dia ao laranja do fim de tarde e o sol desce
// em direção ao mar conforme a janela é usada. Em 100%, ele está metade dentro d'água: acabou a janela.
// No terminal, a janela fica na barra fina.

import { ALTURA } from './praia'
import { misturar } from './praia'

export const COR_SOL = {
  // O céu de cima e o de perto do horizonte, do começo ao fim da janela.
  ceuAlto: ['#7CC6F2', '#F2B36B', '#E0745A', '#7E4A8C'],
  ceuBaixo: ['#CDEFFB', '#FBE3B4', '#F7B68A', '#E07A5F'],
  sol: ['#FFE23A', '#FFBE0B', '#FF8A1A', '#F25A0A'],
  mar: '#2F6FE0',
  reflexo: '#FFD08A',
  // O céu por onde o sol já passou.
  noite: '#1B2A4E',
} as const

// A cor do ponto `t` (0 a 1) de uma escala.
const tom = (escala: readonly string[], t: number): string => {
  const pos = Math.max(0, Math.min(1, t)) * (escala.length - 1)
  const i = Math.min(escala.length - 2, Math.floor(pos))
  return misturar(escala[i] ?? '#FFFFFF', escala[i + 1] ?? '#FFFFFF', pos - i)
}

export const solSvg = (pct: number, W: number): string => {
  const H = ALTURA
  const t = Math.max(0, Math.min(100, pct)) / 100
  const horizonte = H - 4
  const r = H * 0.26
  const cx = r + 2 + t * (W - 2 * r - 4)
  const cy = H * 0.3 + t * (horizonte - H * 0.3)
  const sol = tom(COR_SOL.sol, t)
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    '<defs>',
    `<linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tom(COR_SOL.ceuAlto, t)}"/><stop offset="1" stop-color="${tom(COR_SOL.ceuBaixo, t)}"/></linearGradient>`,
    `<linearGradient id="passou" x1="0" x2="1"><stop offset="0" stop-color="${COR_SOL.noite}" stop-opacity=".55"/><stop offset="1" stop-color="${COR_SOL.noite}" stop-opacity=".12"/></linearGradient>`,
    `<clipPath id="moldura"><rect width="${W}" height="${H}" rx="5"/></clipPath>`,
    '</defs>',
    '<g clip-path="url(#moldura)">',
    `<rect width="${W}" height="${H}" fill="url(#ceu)"/>`,
    // O céu por onde o sol já passou escurece: mais escuro no começo da janela, quase nada perto do sol.
    t > 0 ? `<rect class="passou" width="${cx.toFixed(1)}" height="${horizonte}" fill="url(#passou)"/>` : '',
    // Um halo em volta do sol, para o olho achá-lo de relance.
    `<circle class="halo" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r * 1.8).toFixed(1)}" fill="${sol}" fill-opacity=".35"/>`,
    `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${sol}" stroke="#FFFFFF" stroke-opacity=".7" stroke-width=".8"/>`,
    `<rect y="${horizonte}" width="${W}" height="${H - horizonte}" fill="${COR_SOL.mar}"/>`,
    `<rect x="${(cx - r).toFixed(1)}" y="${horizonte + 1.5}" width="${(2 * r).toFixed(1)}" height="1" fill="${COR_SOL.reflexo}" fill-opacity=".7"/>`,
    '</g>',
    '</svg>',
  ].join('')
}
