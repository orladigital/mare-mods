import { describe, expect, test } from 'claude-code/testing'

import { PADRAO, larguraDasBarras, lerAjustes, marAnimado, proximaSemana } from './ajustes'

describe('ajustes do ⚓', () => {
  test('quem instala começa com o Explain ligado, o 📋 desligado, a ola ligada e a semana só em número', async () => {
    expect(lerAjustes(undefined)).toEqual(PADRAO)
    expect(PADRAO).toEqual({ explain: true, copiar: false, ola: 'ligada', semana: 'numero' })
  })

  test('o guardado vale; o que falta ou veio estragado volta ao padrão', async () => {
    expect(lerAjustes({ explain: false })).toEqual({ ...PADRAO, explain: false })
    expect(lerAjustes({ semana: 'mensal' })).toEqual(PADRAO)
    expect(lerAjustes({ copiar: 'sim' })).toEqual(PADRAO)
  })

  test('a ola de versões antigas ("escrevendo", "sempre") vira ligada; desligada continua desligada', async () => {
    expect(lerAjustes({ ola: 'escrevendo' }).ola).toBe('ligada')
    expect(lerAjustes({ ola: 'sempre' }).ola).toBe('ligada')
    expect(lerAjustes({ ola: 'desligada' }).ola).toBe('desligada')
  })
})

describe('quando o mar se mexe', () => {
  test('só no app, com a ola ligada; no terminal, nunca', async () => {
    expect(marAnimado('ligada', 'desktop')).toBe(true)
    expect(marAnimado('desligada', 'desktop')).toBe(false)
    expect(marAnimado('ligada', 'terminal')).toBe(false)
  })
})

describe('semana e largura das barras', () => {
  test('a semana gira entre só número, com barra e escondida', async () => {
    expect(proximaSemana('numero')).toBe('barra')
    expect(proximaSemana('barra')).toBe('escondida')
    expect(proximaSemana('escondida')).toBe('numero')
  })

  test('no app, as barras acompanham a largura da faixa, de 64 a 96 px', async () => {
    expect(larguraDasBarras(40)).toBe(64)
    expect(larguraDasBarras(100)).toBe(80)
    expect(larguraDasBarras(300)).toBe(96)
  })
})
