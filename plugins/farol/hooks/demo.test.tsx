import { describe, expect, test } from 'claude-code/testing'

import type { Registro } from '../types'
import { situacaoDaCena } from './cena'
import { situacoesDaDemo } from './demo'
import { visualDe } from './estado'
import { AGORA, FAIXA, INICIO, PAINEL, gravarOutra, preparar } from './apoio-de-teste'

const T = AGORA
const visuais = (lista: readonly Registro[]) => lista.map(r => visualDe(r, T)).sort()

// O tempo de cada situação do app, em segundos, na ordem: o que foi decidido para a gravação do vídeo.
const TEMPOS_DO_APP = [6, 4, 4, 3, 4, 6, 4, 4, 4, 6, 5, 5, 6, 4, 3, 3, 3, 3, 7, 3, 4, 15, 6]
// O esmaecido que os desenhos tiveram e saiu: nada esmaece.
const ESMAECIDO = 'values="0;1" dur="0.4s"'
// O mar e o farol se mexendo na abertura e no encerramento: as ondas andando e o feixe girando, sem parar.
const ONDAS_CORRENDO = /<animateTransform[^>]*type="translate"[^>]*repeatCount="indefinite"/
const FEIXE_GIRANDO = /<animateTransform[^>]*type="scale"[^>]*repeatCount="indefinite"/

