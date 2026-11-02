import { describe, expect, test } from 'claude-code/testing'

import { CORES_5H, barraFinaSvg, barraTerminal, detalhar, janelaEmTexto, janelas, limitesVigentes } from './limites'

const LIMITES = [
  { kind: 'five_hour', percentUsed: 42.4, resetsAt: '2026-10-08T20:00:00Z' },
  { kind: 'seven_day', percentUsed: 85, resetsAt: '2026-10-15T12:30:00Z' },
]

describe('janelas na faixa', () => {
  test('no terminal: 5h com o rótulo e o reset no horário de São Paulo; a semana sem reset', async () => {
    expect(janelas(LIMITES).map(janelaEmTexto)).toEqual(['5h ▄▄▄▄▄▄▄▄▄▄ 42% - 17:00', 'Sem. ▄▄▄▄▄▄▄▄▄▄ 85%'])
  })

  test('sem leitura, nada a mostrar', async () => {
    expect(janelas([])).toEqual([])
  })

  test('no terminal, a barra de 5h tem as mesmas 10 casas, do verde-mar ao coral; vazias apagadas', async () => {
    const cheias = (pct: number) => barraTerminal(pct, CORES_5H).filter(p => !p.apagado)
    expect(cheias(42.4)).toHaveLength(4)
    expect(cheias(100).map(p => p.cor)[0]).not.toBe(cheias(100).at(-1)?.cor)
    expect(cheias(0)).toHaveLength(0)
    expect(cheias(1)).toHaveLength(1)
  })

  test('no app, o trilho só ganha a parte cheia com uso', async () => {
    expect(barraFinaSvg(0, CORES_5H, 64)).not.toContain('url(#tom)"/>')
    expect(barraFinaSvg(50, CORES_5H, 64)).toContain('width="32"')
  })
})

describe('painel', () => {
  test('mostra data do reset e quanto falta', async () => {
    const agora = new Date('2026-10-08T17:30:00Z').getTime()
    const [sessao, semana] = detalhar(LIMITES, agora)
    expect(sessao?.reset).toBe('reset qui 08/10 às 17:00 (em 2h30)')
    expect(semana?.reset).toBe('reset qui 15/10 às 09:30 (em 6d 19h)')
  })
})

describe('limites sem leitura nova', () => {
  const AGORA = new Date('2026-10-09T15:00:00Z').getTime()
  const GUARDADOS = [
    { kind: 'five_hour', percentUsed: 34, resetsAt: '2026-10-09T20:10:00Z' },
    { kind: 'seven_day', percentUsed: 74, resetsAt: '2026-10-13T07:00:00Z' },
  ]

  test('leitura nova vence a guardada', async () => {
    const novos = [{ kind: 'five_hour', percentUsed: 40, resetsAt: '2026-10-09T20:10:00Z' }]
    expect(limitesVigentes(novos, GUARDADOS, AGORA)).toEqual(novos)
  })

  test('sem leitura nova, mantém a guardada', async () => {
    expect(limitesVigentes([], GUARDADOS, AGORA)).toEqual(GUARDADOS)
  })

  test('janela que já resetou sai', async () => {
    const depois = new Date('2026-10-09T21:00:00Z').getTime()
    expect(limitesVigentes([], GUARDADOS, depois).map(l => l.kind)).toEqual(['seven_day'])
  })
})
