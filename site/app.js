// Maré Mods · as demonstrações da página.
// Os desenhos seguem os dos mods (plugins/barra-de-uso/hooks/praia.ts e sol.ts, plugins/farol/hooks/cena.ts), com as
// mesmas cores. Nada aqui fala com a rede nem guarda dado: a política de segurança (no index.html) barra a rede.
(() => {
  'use strict'

  // A proteção contra moldura só existe como cabeçalho HTTP (frame-ancestors), e o GitHub Pages não deixa definir
  // cabeçalho. No lugar dela: aberta dentro de outra página, esta não mostra nada.
  if (window.top !== window.self) {
    document.documentElement.hidden = true
    return
  }

  const $ = (seletor, raiz = document) => raiz.querySelector(seletor)
  const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)]
  const menosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)')
  // O movimento para por dois caminhos: a preferência do sistema e o botão de pausa da barra de cima.
  let parado = false
  const comMovimento = () => !menosMovimento.matches && !parado
  // O que cada demonstração refaz quando o movimento liga ou desliga.
  const aoMudarMovimento = []
  const avisarMovimento = () => {
    for (const refazer of aoMudarMovimento) refazer()
  }
  menosMovimento.addEventListener('change', avisarMovimento)

  document.documentElement.classList.add('js')

  // ---------- Cores ----------

  const limitar = (n, min, max) => Math.max(min, Math.min(max, n))
  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  const emHex = c => `#${c.map(v => limitar(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')}`
  const misturar = (a, b, t) => {
    const x = rgb(a)
    const y = rgb(b)
    return emHex(x.map((v, i) => v + (y[i] - v) * t))
  }
  // A cor do ponto `t` (0 a 1) de uma escala.
  const tom = (escala, t) => {
    if (escala.length === 1) return escala[0]
    const pos = limitar(t, 0, 1) * (escala.length - 1)
    const i = Math.min(escala.length - 2, Math.floor(pos))
    return misturar(escala[i], escala[i + 1], pos - i)
  }
  const n1 = x => (Math.round(x * 10) / 10).toString()

  // ---------- A praia (o contexto da sessão) ----------

  const CALCADAO = 85
  const H = 16
  const COR = { fundo: '#2F6FE0', beira: '#54C9C1', areia: '#F1DFA8', espuma: '#CFF5F1', molhada: '#C9AE6C' }
  const PEDRA = { pedra: '#E4E1DA', desenho: '#B9B4AA', meioFio: '#B5AFA3' }
  const GRAOS = [
    [0.08, 0.25, 0.5, 0], [0.17, 0.7, 0.45, 1], [0.26, 0.4, 0.4, 0], [0.34, 0.85, 0.5, 2], [0.42, 0.15, 0.4, 1],
    [0.5, 0.6, 0.45, 0], [0.58, 0.3, 0.4, 2], [0.66, 0.8, 0.5, 1], [0.74, 0.5, 0.4, 0], [0.82, 0.2, 0.45, 2],
    [0.9, 0.7, 0.4, 0], [0.13, 0.5, 0.35, 2], [0.38, 0.6, 0.35, 0], [0.62, 0.55, 0.35, 1], [0.86, 0.45, 0.35, 0],
  ]
  const COR_GRAO = ['#D9C38A', '#FFF3D0', '#E2CC93']
  const BOLHAS = [
    [0.1, 0.2, 0.45, 0.7], [0.3, 0.55, 0.35, 0.6], [0.5, 0.15, 0.4, 0.8], [0.2, 0.85, 0.5, 0.65],
    [0.65, 0.7, 0.35, 0.75], [0.8, 0.35, 0.45, 0.9], [0.45, 0.95, 0.3, 0.6], [0.9, 0.75, 0.4, 0.85],
  ]
  const SUAVE = '.45 0 .55 1;.45 0 .55 1'

  // `id` separa os gradientes de cada desenho: há mais de uma praia na mesma página.
  const praiaSvg = (pct, W, id, animado) => {
    const cx = Math.round((W * CALCADAO) / 100)
    const fr = Math.max(4, Math.round((W * limitar(pct, 0, 100)) / 100))
    const ressaca = fr > cx
    const beira = (dx, o) =>
      `M0,0 L${fr + o},0 C${fr + o + dx},${H * 0.33} ${fr + o - dx},${H * 0.66} ${fr + o},${H} L0,${H} Z`
    const traco = (d, cor, largura, opacidade = 1) =>
      `<path d="${d}" stroke="${cor}" stroke-width="${largura}" stroke-opacity="${opacidade}" fill="none" stroke-linecap="round"/>`

    const fimMolhada = fr + 18
    const molhada = `<path d="M${fr},0 C${fr + 4},${H * 0.33} ${fr - 4},${H * 0.66} ${fr},${H} L${fimMolhada},${H} L${fimMolhada},0 Z" fill="url(#${id}-molhada)"/>`
    const ini = fr + 8
    const fim = cx - 1
    const graos =
      fim - ini < 4
        ? ''
        : GRAOS.map(([x, y, r, c]) => `<circle cx="${n1(ini + x * (fim - ini))}" cy="${n1(y * H)}" r="${r}" fill="${COR_GRAO[c]}"/>`).join('')

    const listras = [H * 0.34, H * 0.72]
      .map(y => traco(`M${cx},${n1(y)} q3.5,-3 7,0 t7,0 t7,0 t7,0 t7,0`, PEDRA.desenho, 1.6))
      .join('')

    let espuma = ''
    if (ressaca) {
      const largura = fr - cx
      let renda = `M${n1(fr - 1.2)},0`
      for (let y = 0; y < H; y += 2.3) renda += ' q1.6,1.15 0,2.3'
      espuma = [
        `<rect x="${cx}" width="${largura}" height="${H}" fill="${COR.beira}"/>`,
        `<rect x="${cx}" width="${largura}" height="${H}" fill="url(#${id}-veu)"/>`,
        BOLHAS.map(([x, y, r, o]) => `<circle cx="${n1(cx + x * largura)}" cy="${n1(y * H)}" r="${r}" fill="#fff" fill-opacity="${o}"/>`).join(''),
        `<path d="${renda}" stroke="#fff" stroke-width="1.3" stroke-opacity=".95" fill="none"/>`,
      ].join('')
    }

    const base = cx + 3
    const topoX = base - 3.5
    const topoY = H * 0.275
    const tronco = `M${base},${H} Q${base - 0.7},${H * 0.6} ${topoX},${topoY}`
    const copa = `M${topoX},${topoY} q-4.2,-1.8 -6.3,1.9 M${topoX},${topoY} q4,-2.4 6,1.3 M${topoX},${topoY} q-1.2,-3.6 -4.2,-4 M${topoX},${topoY} q2.2,-3.6 5.2,-3`

    const vaiEVem = animado
      ? `<animate attributeName="d" dur="5.5s" repeatCount="indefinite" calcMode="spline" keySplines="${SUAVE}" values="${beira(4, 0)};${beira(-4, -5)};${beira(4, 0)}"/>`
      : ''
    const ola = animado
      ? `<rect x="-44" width="${W + 44}" height="${H}" fill="url(#${id}-ola)"><animateTransform attributeName="transform" type="translate" dur="3.6s" repeatCount="indefinite" values="0,0;44,0"/></rect>`
      : ''
    const espumaVaiEVem = animado
      ? `<animateTransform attributeName="transform" type="translate" dur="5.5s" repeatCount="indefinite" calcMode="spline" keySplines="${SUAVE}" values="0,0;-5,0;0,0"/>`
      : ''

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">`,
      '<defs>',
      `<linearGradient id="${id}-mar" x1="0" x2="1"><stop offset="0" stop-color="${COR.fundo}"/><stop offset="1" stop-color="${COR.beira}"/></linearGradient>`,
      `<linearGradient id="${id}-ola" gradientUnits="userSpaceOnUse" x1="0" x2="44" spreadMethod="repeat"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".26"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`,
      `<linearGradient id="${id}-molhada" gradientUnits="userSpaceOnUse" x1="${fr}" x2="${fr + 16}"><stop offset="0" stop-color="${COR.molhada}"/><stop offset="1" stop-color="${COR.areia}"/></linearGradient>`,
      `<linearGradient id="${id}-veu" gradientUnits="userSpaceOnUse" x1="${cx}" x2="${fr}"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity=".75"/></linearGradient>`,
      `<clipPath id="${id}-agua"><path d="${beira(4, 0)}">${vaiEVem}</path></clipPath>`,
      `<clipPath id="${id}-moldura"><rect width="${W}" height="${H}" rx="5"/></clipPath>`,
      '</defs>',
      `<g clip-path="url(#${id}-moldura)">`,
      `<rect width="${W}" height="${H}" fill="${COR.areia}"/>`,
      molhada,
      graos,
      `<rect x="${cx}" width="${W - cx}" height="${H}" fill="${PEDRA.pedra}"/>`,
      listras,
      `<rect x="${cx - 1}" width="1.2" height="${H}" fill="${PEDRA.meioFio}"/>`,
      `<g clip-path="url(#${id}-agua)">`,
      `<rect width="${W}" height="${H}" fill="url(#${id}-mar)"/>`,
      espuma,
      ola,
      '</g>',
      `<path fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="1.8" d="M${fr + 1.5},0 C${fr + 5.5},${H * 0.33} ${fr - 2.5},${H * 0.66} ${fr + 1.5},${H}">${espumaVaiEVem}</path>`,
      traco(tronco, '#FFFFFF', 2.8, 0.7),
      traco(copa, '#FFFFFF', 2.8, 0.7),
      traco(tronco, '#5E4220', 1.7),
      traco(copa, '#1F6E3F', 1.7),
      '</g>',
      '</svg>',
    ].join('')
  }

  // ---------- O pôr do sol (a janela de 5h) ----------

  const COR_SOL = {
    ceuAlto: ['#7CC6F2', '#F2B36B', '#E0745A', '#7E4A8C'],
    ceuBaixo: ['#CDEFFB', '#FBE3B4', '#F7B68A', '#E07A5F'],
    sol: ['#FFE23A', '#FFBE0B', '#FF8A1A', '#F25A0A'],
    noite: '#1B2A4E',
  }

  const solSvg = (pct, W, id) => {
    const t = limitar(pct, 0, 100) / 100
    const horizonte = H - 4
    const r = H * 0.26
    const cx = r + 2 + t * (W - 2 * r - 4)
    const cy = H * 0.3 + t * (horizonte - H * 0.3)
    const sol = tom(COR_SOL.sol, t)
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">`,
      '<defs>',
      `<linearGradient id="${id}-ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tom(COR_SOL.ceuAlto, t)}"/><stop offset="1" stop-color="${tom(COR_SOL.ceuBaixo, t)}"/></linearGradient>`,
      `<linearGradient id="${id}-passou" x1="0" x2="1"><stop offset="0" stop-color="${COR_SOL.noite}" stop-opacity=".55"/><stop offset="1" stop-color="${COR_SOL.noite}" stop-opacity=".12"/></linearGradient>`,
      `<clipPath id="${id}-moldura"><rect width="${W}" height="${H}" rx="5"/></clipPath>`,
      '</defs>',
      `<g clip-path="url(#${id}-moldura)">`,
      `<rect width="${W}" height="${H}" fill="url(#${id}-ceu)"/>`,
      t > 0 ? `<rect width="${n1(cx)}" height="${horizonte}" fill="url(#${id}-passou)"/>` : '',
      `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(r * 1.8)}" fill="${sol}" fill-opacity=".35"/>`,
      `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(r)}" fill="${sol}" stroke="#FFFFFF" stroke-opacity=".7" stroke-width=".8"/>`,
      `<rect y="${horizonte}" width="${W}" height="${H - horizonte}" fill="${COR.fundo}"/>`,
      `<rect x="${n1(cx - r)}" y="${horizonte + 1.5}" width="${n1(2 * r)}" height="1" fill="#FFD08A" fill-opacity=".7"/>`,
      '</g>',
      '</svg>',
    ].join('')
  }

  // ---------- A faixa no terminal ----------

  const CASAS = 10
  const CORES_5H = ['#54C9C1', '#E2B55A', '#E08362']
  const casas = (pct, corDaCasa) => {
    const cheias = pct > 0 ? limitar(Math.round((pct / 100) * CASAS), 1, CASAS) : 0
    return Array.from({ length: CASAS }, (_, i) => (i < cheias ? corDaCasa(((i + 0.5) / CASAS) * 100) : null))
  }

  // Monta a linha com elementos, sem texto vindo de fora: as cores são postas pelo script, não por atributo.
  // Cada medida é um pedaço que não quebra no meio: com pouca largura, ele desce inteiro para a linha de baixo.
  const desenharTerminal = (el, contexto, janela) => {
    const pedaco = (antes, cores, depois) => {
      const p = document.createElement('span')
      p.className = 'pedaco'
      if (antes) p.append(antes)
      for (const cor of cores) {
        const casa = document.createElement('span')
        casa.textContent = '▄'
        if (cor) casa.style.color = cor
        else casa.className = 'apagada'
        p.append(casa)
      }
      if (depois) p.append(depois)
      return p
    }
    el.replaceChildren(
      pedaco('Contexto ', casas(contexto, meio => (meio > CALCADAO ? COR.espuma : misturar(COR.fundo, COR.beira, meio / CALCADAO))), ` ${contexto}%`),
      pedaco('5h ', casas(janela, meio => tom(CORES_5H, meio / 100)), ` ${janela}% - 17:00`),
      pedaco('Sem. 70%   ≡', [], ''),
    )
  }

  // ---------- A torre na faixa e a cena do farol ----------

  const torreSvg = luz => {
    const aceso = luz
      ? `<g fill="${luz}"><polygon opacity=".8" points="11,4 0,1 0,7"/><polygon opacity=".8" points="15,4 26,1 26,7"/><rect x="11" y="2.5" width="4" height="3"/></g>`
      : '<rect opacity=".55" x="11" y="2.5" width="4" height="3"/>'
    return [
      '<svg class="torre" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 16" width="33" height="20" fill="currentColor" aria-hidden="true">',
      aceso,
      '<polygon points="10.5,2.5 13,0.5 15.5,2.5"/>',
      '<rect x="9.5" y="5.5" width="7" height="1"/>',
      '<polygon points="10.5,6.5 15.5,6.5 17,15 9,15"/>',
      '<rect x="7" y="15" width="12" height="1"/>',
      '</svg>',
    ].join('')
  }

  const CENA = {
    ceuAlto: '#06121F', ceuBaixo: '#10284A', horizonte: '#5E8FB8', mar: '#1A4C78', marFundo: '#12385A', lua: '#F3EEDC',
    rochedo: '#03080E', torre: '#E9E4D8', ferro: '#1B2633', vermelho: '#FF5A4A', azul: '#6FA8FF', ambar: '#F2C35B',
    coral: '#E0835A', branca: '#FFF4D6',
  }
  // A lanterna e os efeitos de cada situação.
  const SITUACAO = {
    esperando: { cor: CENA.vermelho, feixes: CENA.vermelho, halo: 0.55, pisca: true, sinalizadores: true },
    pergunta: { cor: CENA.coral, halo: 0.45 },
    'nao-visto': { cor: CENA.azul, feixes: CENA.azul, halo: 0.4, boia: true },
    trabalhando: { cor: CENA.ambar, halo: 0.4, respira: true },
    livres: { cor: CENA.branca, halo: 0.14 },
    // As situações juntas: a boia do não visto acende ao lado da luz de quem ganha.
    'esperando-e-nao-visto': { cor: CENA.vermelho, feixes: CENA.vermelho, halo: 0.55, pisca: true, sinalizadores: true, boia: true },
    'pergunta-e-nao-visto': { cor: CENA.coral, halo: 0.45, boia: true },
    'trabalhando-e-nao-visto': { cor: CENA.ambar, feixes: CENA.azul, halo: 0.4, respira: true, boia: true },
  }
  // A cena junta as sessões como o mod (plugins/farol/hooks/cena.ts): o esperando ganha, depois a pergunta; o não
  // visto acende a boia junto de qualquer uma e, sem as duas, deixa os feixes azuis.
  const situacaoDaCena = marcadas => {
    const naoVisto = marcadas.has('nao-visto')
    if (marcadas.has('esperando')) return naoVisto ? 'esperando-e-nao-visto' : 'esperando'
    if (marcadas.has('pergunta')) return naoVisto ? 'pergunta-e-nao-visto' : 'pergunta'
    if (naoVisto) return marcadas.has('trabalhando') ? 'trabalhando-e-nao-visto' : 'nao-visto'
    return marcadas.has('trabalhando') ? 'trabalhando' : 'livres'
  }
  const ESTRELAS = [
    [14, 12], [32, 34], [86, 9], [108, 28], [133, 16], [169, 38], [190, 10], [219, 24], [236, 42], [296, 12], [318, 31],
    [342, 18],
  ]
  const onda = (y, passo, desvio) => {
    let d = `M${-desvio} ${y}`
    for (let x = -desvio; x < 360 + passo; x += passo) d += ` q${passo / 4} -1.4 ${passo / 2} 0 t${passo / 2} 0`
    return d
  }

  // `id` separa os gradientes de cada cena: a da abertura e a da demonstração ficam na mesma página.
  // `alta` é a intensidade alta dos avisos: o feixe gira e pisca mais depressa e sobem mais sinalizadores.
  const cenaSvg = (estado, animado, id = 'cena', alta = false) => {
    const s = SITUACAO[estado]
    const LX = 252
    const LY = 35
    const piscada = alta ? '0.45s' : '0.9s'
    const anima = atributos => (animado ? `<animate ${atributos} repeatCount="indefinite"/>` : '')
    const balanco = dur =>
      animado
        ? `<animateTransform attributeName="transform" type="rotate" values="-7 ${LX} ${LY};7 ${LX} ${LY};-7 ${LX} ${LY}" dur="${dur}" calcMode="spline" keySplines="${SUAVE}" repeatCount="indefinite"/>`
        : ''
    const caminhoDaLua = [82, 88, 94, 100, 106, 112]
      .map((y, i) => `<line x1="${58 - 4 - i * 3}" y1="${y}" x2="${58 + 4 + i * 3}" y2="${y}" stroke="${CENA.lua}" stroke-width="1.3" stroke-linecap="round" opacity="${n1(0.6 - i * 0.08)}"/>`)
      .join('')
    const feixes = s.feixes
      ? [
          `<g opacity="${s.pisca ? 0.9 : 0.7}">`,
          `<polygon points="${LX},${LY} -30,6 -30,70" fill="url(#cena-feixe-e)"/>`,
          `<polygon points="${LX},${LY} 400,16 400,56" fill="url(#cena-feixe-d)"/>`,
          balanco(s.pisca ? (alta ? '1.4s' : '3.2s') : '7s'),
          s.pisca ? anima(`attributeName="opacity" values="0.9;0.25;0.9" dur="${piscada}"`) : '',
          '</g>',
        ].join('')
      : ''
    const sinalizadores = s.sinalizadores
      ? [
          `<rect width="360" height="76" fill="${CENA.vermelho}" opacity=".07"/>`,
          [[150, 30, '0s'], [316, 20, '1.1s'], ...(alta ? [[96, 46, '0.5s'], [206, 18, '1.7s'], [338, 48, '0.8s']] : [])]
            .map(([x, y, inicio]) => `<g><circle cx="${x}" cy="${y}" r="7" fill="${CENA.vermelho}" opacity=".18"/><circle cx="${x}" cy="${y}" r="2" fill="#FFE1DC"/>${anima(`attributeName="opacity" values="0;1;1;0" dur="2.6s" begin="${inicio}"`)}</g>`)
            .join(''),
        ].join('')
      : ''
    const boia = s.boia
      ? [
          '<g>',
          `<path d="M116 100 L120 90 L124 100 Z" fill="${CENA.torre}"/>`,
          `<rect x="114" y="100" width="12" height="3" rx="1.5" fill="${CENA.ferro}"/>`,
          `<circle cx="120" cy="88" r="7" fill="${CENA.azul}" opacity=".25">${anima('attributeName="opacity" values="0.35;0.05;0.35" dur="1.2s"')}</circle>`,
          `<circle cx="120" cy="88" r="2.4" fill="${CENA.azul}">${anima('attributeName="opacity" values="1;0.3;1" dur="1.2s"')}</circle>`,
          '</g>',
        ].join('')
      : ''

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 120" width="360" height="120" aria-hidden="true">',
      '<defs>',
      `<linearGradient id="cena-ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${CENA.ceuAlto}"/><stop offset="1" stop-color="${CENA.ceuBaixo}"/></linearGradient>`,
      `<linearGradient id="cena-mar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${CENA.mar}"/><stop offset="1" stop-color="${CENA.marFundo}"/></linearGradient>`,
      `<radialGradient id="cena-halo"><stop offset="0" stop-color="${s.cor}" stop-opacity="${s.halo}"/><stop offset="1" stop-color="${s.cor}" stop-opacity="0"/></radialGradient>`,
      s.feixes
        ? `<linearGradient id="cena-feixe-e" gradientUnits="userSpaceOnUse" x1="${LX}" x2="0"><stop offset="0" stop-color="${s.feixes}" stop-opacity=".6"/><stop offset="1" stop-color="${s.feixes}" stop-opacity="0"/></linearGradient><linearGradient id="cena-feixe-d" gradientUnits="userSpaceOnUse" x1="${LX}" x2="360"><stop offset="0" stop-color="${s.feixes}" stop-opacity=".6"/><stop offset="1" stop-color="${s.feixes}" stop-opacity="0"/></linearGradient>`
        : '',
      '</defs>',
      '<rect width="360" height="76" fill="url(#cena-ceu)"/>',
      '<rect y="76" width="360" height="44" fill="url(#cena-mar)"/>',
      sinalizadores,
      `<rect y="75" width="360" height="1.6" fill="${CENA.horizonte}" opacity=".85"/>`,
      ESTRELAS.map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="#E8EEF6" opacity=".8"/>`).join(''),
      `<circle cx="58" cy="24" r="18" fill="${CENA.lua}" opacity=".1"/>`,
      `<circle cx="58" cy="24" r="9" fill="${CENA.lua}"/>`,
      `<g>${caminhoDaLua}${anima('attributeName="opacity" values="0.7;1;0.7" dur="5s"')}</g>`,
      `<path d="${onda(86, 24, 0)}" fill="none" stroke="${CENA.horizonte}" stroke-width=".9" opacity=".35"/>`,
      `<path d="${onda(98, 30, 9)}" fill="none" stroke="${CENA.horizonte}" stroke-width=".9" opacity=".3"/>`,
      `<path d="${onda(110, 36, 17)}" fill="none" stroke="${CENA.horizonte}" stroke-width=".9" opacity=".25"/>`,
      // O reflexo da lanterna no mar.
      `<ellipse cx="${LX}" cy="102" rx="9" ry="16" fill="${s.cor}" opacity="${n1(s.halo * 0.55)}">${anima('attributeName="rx" values="9;12;9" dur="4s"')}</ellipse>`,
      boia,
      feixes,
      `<circle cx="${LX}" cy="${LY}" r="34" fill="url(#cena-halo)">${s.respira ? anima('attributeName="opacity" values="1;0.55;1" dur="6s"') : ''}</circle>`,
      // O rochedo e a torre, com a galeria e a lanterna.
      `<path d="M206 120 Q220 98 238 93 L266 92 Q286 98 300 120 Z" fill="${CENA.rochedo}"/>`,
      `<path d="M243 93 L247 42 L257 42 L261 93 Z" fill="${CENA.torre}"/>`,
      `<polygon points="245.6,60 258.4,60 259.1,69 244.9,69" fill="${CENA.ferro}" opacity=".85"/>`,
      `<rect x="250" y="80" width="4" height="13" rx="2" fill="${CENA.ferro}"/>`,
      `<rect x="243.5" y="40" width="17" height="2.4" rx="1" fill="${CENA.ferro}"/>`,
      `<rect x="247.5" y="30" width="9" height="10" rx="1" fill="${s.cor}">${s.pisca ? anima(`attributeName="opacity" values="1;0.35;1" dur="${piscada}"`) : ''}</rect>`,
      `<path d="M247.5 30 V40 M252 30 V40 M256.5 30 V40" stroke="${CENA.ferro}" stroke-width=".8" opacity=".7"/>`,
      `<path d="M245.5 30 L252 23 L258.5 30 Z" fill="${CENA.ferro}"/>`,
      `<circle cx="252" cy="22.4" r="1.2" fill="${CENA.ferro}"/>`,
      '</svg>',
    ]
      .join('')
      .replaceAll('cena-', `${id}-`)
  }

  // As sessões de exemplo do painel: nomes inventados, só para mostrar a ordem e as cores.
  const BASE = [
    ['Revisar o PR do checkout', 'loja-api'],
    ['Migrar os testes de integração', 'loja-web'],
    ['Rascunho da ADR de cache', 'docs'],
    ['Atualizar as dependências', 'loja-app'],
  ]
  // O painel da janela da abertura, em cada passo da roda dela.
  const PAINEL = {
    esperando: { estados: ['esperando', 'trabalhando', 'livre'], tempos: ['há 6 min', 'há 2 min', 'há 14 min'] },
    pergunta: { estados: ['pergunta', 'trabalhando', 'livre'], tempos: ['há 1 min', 'há 3 min', 'há 15 min'] },
    'nao-visto': { estados: ['nao-visto', 'trabalhando', 'livre'], tempos: ['há 3 min', 'há 4 min', 'há 16 min'] },
    trabalhando: { estados: ['trabalhando', 'trabalhando', 'livre'], tempos: ['há 1 min', 'há 5 min', 'há 17 min'] },
    'esperando-e-nao-visto': { estados: ['esperando', 'nao-visto', 'trabalhando'], tempos: ['há 6 min', 'há 3 min', 'há 1 min'] },
  }
  // Na demonstração, o tempo de cada cartão, de cima para baixo.
  const TEMPOS = ['há 6 min', 'há 3 min', 'há 2 min', 'há 14 min']
  const NOME = {
    esperando: ['Esperando', 'Esperando', 'esperando você'],
    pergunta: ['Pergunta', 'Perguntas', 'pergunta para você'],
    'nao-visto': ['Não visto', 'Não vistos', 'resposta não vista'],
    trabalhando: ['Trabalhando', 'Trabalhando', 'trabalhando'],
    livre: ['Livre', 'Livres', 'livre'],
  }
  const ORDEM = ['esperando', 'pergunta', 'nao-visto', 'trabalhando', 'livre']

  // O que a cena mostra para as situações marcadas, em frases: a luz de quem ganha, o que só aparece no cartão e a
  // boia. A intensidade alta só muda o aviso de quem espera.
  const leituraDoFarol = (marcadas, alta) => {
    const tem = e => marcadas.has(e)
    const frases = []
    if (tem('esperando')) {
      frases.push(
        alta
          ? 'Uma sessão espera você, na intensidade alta: a lanterna pisca e os feixes giram mais depressa, e sobem mais sinalizadores.'
          : 'Uma sessão espera você: a lanterna pisca em vermelho e os feixes giram.',
      )
      if (tem('pergunta')) frases.push('A pergunta fica no selo e no cartão: na cena, o vermelho ganha.')
    } else if (tem('pergunta')) {
      frases.push('Uma sessão deixou uma pergunta, mas segue sem você: a lanterna fica coral, parada.')
    }
    if (tem('nao-visto')) {
      frases.push(
        tem('esperando') || tem('pergunta')
          ? 'A boia azul pisca no mar pela resposta que você não viu.'
          : tem('trabalhando')
            ? 'Uma sessão respondeu fora da tela: a boia azul pisca e os feixes ficam azuis, com a lanterna em âmbar por quem trabalha.'
            : 'Uma sessão respondeu fora da tela: a boia azul pisca no mar e os feixes ficam azuis.',
      )
    } else if (tem('trabalhando') && !tem('esperando') && !tem('pergunta')) {
      frases.push('Ninguém precisa de você agora: a lanterna e o halo ficam em âmbar enquanto as sessões trabalham.')
    }
    if (!marcadas.size) frases.push('Tudo livre: só a luz branca, bem fraca.')
    if (alta && !tem('esperando')) frases.push('A intensidade alta só muda o aviso de quem espera você.')
    return frases.join(' ')
  }

  // Um SVG montado aqui, com números e cores do próprio script, vira elementos pelo analisador de SVG.
  const desenhar = (el, svg) => {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
    el.replaceChildren(document.importNode(doc.documentElement, true))
  }

  // ---------- A demonstração da barra de uso ----------

  const iniciarBarra = () => {
    const praia = $('#desenho-praia')
    const sol = $('#desenho-sol')
    if (!praia || !sol) return
    const controleContexto = $('#controle-contexto')
    const controleJanela = $('#controle-5h')
    const leitura = $('#leitura-barra')
    const terminal = $('#linha-terminal')

    const atualizar = () => {
      const contexto = Number(controleContexto.value)
      const janela = Number(controleJanela.value)
      desenhar(praia, praiaSvg(contexto, 132, 'demo-praia', comMovimento()))
      desenhar(sol, solSvg(janela, 132, 'demo-sol'))
      desenharTerminal(terminal, contexto, janela)
      $('#valor-contexto').textContent = `${contexto}%`
      $('#valor-5h').textContent = `${janela}% · 17:00`
      controleContexto.setAttribute('aria-valuetext', `${contexto}% do contexto`)
      controleJanela.setAttribute('aria-valuetext', `${janela}% da janela de 5 horas`)

      const ressaca = contexto > CALCADAO
      const texto = ressaca
        ? 'Ressaca: o mar passou do meio-fio e cobriu o calçadão de espuma. Hora de pensar num /compact.'
        : janela >= 90
          ? 'O sol chegou ao horizonte: a janela de 5h está no fim e renova às 17:00.'
          : contexto === 0
            ? 'Sessão nova: a praia inteira pela frente.'
            : 'O mar avança sobre a areia conforme o contexto enche. O calçadão começa em 85%.'
      if (leitura.textContent !== texto) leitura.textContent = texto
      leitura.toggleAttribute('data-alerta', ressaca)
    }

    controleContexto.addEventListener('input', atualizar)
    controleJanela.addEventListener('input', atualizar)
    aoMudarMovimento.push(atualizar)

    const botoes = $$('[data-superficie]')
    for (const botao of botoes) {
      botao.addEventListener('click', () => {
        const terminalAtivo = botao.dataset.superficie === 'terminal'
        for (const b of botoes) b.setAttribute('aria-pressed', String(b === botao))
        $('#palco-app').hidden = terminalAtivo
        $('#palco-terminal').hidden = !terminalAtivo
      })
    }
    atualizar()
  }

  // ---------- As sessões do painel do farol (na demonstração e na janela da abertura) ----------

  const sessoesDe = estado => {
    const painel = PAINEL[estado]
    return painel.estados.map((e, i) => ({ titulo: BASE[i][0], pasta: BASE[i][1], estado: e, tempo: painel.tempos[i] }))
  }

  // Na demonstração, cada situação marcada é uma sessão, na ordem da atenção; as que sobram ficam livres.
  const sessoesDasMarcadas = marcadas => {
    const estados = ORDEM.filter(e => marcadas.has(e))
    return BASE.map(([titulo, pasta], i) => ({ titulo, pasta, estado: estados[i] ?? 'livre', tempo: TEMPOS[i] }))
  }

  const itemDaSessao = s => {
    const item = document.createElement('li')
    item.className = 'sessao'
    item.dataset.tom = s.estado
    const titulo = document.createElement('span')
    titulo.className = 'sessao-titulo'
    titulo.textContent = s.titulo
    const linha = document.createElement('span')
    linha.className = 'sessao-linha'
    const nome = document.createElement('b')
    nome.textContent = NOME[s.estado][2]
    linha.append(`${s.pasta} · ${s.tempo} · `, nome)
    item.append(titulo, linha)
    return item
  }

  // ---------- A demonstração do farol ----------

  const iniciarFarol = () => {
    const cena = $('#cena-farol')
    if (!cena) return
    const selos = $('#selos-farol')
    const lista = $('#sessoes-farol')
    const leitura = $('#leitura-farol')
    const botoes = $$('[data-estado]')
    const intensidades = $$('[data-intensidade]')
    // Enquanto ninguém escolhe, a demonstração passa sozinha por estas combinações.
    const PASSEIO = [
      ['esperando', 'trabalhando'],
      ['esperando', 'nao-visto', 'trabalhando'],
      ['pergunta', 'trabalhando'],
      ['nao-visto', 'trabalhando'],
      ['trabalhando'],
      [],
    ]
    let passo = 0
    let marcadas = new Set(PASSEIO[passo])
    let alta = false
    let mexeu = false

    const mostrar = () => {
      for (const b of botoes) {
        const e = b.dataset.estado
        b.setAttribute('aria-pressed', String(e === 'livres' ? !marcadas.size : marcadas.has(e)))
      }
      for (const b of intensidades) b.setAttribute('aria-pressed', String((b.dataset.intensidade === 'alta') === alta))
      const texto = leituraDoFarol(marcadas, alta)
      desenhar(cena, cenaSvg(situacaoDaCena(marcadas), comMovimento(), 'cena', alta))
      cena.setAttribute('aria-label', `A cena do farol. ${texto}`)
      leitura.textContent = texto

      const sessoes = sessoesDasMarcadas(marcadas)
      const contagem = new Map()
      for (const s of sessoes) contagem.set(s.estado, (contagem.get(s.estado) ?? 0) + 1)

      selos.replaceChildren(
        ...ORDEM.filter(e => contagem.has(e)).map(e => {
          const n = contagem.get(e)
          const selo = document.createElement('span')
          selo.className = 'selo'
          selo.dataset.tom = e
          selo.textContent = `${n} ${NOME[e][n === 1 ? 0 : 1]}`
          return selo
        }),
      )
      lista.replaceChildren(...sessoes.map(itemDaSessao))
    }

    for (const botao of botoes) {
      botao.addEventListener('click', () => {
        mexeu = true
        const e = botao.dataset.estado
        if (e === 'livres') marcadas.clear()
        else if (!marcadas.delete(e)) marcadas.add(e)
        mostrar()
      })
    }
    for (const botao of intensidades) {
      botao.addEventListener('click', () => {
        mexeu = true
        alta = botao.dataset.intensidade === 'alta'
        mostrar()
      })
    }
    aoMudarMovimento.push(mostrar)
    mostrar()

    // O passeio só anda com a demonstração na tela, e para de vez no primeiro clique.
    let naTela = false
    new IntersectionObserver(entradas => { naTela = entradas.some(e => e.isIntersecting) }, { threshold: 0.4 }).observe(cena)
    window.setInterval(() => {
      if (mexeu || !naTela || document.hidden || !comMovimento()) return
      passo = (passo + 1) % PASSEIO.length
      marcadas = new Set(PASSEIO[passo])
      mostrar()
    }, 4200)
  }

  // ---------- A janela da abertura: a faixa do barra-de-uso e o painel do farol ----------

  const iniciarAbertura = () => {
    const faixa = $('#faixa-abertura')
    if (!faixa) return
    const cenaDoPainel = $('#cena-abertura')
    const listaDoPainel = $('#sessoes-abertura')

    const item = (rotulo, svg, valor) => {
      const el = document.createElement('span')
      el.className = 'item'
      if (rotulo) el.append(rotulo)
      const desenho = document.createElement('span')
      if (svg) el.append(desenho)
      const numero = document.createElement('b')
      if (valor !== undefined) el.append(numero)
      return { el, desenho, numero }
    }
    const divisa = () => {
      const el = document.createElement('span')
      el.className = 'divisa'
      return el
    }
    const torre = document.createElement('span')
    torre.className = 'item torre'
    const torreDesenho = document.createElement('span')
    const torreConta = document.createElement('b')
    torre.append(torreDesenho, torreConta)
    // Como no app: "Contexto", a praia e o número; o pôr do sol e o horário, sem rótulo; a semana; e os ajustes.
    const contexto = item('Contexto', true, '')
    const janela = item('', true, '')
    const semana = item('Sem.', false, '')
    semana.numero.textContent = '70%'
    const ancora = document.createElement('span')
    ancora.className = 'ancora'
    ancora.textContent = '⚓'
    faixa.replaceChildren(torre, divisa(), contexto.el, divisa(), janela.el, divisa(), semana.el, ancora)

    // No mod, as barras acompanham a largura da faixa, de 64 a 96 px. Aqui também, para tudo caber numa linha.
    let larguraDaBarra = 64
    let ultimoPct = 62
    const pintar = (pct, comOla) => {
      ultimoPct = pct
      const inteiro = Math.round(pct)
      desenhar(contexto.desenho, praiaSvg(pct, larguraDaBarra, 'faixa-praia', comOla))
      contexto.numero.textContent = `${inteiro}%`
      const usada = Math.round(30 + pct * 0.2)
      desenhar(janela.desenho, solSvg(usada, larguraDaBarra, 'faixa-sol'))
      janela.numero.textContent = `${usada}% - 17:00`
    }
    const ajustarBarras = () => {
      const estilo = window.getComputedStyle(faixa)
      const vao = parseFloat(estilo.columnGap) || 0
      const livre = faixa.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight)
      let ocupado = vao * (faixa.children.length - 1)
      for (const el of faixa.children) ocupado += el.getBoundingClientRect().width
      const semAsBarras = ocupado - 2 * larguraDaBarra
      const nova = limitar(Math.floor((livre - semAsBarras - 2) / 2), 64, 96)
      if (nova === larguraDaBarra) return
      larguraDaBarra = nova
      pintar(ultimoPct, false)
    }

    // O painel do farol passa pelas situações que mais importam, da mais urgente para a mais calma, e fecha com
    // a intensidade alta dos avisos. A torre da faixa acende com ele, como no mod; na alta, mostra a contagem.
    const RODA = [
      { estado: 'esperando-e-nao-visto' },
      { estado: 'esperando' },
      { estado: 'nao-visto' },
      { estado: 'trabalhando' },
      { estado: 'pergunta' },
      { estado: 'esperando-e-nao-visto', alta: true },
    ]
    const LUZ_DA_TORRE = { 'esperando-e-nao-visto': '#F2907F', esperando: '#F2907F', pergunta: '#F2A483', 'nao-visto': '#8FBDF5' }
    let passoDaRoda = 0
    const mostrarPainel = () => {
      const { estado, alta = false } = RODA[passoDaRoda]
      desenhar(torreDesenho, torreSvg(LUZ_DA_TORRE[estado] ?? null))
      torreConta.textContent = alta ? '1' : ''
      if (!cenaDoPainel) return
      desenhar(cenaDoPainel, cenaSvg(estado, comMovimento(), 'topo', alta))
      listaDoPainel.replaceChildren(...sessoesDe(estado).map(itemDaSessao))
    }

    // Enquanto o contexto sobe, a conversa mostra o Claude trabalhando: é o trabalho que enche o contexto.
    const trabalho = $('#trabalho-abertura')
    const ETAPAS = ['Lendo os arquivos do PR', 'Rodando os testes', 'Conferindo o carrinho', 'Escrevendo os comentários', 'Revisando o resumo']
    const dizer = texto => {
      if (trabalho && trabalho.textContent !== texto) trabalho.textContent = texto
    }

    // O contexto enche devagar, passa do calçadão (ressaca), e um /compact devolve a praia.
    const SOBE = 15000
    const ESPERA = 2600
    const DESCE = 1100
    const DE = 34
    const ATE = 96
    const DEPOIS = 16
    let naTela = true
    let inicio = performance.now()
    let ultimoDesenho = ''
    let rodando = false

    const quadro = agora => {
      if (!comMovimento()) {
        rodando = false
        return
      }
      if (naTela && !document.hidden) {
        const t = (agora - inicio) % (SOBE + ESPERA + DESCE + ESPERA)
        let pct
        if (t < SOBE) pct = DE + (ATE - DE) * (t / SOBE)
        else if (t < SOBE + ESPERA) pct = ATE
        else if (t < SOBE + ESPERA + DESCE) {
          const p = (t - SOBE - ESPERA) / DESCE
          pct = ATE + (DEPOIS - ATE) * (1 - Math.pow(1 - p, 3))
        } else pct = DEPOIS + (DE - DEPOIS) * ((t - SOBE - ESPERA - DESCE) / ESPERA)
        // Redesenha só quando o número muda. Enquanto o mar sobe ou desce, o movimento é a própria subida; parado
        // no alto, a beira vai e volta pela animação do SVG (redesenhar a cada quadro a reiniciaria).
        const inteiro = Math.round(pct)
        const parouNoAlto = t >= SOBE && t < SOBE + ESPERA
        const chave = `${inteiro}-${parouNoAlto}`
        if (chave !== ultimoDesenho) {
          ultimoDesenho = chave
          pintar(inteiro, parouNoAlto)
        }
        if (t < SOBE) dizer(ETAPAS[Math.min(ETAPAS.length - 1, Math.floor((t / SOBE) * ETAPAS.length))])
        else if (t < SOBE + ESPERA) dizer('Contexto quase cheio')
        else if (t < SOBE + ESPERA + DESCE) dizer('/compact: resumindo a conversa')
        else dizer('Voltando ao trabalho')
      }
      window.requestAnimationFrame(quadro)
    }
    const rodar = () => {
      if (rodando || !comMovimento()) return
      rodando = true
      inicio = performance.now()
      window.requestAnimationFrame(quadro)
    }

    // O primeiro desenho sai na hora: numa aba aberta em segundo plano, o navegador segura a animação, e a faixa
    // não pode ficar vazia até a pessoa chegar.
    pintar(comMovimento() ? DE : 62, false)
    mostrarPainel()
    rodar()
    aoMudarMovimento.push(() => {
      mostrarPainel()
      if (comMovimento()) rodar()
      else {
        ultimoDesenho = ''
        pintar(62, false)
        dizer('Rodando os testes')
      }
    })
    new IntersectionObserver(entradas => { naTela = entradas.some(e => e.isIntersecting) }).observe(faixa)
    window.setInterval(() => {
      if (!naTela || document.hidden || !comMovimento()) return
      passoDaRoda = (passoDaRoda + 1) % RODA.length
      mostrarPainel()
    }, 3800)

    // A largura das barras é medida de novo quando a faixa muda de tamanho e quando as fontes chegam.
    ajustarBarras()
    new ResizeObserver(ajustarBarras).observe(faixa)
    document.fonts?.ready.then(ajustarBarras)
  }

  // ---------- Instalar ----------

  const iniciarInstalador = () => {
    const lista = $('#comandos-instalar')
    if (!lista) return
    const botoesMod = $$('[data-mod]')
    const botoesOnde = $$('[data-onde]')
    // Os mods são os botões da escolha, menos o "Todos": um mod novo no HTML já entra no "Todos".
    const MODS = botoesMod.map(b => b.dataset.mod).filter(mod => mod !== 'todos')

    const caixaDoComando = mod => {
      const caixa = document.createElement('div')
      caixa.className = 'comando'
      caixa.setAttribute('data-comando', '')
      const codigo = document.createElement('code')
      codigo.textContent = `claude plugin install ${mod} --marketplace https://github.com/orladigital/mare-mods.git`
      const botao = document.createElement('button')
      botao.type = 'button'
      botao.className = 'copiar'
      botao.setAttribute('data-copiar', '')
      botao.setAttribute('aria-label', `Copiar o comando de instalação do ${mod}`)
      botao.textContent = 'Copiar'
      caixa.append(codigo, botao)
      return caixa
    }

    const escolher = escolha => {
      const mods = escolha === 'todos' ? MODS : [escolha]
      for (const b of botoesMod) b.setAttribute('aria-pressed', String(b.dataset.mod === escolha))
      // No terminal: um comando por mod.
      lista.replaceChildren(...mods.map(caixaDoComando))
      $('#um-por-mod').hidden = mods.length < 2
      // No app: o nome de cada mod a escolher em "Add plugin".
      const noApp = $('#mod-no-app')
      noApp.replaceChildren()
      mods.forEach((mod, i) => {
        if (i > 0) noApp.append('; depois, de novo, ')
        const nome = document.createElement('code')
        nome.textContent = mod
        noApp.append(nome)
      })
      for (const el of $$('[data-mod-nome]')) el.textContent = mods.length === 1 ? mods[0] : 'nome-do-mod'
    }

    for (const botao of botoesMod) botao.addEventListener('click', () => escolher(botao.dataset.mod))
    for (const botao of botoesOnde) {
      botao.addEventListener('click', () => {
        const app = botao.dataset.onde === 'app'
        for (const b of botoesOnde) b.setAttribute('aria-pressed', String(b === botao))
        $('#passos-app').hidden = !app
        $('#passos-terminal').hidden = app
      })
    }
  }

  // ---------- Copiar ----------

  // Um ouvinte só, na página: os comandos de "Instalar" são refeitos a cada escolha.
  const iniciarCopiar = () => {
    const anuncio = $('#anuncio')
    const voltas = new WeakMap()
    document.addEventListener('click', async evento => {
      const botao = evento.target instanceof Element ? evento.target.closest('[data-copiar]') : null
      if (!botao) return
      const codigo = $('code', botao.closest('[data-comando]'))
      let copiou = false
      try {
        await navigator.clipboard.writeText(codigo.textContent.trim())
        copiou = true
      } catch {
        // Sem a área de transferência (página fora de HTTPS, permissão negada): seleciona para o Ctrl+C.
        const trecho = document.createRange()
        trecho.selectNodeContents(codigo)
        const selecao = window.getSelection()
        selecao.removeAllRanges()
        selecao.addRange(trecho)
      }
      botao.textContent = copiou ? 'Copiado' : 'Selecionado'
      botao.toggleAttribute('data-copiado', copiou)
      anuncio.textContent = copiou ? 'Comando copiado.' : 'Comando selecionado: copie com Ctrl+C.'
      window.clearTimeout(voltas.get(botao))
      voltas.set(
        botao,
        window.setTimeout(() => {
          botao.textContent = 'Copiar'
          botao.removeAttribute('data-copiado')
          anuncio.textContent = ''
        }, 2200),
      )
    })
  }

  // ---------- A barra de cima: a pausa, a maré da página e a seção atual ----------

  // Todo movimento que começa sozinho e dura mais de 5 segundos precisa de um jeito de parar.
  const iniciarPausa = () => {
    const botao = $('#pausa')
    if (!botao) return
    botao.hidden = false
    botao.addEventListener('click', () => {
      parado = !parado
      document.documentElement.toggleAttribute('data-parado', parado)
      botao.setAttribute('aria-pressed', String(parado))
      $('#pausa-texto').textContent = parado ? 'Retomar o movimento' : 'Pausar o movimento'
      avisarMovimento()
    })
  }

  // A tira embaixo da barra é a praia do barra-de-uso medindo o quanto da página já passou.
  const iniciarMare = () => {
    const nivel = $('#mare-nivel')
    if (!nivel) return
    let pedido = false
    const medir = () => {
      pedido = false
      const total = document.documentElement.scrollHeight - window.innerHeight
      nivel.style.width = `${total > 0 ? limitar(window.scrollY / total, 0, 1) * 100 : 0}%`
    }
    const pedir = () => {
      if (pedido) return
      pedido = true
      window.requestAnimationFrame(medir)
    }
    window.addEventListener('scroll', pedir, { passive: true })
    window.addEventListener('resize', pedir)
    medir()
  }

  // A seção atual, na barra de cima e no índice lateral: vale o que cruza o meio da tela.
  const iniciarSecaoAtual = () => {
    const doMenu = $$('.menu a[data-secao]')
    const daTrilha = $$('.trilha a[data-parte]')
    const noMeio = new Set()
    const marcar = (link, atual) => {
      if (atual) link.setAttribute('aria-current', 'true')
      else link.removeAttribute('aria-current')
    }
    const atualizar = () => {
      for (const link of doMenu) marcar(link, noMeio.has(link.dataset.secao))
      // No índice lateral, as partes ficam umas dentro das outras (os mods dentro do mar): vale a de mais baixo.
      const ultima = daTrilha.filter(link => noMeio.has(link.dataset.parte)).pop()
      for (const link of daTrilha) marcar(link, link === ultima)
    }
    const olho = new IntersectionObserver(
      entradas => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) noMeio.add(entrada.target.id)
          else noMeio.delete(entrada.target.id)
        }
        atualizar()
      },
      { rootMargin: '-50% 0px -50% 0px' },
    )
    const ids = new Set([...doMenu.map(link => link.dataset.secao), ...daTrilha.map(link => link.dataset.parte)])
    for (const id of ids) {
      const parte = document.getElementById(id)
      if (parte) olho.observe(parte)
    }

    // Sobre o farol do fim do mar, o índice lateral sai da frente do desenho; volta quando o farol passa.
    const trilha = $('.trilha')
    const ponta = $('.ponta')
    if (trilha && ponta) {
      new IntersectionObserver(
        entradas => { trilha.toggleAttribute('data-recolhida', entradas.some(e => e.isIntersecting)) },
        { rootMargin: '-28% 0px -28% 0px' },
      ).observe(ponta)
    }
  }

  // O índice dos mods abre ao passar o mouse e fecha ao sair, com uma folga para o caminho até a lista. O estilo
  // já o abre pelo teclado; isto vale também onde o navegador não avisa o estilo de que o mouse está em cima.
  const iniciarIndiceDosMods = () => {
    const caixa = $('.menu-mods')
    if (!caixa) return
    let espera
    const abrir = () => {
      window.clearTimeout(espera)
      caixa.setAttribute('data-aberto', '')
    }
    const fechar = () => {
      window.clearTimeout(espera)
      caixa.removeAttribute('data-aberto')
    }
    caixa.addEventListener('pointerenter', abrir)
    caixa.addEventListener('pointerleave', () => {
      window.clearTimeout(espera)
      espera = window.setTimeout(fechar, 180)
    })
    caixa.addEventListener('keydown', evento => {
      if (evento.key !== 'Escape') return
      fechar()
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    })
    // Depois de escolher, o índice fecha: o foco que ficaria no link o manteria aberto.
    for (const link of $$('a', caixa)) {
      link.addEventListener('click', () => {
        fechar()
        window.setTimeout(() => link.blur(), 0)
      })
    }
  }

  // O mergulho: a página desce devagar até os mods, acelerando e freando. Qualquer gesto de quem lê (roda do
  // mouse, toque, tecla) devolve o controle na hora. Com o movimento desligado, o link pula direto.
  const iniciarMergulho = () => {
    const botao = $('.mergulho')
    const alvo = $('#mods')
    if (!botao || !alvo) return
    botao.addEventListener('click', evento => {
      if (!comMovimento()) return
      evento.preventDefault()
      const de = window.scrollY
      const ate = alvo.getBoundingClientRect().top + window.scrollY - 58
      const DURA = 1900
      const inicio = performance.now()
      let largou = false
      const largar = () => {
        largou = true
      }
      const GESTOS = ['wheel', 'touchstart', 'keydown', 'pointerdown']
      for (const gesto of GESTOS) window.addEventListener(gesto, largar, { once: true, passive: true })
      const passo = agora => {
        if (largou) return
        const p = Math.min(1, (agora - inicio) / DURA)
        // Suave nas duas pontas.
        const suave = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
        window.scrollTo({ top: de + (ate - de) * suave, behavior: 'instant' })
        if (p < 1) window.requestAnimationFrame(passo)
        else for (const gesto of GESTOS) window.removeEventListener(gesto, largar)
      }
      window.requestAnimationFrame(passo)
    })
  }

  iniciarAbertura()
  iniciarMergulho()
  iniciarIndiceDosMods()
  iniciarBarra()
  iniciarFarol()
  iniciarInstalador()
  iniciarCopiar()
  iniciarPausa()
  iniciarMare()
  iniciarSecaoAtual()
})()
