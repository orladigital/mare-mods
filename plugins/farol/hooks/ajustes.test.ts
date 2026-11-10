import { describe, expect, test } from 'claude-code/testing'

import { PADRAO, contagemNaFaixa, lerAjustes } from './ajustes'

describe('ajustes do farol', () => {
  test('quem instala começa com o farol na faixa, sem a contagem no app e com o movimento ligado', async () => {
    expect(lerAjustes(undefined)).toEqual(PADRAO)
    expect(PADRAO).toEqual({ naFaixa: 'mostrar', contagem: false, movimento: true })
  })

  test('o guardado vale; o que falta ou veio estragado volta ao padrão', async () => {
    expect(lerAjustes({ naFaixa: 'esconder' })).toEqual({ ...PADRAO, naFaixa: 'esconder' })
    expect(lerAjustes({ contagem: true, movimento: false })).toEqual({ naFaixa: 'mostrar', contagem: true, movimento: false })
    expect(lerAjustes({ naFaixa: 'talvez', contagem: 'sim' })).toEqual(PADRAO)
    expect(lerAjustes('texto')).toEqual(PADRAO)
    expect(lerAjustes(null)).toEqual(PADRAO)
  })

  test('a contagem na faixa: no terminal, sempre; no app, só com o ajuste ligado', async () => {
    expect(contagemNaFaixa(PADRAO, 'terminal')).toBe(true)
    expect(contagemNaFaixa(PADRAO, 'desktop')).toBe(false)
    expect(contagemNaFaixa({ ...PADRAO, contagem: true }, 'desktop')).toBe(true)
  })
})
