import { describe, expect, test } from 'claude-code/testing'

import { CORES_5H, CORES_SEMANA, barraFinaSvg } from './limites'
import { praiaSvg } from './praia'
import { solSvg } from './sol'

// Um atributo colado no seguinte (`id="a"x="1"`) invalida o SVG inteiro: o app recusa o desenho e a barra some.
// Depois de cada valor entre aspas vem um espaço, uma barra ou o fim da tag.
const atributosColados = (svg: string): string[] => svg.match(/="[^"]*"(?![\s/>])/g) ?? []

describe('os desenhos do app são SVG bem formado', () => {
  test('a praia, em qualquer nível do mar, parada ou animada', async () => {
    for (const pct of [0, 1, 30, 60, 85, 95, 100]) {
      for (const animado of [false, true]) expect(atributosColados(praiaSvg(pct, animado, 96))).toEqual([])
    }
  })

  test('o pôr do sol e o trilho da semana', async () => {
    for (const pct of [0, 40, 95, 100]) {
      expect(atributosColados(solSvg(pct, 96))).toEqual([])
      expect(atributosColados(barraFinaSvg(pct, CORES_5H, 64))).toEqual([])
      expect(atributosColados(barraFinaSvg(pct, CORES_SEMANA, 64))).toEqual([])
    }
  })
})
