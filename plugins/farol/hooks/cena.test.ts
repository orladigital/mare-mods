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

  test('só não visto, mesmo com outras trabalhando', async () => {
    expect(situacaoDaCena([naoVista('a'), reg('b', 'trabalhando')], T)).toBe('nao-visto')
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
  // A lanterna, os feixes, o halo e a boia, cada um com o seu id no SVG.
  const lanterna = (svg: string) => svg.match(/<rect id="lanterna"[^>]*fill="([^"]+)"/)?.[1]
  const tem = (svg: string, id: string) => svg.includes(`id="${id}"`)
  // A respiração da lanterna: a duração da animação de opacidade logo depois dela.
  const respiracao = (svg: string) => svg.match(/<rect id="lanterna"[^>]*>\s*<animate attributeName="opacity"[^>]*dur="([^"]+)"/)?.[1]

  test('esperando: lanterna vermelha respirando em 1,8 s, dois feixes vermelhos e halo; sem boia', async () => {
    const svg = cenaSvg('esperando', true)
    expect(lanterna(svg)).toBe('#F2907F')
    expect(respiracao(svg)).toBe('1.8s')
    expect(svg.match(/class="feixe"/g)?.length).toBe(2)
    expect(tem(svg, 'halo')).toBe(true)
    expect(tem(svg, 'boia')).toBe(false)
  })

  test('esperando e não visto: lanterna azul-luar respirando em 1,8 s, feixes vermelhos, halo e a boia', async () => {
    const svg = cenaSvg('esperando-e-nao-visto', true)
    expect(lanterna(svg)).toBe('#C3D7EC')
    expect(respiracao(svg)).toBe('1.8s')
    expect(svg.match(/class="feixe"/g)?.length).toBe(2)
    expect(tem(svg, 'halo')).toBe(true)
    expect(tem(svg, 'boia')).toBe(true)
  })

  test('só não visto: lanterna azul-luar e a boia, sem feixes nem halo', async () => {
    const svg = cenaSvg('nao-visto', true)
    expect(lanterna(svg)).toBe('#C3D7EC')
    expect(respiracao(svg)).toBe('1.8s')
    expect(tem(svg, 'boia')).toBe(true)
    expect(svg).not.toContain('class="feixe"')
    expect(tem(svg, 'halo')).toBe(false)
  })

  test('trabalhando: lanterna âmbar em 6 s; todas livres: verde claro em 9 s; nenhum efeito', async () => {
    const trabalhando = cenaSvg('trabalhando', true)
    expect(lanterna(trabalhando)).toBe('#F2C35B')
    expect(respiracao(trabalhando)).toBe('6s')
    const livres = cenaSvg('livres', true)
    expect(respiracao(livres)).toBe('9s')
    for (const svg of [trabalhando, livres]) {
      expect(svg).not.toContain('class="feixe"')
      expect(tem(svg, 'halo')).toBe(false)
      expect(tem(svg, 'boia')).toBe(false)
    }
  })

  test('sem sessões: lanterna apagada, parada, sem efeito', async () => {
    const svg = cenaSvg('vazia', true)
    expect(respiracao(svg)).toBeUndefined()
    expect(lanterna(svg)).not.toBe('#F2907F')
    expect(svg).not.toContain('class="feixe"')
    expect(tem(svg, 'boia')).toBe(false)
  })

  test('com o movimento desligado, o primeiro quadro: os mesmos elementos, sem animação', async () => {
    for (const s of ['esperando', 'esperando-e-nao-visto', 'nao-visto', 'trabalhando', 'livres', 'vazia'] as const) {
      const parada = cenaSvg(s, false)
      expect(parada).not.toMatch(/<animate/)
      expect(lanterna(parada)).toBe(lanterna(cenaSvg(s, true)))
      expect(tem(parada, 'boia')).toBe(tem(cenaSvg(s, true), 'boia'))
      expect(tem(parada, 'halo')).toBe(tem(cenaSvg(s, true), 'halo'))
    }
    // A animação parte do quadro parado: a lanterna acesa por inteiro, e só então respira.
    expect(cenaSvg('esperando', true)).toMatch(/<rect id="lanterna"[^>]*>\s*<animate attributeName="opacity" values="1;/)
  })
})
