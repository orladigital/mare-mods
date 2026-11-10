import { describe, expect, test } from 'claude-code/testing'

import { torreSvg } from './faixa'
import type { Luz } from './faixa'

// Um atributo colado no seguinte (`id="a"x="1"`) invalida o SVG inteiro: o app recusa o desenho, que some.
// Depois de cada valor entre aspas vem um espaço, uma barra ou o fim da tag.
const atributosColados = (svg: string): string[] => svg.match(/="[^"]*"(?![\s/>])/g) ?? []
// O limite que o app aceita para o texto de um Svg.
const LIMITE = 131072
const LUZES: Luz[] = [null, 'vermelha', 'azul']

describe('a torre da faixa é SVG bem formado', () => {
  test('apagada, com o feixe vermelho e com o azul: atributos separados, sem script, dentro do limite', async () => {
    for (const luz of LUZES) {
      const svg = torreSvg(luz)
      expect(atributosColados(svg)).toEqual([])
      expect(svg).not.toMatch(/<script|on[a-z]+=/i)
      expect(svg.length).toBeLessThan(LIMITE)
      expect(svg.startsWith('<svg ')).toBe(true)
      expect(svg.endsWith('</svg>')).toBe(true)
    }
  })

  test('o feixe acende na cor do aviso; apagada, a torre fica só na cor do texto', async () => {
    expect(torreSvg('vermelha')).toContain('class="v"')
    expect(torreSvg('azul')).toContain('class="a"')
    expect(torreSvg(null)).not.toMatch(/class="[va]"/)
  })

  test('a cor do texto segue o tema do app pelo prefers-color-scheme', async () => {
    expect(torreSvg(null)).toContain('@media (prefers-color-scheme: dark)')
  })
})
