import { describe, expect, test } from 'claude-code/testing'

import { COR_SOL, solSvg } from './sol'

const sol = (svg: string) => {
  const m = /<circle cx="([\d.]+)" cy="([\d.]+)" r="[\d.]+" fill="(#[0-9A-F]{6})"/.exec(svg)
  return { x: Number(m?.[1]), y: Number(m?.[2]), cor: m?.[3] }
}

describe('pôr do sol da janela de 5h (app)', () => {
  test('o sol anda para a direita e desce conforme a janela é usada', async () => {
    const inicio = sol(solSvg(0, 96))
    const meio = sol(solSvg(50, 96))
    const fim = sol(solSvg(100, 96))
    expect(meio.x).toBeGreaterThan(inicio.x)
    expect(fim.x).toBeGreaterThan(meio.x)
    expect(meio.y).toBeGreaterThan(inicio.y)
    expect(fim.y).toBeGreaterThan(meio.y)
  })

  test('o sol vai do amarelo ao laranja-escuro', async () => {
    expect(sol(solSvg(0, 96)).cor).toBe(COR_SOL.sol[0].toUpperCase())
    expect(sol(solSvg(100, 96)).cor).toBe(COR_SOL.sol[3].toUpperCase())
  })

  test('em 100%, o sol está no horizonte, metade dentro do mar', async () => {
    const svg = solSvg(100, 96)
    const horizonte = Number(/<rect y="([\d.]+)"/.exec(svg)?.[1])
    expect(sol(svg).y).toBe(horizonte)
  })

  test('a largura é a pedida', async () => {
    expect(solSvg(30, 72)).toContain('width="72"')
  })
})

describe('o céu por onde o sol já passou', () => {
  test('escurece do começo da barra até o sol', async () => {
    const svg = solSvg(50, 96)
    const largura = Number(/<rect class="passou" width="([\d.]+)"/.exec(svg)?.[1])
    expect(largura).toBe(sol(svg).x)
  })

  test('no começo da janela, nada escureceu', async () => {
    expect(solSvg(0, 96)).not.toContain('class="passou"')
  })
})
