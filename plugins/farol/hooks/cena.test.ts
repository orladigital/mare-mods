import { describe, expect, test } from 'claude-code/testing'

import type { Registro } from '../types'
import { cenaSvg, situacaoDaCena } from './cena'

const T = 1_000_000_000
const reg = (id: string, estado: Registro['estado'], o: { vivoHaMs?: number; naoVisto?: boolean } = {}): Registro => ({
  id,
  pasta: 'exemplo',
  titulo: id,
  estado,
  desde: T,
  vivoEm: T - (o.vivoHaMs ?? 0),
  naoVisto: o.naoVisto,
})
const naoVista = (id: string) => reg(id, 'livre', { naoVisto: true })
const calada = (id: string) => reg(id, 'trabalhando', { vivoHaMs: 4 * 60_000 })

describe('a situação da cena do topo, pelo estado de todas as sessões', () => {
  test('ao menos uma esperando e nenhuma não vista: a lanterna vermelha', async () => {
    expect(situacaoDaCena([reg('a', 'esperando'), reg('b', 'trabalhando'), reg('c', 'livre')], T)).toBe('esperando')
  })

  test('esperando e não visto juntos', async () => {
    expect(situacaoDaCena([naoVista('a'), reg('b', 'esperando')], T)).toBe('esperando-e-nao-visto')
  })

  test('não visto com outras trabalhando: a situação dos dois juntos', async () => {
    expect(situacaoDaCena([naoVista('a'), reg('b', 'trabalhando')], T)).toBe('trabalhando-e-nao-visto')
  })

  test('só não visto: as outras livres', async () => {
    expect(situacaoDaCena([naoVista('a'), reg('b', 'livre')], T)).toBe('nao-visto')
  })

  test('trabalhando, sem aviso, mesmo com outras livres', async () => {
    expect(situacaoDaCena([reg('a', 'livre'), reg('b', 'trabalhando')], T)).toBe('trabalhando')
  })

  test('todas livres: as sem sinal não contam', async () => {
    expect(situacaoDaCena([reg('a', 'livre'), calada('b')], T)).toBe('livres')
  })

  test('sem sessões, ou só sem sinal: a lanterna apagada', async () => {
    expect(situacaoDaCena([], T)).toBe('vazia')
    expect(situacaoDaCena([calada('a')], T)).toBe('vazia')
  })

  test('uma esperando que parou de dar sinal não acende o vermelho', async () => {
    expect(situacaoDaCena([reg('a', 'esperando', { vivoHaMs: 4 * 60_000 }), reg('b', 'livre')], T)).toBe('livres')
  })
})

describe('o desenho da cena em cada situação', () => {
  // Cada peça tem o seu id no SVG.
  const lanterna = (svg: string) => svg.match(/<rect id="lanterna"[^>]*fill="([^"]+)"/)?.[1]
  const tem = (svg: string, id: string) => svg.includes(`id="${id}"`)
  // A duração do giro dos feixes de uma cor.
  const giroDe = (svg: string, id: string) => svg.match(new RegExp(`id="${id}"[\\s\\S]*?<animateTransform[^>]*dur="([^"]+)"`))?.[1]
  const PECAS = ['feixes-vermelhos', 'feixes-azuis', 'halo-vermelho', 'halo-azul', 'halo-ambar', 'reflexo', 'sinalizadores', 'boia'] as const
  const pecas = (svg: string) => PECAS.filter(p => tem(svg, p))

  test('esperando: a lanterna vermelha piscando, os feixes vermelhos largos (2 s), halo, reflexo e dois sinalizadores', async () => {
    const svg = cenaSvg('esperando', true)
    expect(lanterna(svg)).toBe('#FF5A4A')
    expect(pecas(svg)).toEqual(['feixes-vermelhos', 'halo-vermelho', 'reflexo', 'sinalizadores'])
    expect(giroDe(svg, 'feixes-vermelhos')).toBe('2s')
    expect(svg.match(/class="sinal"/g)?.length).toBe(2)
  })

  test('esperando e não visto: o mesmo, mais a boia azul', async () => {
    const svg = cenaSvg('esperando-e-nao-visto', true)
    expect(lanterna(svg)).toBe('#FF5A4A')
    expect(pecas(svg)).toEqual(['feixes-vermelhos', 'halo-vermelho', 'reflexo', 'sinalizadores', 'boia'])
  })

  test('só não visto: a lanterna azul, os feixes azuis largos (5 s), halo, reflexo e a boia', async () => {
    const svg = cenaSvg('nao-visto', true)
    expect(lanterna(svg)).toBe('#6FA8FF')
    expect(pecas(svg)).toEqual(['feixes-azuis', 'halo-azul', 'reflexo', 'boia'])
    expect(giroDe(svg, 'feixes-azuis')).toBe('5s')
  })

  test('trabalhando e não visto: a lanterna e o halo âmbar, os feixes azuis e a boia', async () => {
    const svg = cenaSvg('trabalhando-e-nao-visto', true)
    expect(lanterna(svg)).toBe('#F2C35B')
    expect(pecas(svg)).toEqual(['feixes-azuis', 'halo-ambar', 'boia'])
  })

  test('trabalhando: a lanterna âmbar com o halo âmbar; todas livres: a luz branca, sem efeito; vazia: apagada', async () => {
    const trabalhando = cenaSvg('trabalhando', true)
    expect(lanterna(trabalhando)).toBe('#F2C35B')
    expect(pecas(trabalhando)).toEqual(['halo-ambar'])
    const livres = cenaSvg('livres', true)
    expect(lanterna(livres)).toBe('#FFF4D6')
    expect(pecas(livres)).toEqual([])
    const vazia = cenaSvg('vazia', true)
    expect(pecas(vazia)).toEqual([])
    expect(vazia).not.toMatch(/<rect id="lanterna"[^>]*>\s*<animate/)
  })

  test('no tema escuro, uma borda clara em volta da cena; no claro, nenhuma', async () => {
    const svg = cenaSvg('livres', true)
    expect(svg).toContain('class="borda"')
    expect(svg).toMatch(/\.borda\{[^}]*stroke-opacity:0[;}]/)
    expect(svg).toMatch(/@media \(prefers-color-scheme: dark\)\{\.borda\{stroke-opacity:0\.28\}\}/)
  })

  test('com o movimento desligado, o primeiro quadro: as mesmas peças, sem animação', async () => {
    for (const s of ['esperando', 'esperando-e-nao-visto', 'nao-visto', 'trabalhando-e-nao-visto', 'trabalhando', 'livres', 'vazia'] as const) {
      const parada = cenaSvg(s, false)
      expect(parada).not.toMatch(/<animate/)
      expect(lanterna(parada)).toBe(lanterna(cenaSvg(s, true)))
      expect(pecas(parada)).toEqual(pecas(cenaSvg(s, true)))
    }
    // A animação parte do quadro parado: a lanterna acesa por inteiro, e só então pisca.
    expect(cenaSvg('esperando', true)).toMatch(/<rect id="lanterna"[^>]*>\s*<animate attributeName="opacity" values="1;/)
  })
})