describe('as situações da demonstração', () => {
  test('no app, as 23 situações, na ordem, cada uma com as sessões no estado que o nome diz e o seu tempo', async () => {
    const app = situacoesDaDemo('app', T)
    expect(app.map(s => [s.nome, visuais(s.sessoes)])).toEqual([
      ['Bem-vindo ao tour do Farol da Orla', ['livre', 'livre']],
      ['Todas livres', ['livre', 'livre']],
      ['Só trabalhando', ['trabalhando', 'trabalhando']],
      ['Trabalhando e livre', ['livre', 'trabalhando']],
      ['Esta sessão em destaque', ['livre', 'livre', 'trabalhando']],
      ['Só não visto', ['nao-visto']],
      ['Não visto e trabalhando', ['nao-visto', 'trabalhando']],
      ['Só pergunta', ['pergunta']],
      ['Pergunta e não visto', ['nao-visto', 'pergunta']],
      ['Só esperando', ['esperando']],
      ['Só esperando, na intensidade alta', ['esperando']],
      ['Esperando e não visto', ['esperando', 'nao-visto']],
      ['Esperando e não visto, na intensidade alta', ['esperando', 'nao-visto']],
      ['Esperando e pergunta', ['esperando', 'pergunta']],
      ['Esperando e pergunta, na intensidade alta', ['esperando', 'pergunta']],
      ['Esperando, trabalhando, livre e sem sinal', ['esperando', 'livre', 'sem-sinal', 'trabalhando']],
      ['Duas esperando, com a contagem na faixa', ['esperando', 'esperando']],
      ['Só sem sinal', ['sem-sinal']],
      ['Ajustes abertos', ['esperando', 'nao-visto']],
      ['Ajustes recolhidos', ['esperando', 'nao-visto']],
      ['Esperando e não visto, com o movimento desligado', ['esperando', 'nao-visto']],
      ['E tem mais', ['livre', 'livre']],
      ['Obrigado por fazer o tour', ['livre', 'livre']],
    ])
    expect(app.map(s => s.ms / 1000)).toEqual(TEMPOS_DO_APP)
  })

  test('no app, a demonstração passa por todas as cenas do topo', async () => {
    const cenas = new Set(situacoesDaDemo('app', T).map(s => situacaoDaCena(s.sessoes, T)))
    expect([...cenas].sort()).toEqual([
      'esperando', 'esperando-e-nao-visto', 'livres', 'nao-visto', 'pergunta', 'pergunta-e-nao-visto', 'trabalhando', 'trabalhando-e-nao-visto', 'vazia',
    ])
  })

  test('no app, os desenhos próprios do tour: a abertura, o "E tem mais" e o encerramento; o texto só no encerramento', async () => {
    const app = situacoesDaDemo('app', T)
    expect(app.filter(s => s.especial).map(s => [s.nome, s.especial])).toEqual([
      ['Bem-vindo ao tour do Farol da Orla', 'abertura'],
      ['E tem mais', 'mais'],
      ['Obrigado por fazer o tour', 'encerramento'],
    ])
    expect(app.filter(s => s.recado.length > 0).map(s => [s.nome, s.recado])).toEqual([
      ['Obrigado por fazer o tour', ['/farol abre o painel · os ajustes ficam no rodapé']],
    ])
  })

  test('no terminal, as 5 situações, na ordem, 6 s cada, sem os desenhos do tour', async () => {
    const terminal = situacoesDaDemo('terminal', T)
    expect(terminal.map(s => [s.nome, visuais(s.sessoes)])).toEqual([
      ['Esperando, trabalhando e livre', ['esperando', 'livre', 'trabalhando']],
      ['Só trabalhando', ['trabalhando']],
      ['Todas livres', ['livre', 'livre']],
      ['Duas esperando', ['esperando', 'esperando']],
      ['Pergunta e trabalhando', ['pergunta', 'trabalhando']],
    ])
    expect(terminal.every(s => s.ms === 6_000 && !s.especial && s.recado.length === 0)).toBe(true)
  })

  test('cada par da Alta vem logo depois da mesma situação na intensidade padrão', async () => {
    const app = situacoesDaDemo('app', T)
    const altas = app.flatMap((s, i) => (s.ajustes.intensidade === 'alta' ? [i] : []))
    expect(altas).toEqual([10, 12, 14])
    for (const i of altas) {
      expect(app[i]?.nome).toBe(`${app[i - 1]?.nome}, na intensidade alta`)
      expect(visuais(app[i]?.sessoes ?? [])).toEqual(visuais(app[i - 1]?.sessoes ?? []))
    }
  })

  test('só mudam os ajustes as Altas, a contagem e o movimento desligado, que vem antes do fecho; o bloco abre só em "Ajustes abertos"', async () => {
    const app = situacoesDaDemo('app', T)
    const outros = app.filter(s => Object.keys(s.ajustes).length > 0 && s.ajustes.intensidade === undefined)
    expect(outros.map(s => [s.nome, s.ajustes])).toEqual([
      ['Duas esperando, com a contagem na faixa', { contagem: true }],
      ['Esperando e não visto, com o movimento desligado', { movimento: false }],
    ])
    expect(app.at(-3)?.ajustes).toEqual({ movimento: false })
    expect(app.filter(s => s.ajustesAbertos).map(s => s.nome)).toEqual(['Ajustes abertos'])
    expect(situacoesDaDemo('terminal', T).every(s => Object.keys(s.ajustes).length === 0 && !s.ajustesAbertos)).toBe(true)
  })

  test('esta sessão é a primeira livre da situação; sem livre, nenhuma', async () => {
    const [primeira, , terceira] = situacoesDaDemo('terminal', T)
    expect(primeira?.sessoes.find(r => r.id === primeira.minha)?.estado).toBe('livre')
    expect(terceira?.sessoes.filter(r => r.id === terceira.minha)).toHaveLength(1)
    expect(situacoesDaDemo('app', T)[5]?.minha).toBe('')
  })

  test('em "Esta sessão em destaque", esta sessão é a que trabalha, com duas livres', async () => {
    const destaque = situacoesDaDemo('app', T)[4]
    expect(destaque?.nome).toBe('Esta sessão em destaque')
    expect(destaque?.sessoes.find(r => r.id === destaque.minha)?.estado).toBe('trabalhando')
    expect(destaque?.ms).toBe(4_000)
  })

  test('as sessões são fictícias: sem o id do app (o clique não troca de sessão) e com ids só da demonstração', async () => {
    const todas = [...situacoesDaDemo('app', T), ...situacoesDaDemo('terminal', T)].flatMap(s => s.sessoes)
    expect(todas.every(r => r.appId === undefined && r.id.startsWith('demo-'))).toBe(true)
  })
})

const textos = async (ui: { findAll: (q: { type: 'Text' }) => Promise<{ text: string }[]> }) => (await ui.findAll({ type: 'Text' })).map(t => t.text)
const DEMO = { command: 'farol', args: 'demo' } as never
// O começo da situação n do app (de 1), em ms desde o /farol demo.
const inicioDaSituacao = (n: number) => TEMPOS_DO_APP.slice(0, n - 1).reduce((a, b) => a + b, 0) * 1000
const TOTAL_DO_APP = inicioDaSituacao(TEMPOS_DO_APP.length + 1)

