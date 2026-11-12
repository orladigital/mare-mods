import { describe, expect, test } from 'claude-code/testing'

import { barcoSvg, tonsDoCartao } from './cartoes'

// A bandeira e o casco, cada um com o seu id no SVG do barco.
const parte = (svg: string, id: string) => svg.match(new RegExp(`<path id="${id}"[^>]*?(/>|>[\\s\\S]*?</path>)`))?.[0]
const lampejos = (svg: string, claro: string) => (parte(svg, 'casco')?.match(new RegExp(claro, 'g'))?.length ?? 0)

describe('o barco de cada estado', () => {
  test('esperando: bandeira vermelha e casco com dois lampejos claros a cada 2,5 s', async () => {
    const svg = barcoSvg('esperando', true)
    expect(parte(svg, 'bandeira')).toContain('fill="#D6453B"')
    expect(parte(svg, 'casco')).toContain('fill="#D6453B"')
    expect(lampejos(svg, '#FF8A7A')).toBe(2)
    expect(parte(svg, 'casco')).toContain('dur="2.5s"')
  })

  test('não visto: bandeira azul e casco com um lampejo claro de ~0,6 s a cada 2,5 s', async () => {
    const svg = barcoSvg('nao-visto', true)
    expect(parte(svg, 'bandeira')).toContain('fill="#2F6FE0"')
    expect(lampejos(svg, '#7FB0FF')).toBe(1)
    expect(parte(svg, 'casco')).toContain('dur="2.5s"')
    // O lampejo vai de 0 a 24% do ciclo: 0,6 s.
    expect(parte(svg, 'casco')).toContain('keyTimes="0;0.12;0.24;1"')
  })

  test('trabalhando: bandeira parada verde-água escuro e a esteira atrás do barco', async () => {
    const svg = barcoSvg('trabalhando', true)
    expect(parte(svg, 'bandeira')).toContain('fill="#2E6F68"')
    expect(parte(svg, 'bandeira')).not.toContain('<animate')
    expect(parte(svg, 'casco')).not.toContain('<animate')
    expect(svg).toContain('id="esteira"')
  })

  test('livre: sem bandeira e sem esteira; sem sinal: o barco esmaecido', async () => {
    const livre = barcoSvg('livre', true)
    expect(parte(livre, 'bandeira')).toBeUndefined()
    expect(livre).not.toContain('id="esteira"')
    expect(barcoSvg('sem-sinal', true)).toContain('<g opacity="0.85">')
  })

  test('a vela é branca e escurece um pouco no tema escuro do app', async () => {
    const svg = barcoSvg('livre', true)
    expect(svg).toContain('.vela{fill:#FFFFFF')
    expect(svg).toContain('@media (prefers-color-scheme: dark)')
  })

  test('com o movimento desligado, nada pisca', async () => {
    for (const v of ['esperando', 'nao-visto', 'trabalhando', 'livre', 'sem-sinal'] as const) expect(barcoSvg(v, false)).not.toContain('<animate')
    expect(parte(barcoSvg('esperando', false), 'casco')).toContain('fill="#D6453B"')
  })
})

describe('os tons do cartão', () => {
  test('o fundo na cor do estado com transparência, como na prévia', async () => {
    expect((['esperando', 'nao-visto', 'trabalhando', 'livre', 'sem-sinal'] as const).map(v => tonsDoCartao(v).fundo)).toEqual([
      '#D6453B1F',
      '#2F6FE01F',
      '#4FB3A91A',
      '#5E7F8C1A',
      '#8A847812',
    ])
  })

  test('a borda do aviso é cheia; a dos outros estados tem transparência, para não brilhar mais que ela no escuro', async () => {
    expect(tonsDoCartao('esperando').borda).toBe('#D6453B')
    expect(tonsDoCartao('nao-visto').borda).toBe('#2F6FE0')
    for (const v of ['trabalhando', 'livre', 'sem-sinal'] as const) expect(tonsDoCartao(v).borda).toMatch(/^#[0-9A-F]{8}$/)
  })
})
