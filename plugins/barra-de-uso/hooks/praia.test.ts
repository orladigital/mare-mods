import { describe, expect, test } from 'claude-code/testing'

import { CASAS, COR, contextoTerminal, misturar, praiaSvg } from './praia'

const cheias = (pct: number) => contextoTerminal(pct).filter(p => !p.apagado)

describe('contexto no terminal: barra parada em degradê', () => {
  test('10 casas de meia altura; as cheias acompanham o %, as vazias ficam apagadas', async () => {
    expect(contextoTerminal(50)).toHaveLength(CASAS)
    expect(contextoTerminal(50).map(p => p.texto).join('')).toBe('▄▄▄▄▄▄▄▄▄▄')
    expect(cheias(0)).toHaveLength(0)
    expect(cheias(50)).toHaveLength(5)
    expect(cheias(100)).toHaveLength(10)
  })

  test('qualquer uso acima de zero já acende a primeira casa', async () => {
    expect(cheias(1)).toHaveLength(1)
  })

  test('do azul fundo ao turquesa da beira até o calçadão (85%)', async () => {
    const c = cheias(80)
    expect(c[0]?.cor).toBe(misturar(COR.fundo, COR.beira, 5 / 85))
    expect(c.at(-1)?.cor).toBe(misturar(COR.fundo, COR.beira, 75 / 85))
  })

  test('depois do calçadão, as casas viram espuma', async () => {
    expect(cheias(100).slice(9).map(p => p.cor)).toEqual([COR.espuma])
    expect(cheias(85).every(p => p.cor !== COR.espuma)).toBe(true)
  })
})

describe('praia no app (SVG)', () => {
  test('anima só quando pedido', async () => {
    expect(praiaSvg(50, true, 96)).toContain('<animate')
    expect(praiaSvg(50, false, 96)).not.toContain('<animate')
  })

  test('o coqueiro fica no calçadão em qualquer nível do mar', async () => {
    for (const pct of [0, 50, 100]) expect(praiaSvg(pct, false, 96)).toContain('stroke="#1F6E3F"')
  })

  test('a espuma da ressaca (véu, bolhas e renda) só aparece depois do calçadão', async () => {
    expect(praiaSvg(85, false, 96)).not.toContain('class="veu"')
    expect(praiaSvg(95, false, 96)).toContain('class="veu"')
  })

  test('a areia molhada começa onde a água termina e anda com ela', async () => {
    for (const [pct, frente] of [[30, 29], [60, 58]] as const) {
      expect(praiaSvg(pct, false, 96)).toContain(`<path class="molhada" d="M${frente},0`)
    }
  })

  test('os grãos ficam só na areia seca, entre a molhada e o meio-fio', async () => {
    const xs = [...praiaSvg(30, false, 96).matchAll(/class="grao" cx="([\d.]+)"/g)].map(m => Number(m[1]))
    expect(xs.length).toBeGreaterThan(0)
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(29 + 8)
    expect(Math.max(...xs)).toBeLessThan(82)
    expect(praiaSvg(80, false, 96)).not.toContain('class="grao"')
  })

  test('a água da ressaca só cobre a pedra depois do calçadão', async () => {
    expect(praiaSvg(85, false, 96)).not.toContain(`fill="${COR.ressaca}"`)
    expect(praiaSvg(95, false, 96)).toContain(`fill="${COR.ressaca}"`)
  })
})