describe('o /farol demo', () => {
  test('abre o painel na abertura, com o título em destaque no topo e o desenho do calçadão, sem gravar nada nem tocar som', async ($, on) => {
    const m = preparar(on)
    gravarOutra(m, { id: 'real', titulo: 'Sessão de verdade', estado: 'trabalhando' })
    await $.session.start({ ...INICIO, surface: 'desktop' })
    const antes = new Map(m.arquivos)

    await $.command.run(DEMO)
    expect(m.paineis).toEqual(['farol'])
    const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
    const t = await textos(ui)
    expect(t.slice(0, 2)).toEqual(['DEMONSTRAÇÃO · 1 DE 23', 'BEM-VINDO AO TOUR DO FAROL DA ORLA'])
    expect((await ui.findAll({ type: 'Text' }))[1]?.props.size).toBe('heading')
    expect((await ui.find({ key: 'titulo-da-demo' }))?.props.alignItems).toBe('center')
    // Um desenho só, o da abertura, sem cartões de sessão.
    const svgs = await ui.findAll({ type: 'Svg' })
    expect(svgs).toHaveLength(1)
    expect(String(svgs[0]?.props.alt)).toContain('calçadão')
    expect(t).not.toContain('Sessão de verdade')
    await ui.unmount()

    // Na segunda, as sessões fictícias.
    await m.avancar(6_000)
    const segunda = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
    expect(await textos(segunda)).toContain('Explicar o módulo de pagamentos')
    await segunda.unmount()
    expect(m.arquivos).toEqual(antes)
    expect(m.sons).toEqual([])
  })

  test('cada situação fica o seu tempo, um ciclo só, e no fim o painel volta às sessões reais', async ($, on) => {
    const m = preparar(on)
    gravarOutra(m, { id: 'real', titulo: 'Sessão de verdade', estado: 'trabalhando' })
    await $.session.start({ ...INICIO, surface: 'desktop' })
    await $.command.run(DEMO)
    const topo = async () => {
      const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
      const t = await textos(ui)
      await ui.unmount()
      return t
    }

    // A 6ª (só não visto) começa aos 22 s e fica 6 s.
    await m.avancar(inicioDaSituacao(6) - 1)
    expect((await topo())[0]).toBe('DEMONSTRAÇÃO · 5 DE 23')
    await m.avancar(1)
    expect((await topo()).slice(0, 2)).toEqual(['DEMONSTRAÇÃO · 6 DE 23', 'SÓ NÃO VISTO'])
    await m.avancar(6_000 - 1)
    expect((await topo())[0]).toBe('DEMONSTRAÇÃO · 6 DE 23')

    // A última fica até o fim do ciclo (112 s); depois, as sessões reais.
    await m.avancar(TOTAL_DO_APP - inicioDaSituacao(6) - 6_000)
    expect((await topo())[0]).toBe('DEMONSTRAÇÃO · 23 DE 23')
    await m.avancar(1)
    const depois = await topo()
    expect(depois.some(x => x.startsWith('DEMONSTRAÇÃO'))).toBe(false)
    expect(depois).toContain('Sessão de verdade')
    expect(TOTAL_DO_APP).toBe(112_000)
  })

  test('no terminal, 5 situações de 6 s: o título em maiúsculas, "Esta sessão" na primeira e 🚨 2 na faixa da quarta', async ($, on) => {
    const m = preparar(on)
    await $.session.start(INICIO)
    await $.command.run(DEMO)

    const painel = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
    const t = await textos(painel)
    expect(t.slice(0, 2)).toEqual(['DEMONSTRAÇÃO · 1 DE 5', 'ESPERANDO, TRABALHANDO E LIVRE'])
    expect(t).toContain('Esta sessão')
    await painel.unmount()

    await m.avancar(3 * 6_000)
    const faixa = await $.ui.mount({ ...FAIXA, surface: 'terminal' })
    expect((await faixa.find({ key: 'abrir-farol' }))?.props.label).toBe('🚨 2')
    await faixa.unmount()
  })

  test('cada situação usa os próprios ajustes, sem mudar os seus: a Alta e a contagem põem o número na torre', async ($, on) => {
    const m = preparar(on, { guardado: { ajustes: { movimento: false } } })
    await $.session.start({ ...INICIO, surface: 'desktop' })
    await $.command.run(DEMO)
    // Avança até o começo da situação n.
    let ja = 0
    const ir = async (n: number) => {
      await m.avancar(inicioDaSituacao(n) - ja)
      ja = inicioDaSituacao(n)
    }
    const numero = async () => {
      const faixa = await $.ui.mount({ ...FAIXA, surface: 'desktop' })
      const n = (await faixa.find({ key: 'abrir-farol-numero' }))?.props.label
      await faixa.unmount()
      return n
    }
    const cena = async () => {
      const painel = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
      const c = (await painel.findAll({ type: 'Svg' }))[0]?.props
      await painel.unmount()
      return c
    }

    // Os ajustes no padrão: a cena se mexe, mesmo com o seu movimento desligado.
    await ir(2)
    expect((await cena())?.isInteractive).toBe(true)
    // Só esperando: sem número; na Alta, logo depois, com ele.
    await ir(10)
    expect(await numero()).toBeUndefined()
    await ir(11)
    expect(await numero()).toBe('1')
    await ir(17)
    expect(await numero()).toBe('2')
    // A que desliga o movimento: nada se mexe.
    await ir(21)
    expect(String((await cena())?.source)).not.toContain('<animate')

    // No fim, os seus ajustes de volta, e nada mudou no que está guardado.
    await m.avancar(25_000)
    expect((await cena())?.isInteractive).toBeUndefined()
    expect(m.guardado).toEqual({ ajustes: { movimento: false } })
  })

  test('a abertura de dia e o encerramento ao pôr do sol se mexem: as ondas correm e o feixe do farol gira sem parar; nada esmaece', async ($, on) => {
    const m = preparar(on)
    await $.session.start({ ...INICIO, surface: 'desktop' })
    const desenho = async () => {
      const painel = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
      const d = (await painel.findAll({ type: 'Svg' }))[0]?.props
      await painel.unmount()
      return { svg: String(d?.source), alt: String(d?.alt) }
    }

    await $.command.run(DEMO)
    const abertura = await desenho()
    expect(abertura.alt).toContain('de dia')
    expect(abertura.svg).toMatch(ONDAS_CORRENDO)
    expect(abertura.svg).toMatch(FEIXE_GIRANDO)
    expect(abertura.svg).not.toContain(ESMAECIDO)

    await m.avancar(inicioDaSituacao(2))
    expect((await desenho()).svg).not.toContain(ESMAECIDO)

    await m.avancar(inicioDaSituacao(23) - inicioDaSituacao(2))
    const encerramento = await desenho()
    expect(encerramento.alt).toContain('pôr do sol')
    expect(encerramento.svg).toMatch(/url\(#tour-feixe-d\)/)
    expect(encerramento.svg).toMatch(ONDAS_CORRENDO)
    expect(encerramento.svg).toMatch(FEIXE_GIRANDO)
  })

  test('os ajustes abrem e recolhem pela situação, com os valores dela, e nenhum clique muda nada', async ($, on) => {
    const m = preparar(on, { guardado: { ajustes: { intensidade: 'alta' } } })
    await $.session.start({ ...INICIO, surface: 'desktop' })
    await $.command.run(DEMO)
    const painel = async () => $.ui.mount({ ...PAINEL, surface: 'desktop' })

    // Antes dos "Ajustes abertos", o botão Ajustes não abre o bloco.
    const antes = await painel()
    await antes.press({ key: 'ajustes' })
    expect(await antes.find({ key: 'ajuste-intensidade' })).toBeUndefined()
    await antes.unmount()

    await m.avancar(inicioDaSituacao(19))
    const aberto = await painel()
    expect((await aberto.find({ key: 'ajuste-intensidade' }))?.props.value).toBe('padrao')
    expect((await aberto.find({ key: 'ajustes' }))?.props.label).toBe('Esconder ajustes')
    await aberto.select({ key: 'ajuste-intensidade', value: 'alta' })
    await aberto.select({ key: 'ajuste-movimento', value: 'nao' })
    await aberto.unmount()

    await m.avancar(7_000)
    const recolhido = await painel()
    expect(await recolhido.find({ key: 'ajuste-intensidade' })).toBeUndefined()
    await recolhido.unmount()
    expect(m.guardado).toEqual({ ajustes: { intensidade: 'alta' } })

    // No fim, o bloco volta ao que era antes da demonstração (recolhido).
    await m.avancar(28_000)
    const depois = await painel()
    expect(await depois.find({ key: 'ajuste-intensidade' })).toBeUndefined()
    await depois.unmount()
  })

  test('o "E tem mais" mostra os quatro cartões ilustrados (a faixa, os cartões clicáveis, os sons e o terminal) no lugar das sessões, sem tocar som', async ($, on) => {
    const m = preparar(on)
    await $.session.start({ ...INICIO, surface: 'desktop' })
    await $.command.run(DEMO)
    await m.avancar(inicioDaSituacao(22))

    const painel = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
    const t = await textos(painel)
    expect(t.slice(0, 2)).toEqual(['DEMONSTRAÇÃO · 22 DE 23', 'E TEM MAIS'])
    const svgs = await painel.findAll({ type: 'Svg' })
    expect(svgs).toHaveLength(1)
    const desenho = String(svgs[0]?.props.source)
    for (const titulo of ['Na faixa', 'Cartões clicáveis', 'Sons', 'No terminal']) expect(desenho).toContain(`>${titulo}</text>`)
    expect(t).not.toContain('Explicar o módulo de pagamentos')
    await painel.unmount()
    expect(m.sons).toEqual([])
  })

  test('o encerramento: o desenho do calçadão e, embaixo, o que fazer agora', async ($, on) => {
    const m = preparar(on)
    await $.session.start({ ...INICIO, surface: 'desktop' })
    await $.command.run(DEMO)
    await m.avancar(inicioDaSituacao(23))

    const painel = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
    const t = await textos(painel)
    expect(t.slice(0, 2)).toEqual(['DEMONSTRAÇÃO · 23 DE 23', 'OBRIGADO POR FAZER O TOUR'])
    expect(t).toContain('/farol abre o painel · os ajustes ficam no rodapé')
    const svgs = await painel.findAll({ type: 'Svg' })
    expect(svgs).toHaveLength(1)
    expect(String(svgs[0]?.props.alt)).toContain('calçadão')
    await painel.unmount()
  })

  test('o Fechar encerra a demonstração: a faixa volta às sessões reais e o relógio para', async ($, on) => {
    const m = preparar(on)
    await $.session.start(INICIO)
    await $.command.run(DEMO)

    const painel = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
    await painel.press({ key: 'fechar' })
    await painel.unmount()
    await m.avancar(6_000)
    const faixa = await $.ui.mount({ ...FAIXA, surface: 'terminal' })
    expect((await faixa.find({ key: 'abrir-farol' }))?.props.label).toBe('🚦')
    await faixa.unmount()
    const reaberto = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
    expect((await textos(reaberto)).some(x => x.startsWith('DEMONSTRAÇÃO'))).toBe(false)
    await reaberto.unmount()
  })

  test('o /farol sem "demo" só abre o painel, sem demonstração', async ($, on) => {
    preparar(on)
    await $.session.start(INICIO)
    await $.command.run({ command: 'farol', args: '' } as never)
    const painel = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
    expect((await textos(painel)).some(x => x.startsWith('DEMONSTRAÇÃO'))).toBe(false)
    await painel.unmount()
  })

  test('o /farol demo no meio da demonstração recomeça da primeira situação, com um relógio só', async ($, on) => {
    const m = preparar(on)
    await $.session.start(INICIO)
    await $.command.run(DEMO)
    await m.avancar(2 * 6_000)
    await $.command.run(DEMO)
    const topo = async () => {
      const painel = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
      const t = (await textos(painel)).slice(0, 2)
      await painel.unmount()
      return t
    }
    expect(await topo()).toEqual(['DEMONSTRAÇÃO · 1 DE 5', 'ESPERANDO, TRABALHANDO E LIVRE'])
    await m.avancar(6_000)
    expect(await topo()).toEqual(['DEMONSTRAÇÃO · 2 DE 5', 'SÓ TRABALHANDO'])
  })
})
