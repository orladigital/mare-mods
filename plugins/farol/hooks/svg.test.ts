import { describe, expect, test } from 'claude-code/testing'

import { barcoSvg } from './cartoes'
import { cenaSvg } from './cena'
import type { Situacao } from './cena'
import type { Visual } from './estado'
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
      bemFormado(torreSvg(luz))
      bemFormado(torreSvg(luz, true))
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

const SITUACOES: Situacao[] = ['esperando', 'esperando-e-nao-visto', 'nao-visto', 'trabalhando-e-nao-visto', 'trabalhando', 'livres', 'vazia']
const VISUAIS: Visual[] = ['esperando', 'nao-visto', 'trabalhando', 'livre', 'sem-sinal']

// O app desenha o SVG parado como imagem, que recusa o malformado: o mesmo teste vale com o movimento desligado.
const bemFormado = (svg: string) => {
  expect(atributosColados(svg)).toEqual([])
  expect(svg).not.toMatch(/<script|on[a-z]+=/i)
  expect(svg.length).toBeLessThan(LIMITE)
  expect(svg.startsWith('<svg ')).toBe(true)
  expect(svg.endsWith('</svg>')).toBe(true)
}

describe('a cena do painel é SVG bem formado', () => {
  test('as sete situações, com e sem movimento, em painéis estreito e largo', async () => {
    for (const s of SITUACOES) for (const movimento of [true, false]) for (const largura of [200, 480, 2000]) bemFormado(cenaSvg(s, movimento, largura))
  })
})

describe('os barcos dos cartões são SVG bem formado', () => {
  test('os cinco estados, com e sem movimento, com o tom da vela pelo tema do app', async () => {
    for (const v of VISUAIS)
      for (const movimento of [true, false]) {
        const svg = barcoSvg(v, movimento)
        bemFormado(svg)
        expect(svg).toContain('@media (prefers-color-scheme: dark)')
      }
  })
})
