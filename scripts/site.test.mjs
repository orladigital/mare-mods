// Confere a página (site/) e o workflow que a publica (.github/workflows/pages.yml).
// - A página repete o que está no marketplace e no CI (os mods e a versão mínima do Claude Code): o teste falha
//   quando um deles muda e a página não.
// - A segurança dela: nada de script nem de estilo dentro do HTML, nada carregado de fora da pasta, um script que
//   não fala com a rede nem guarda dado de quem visita, e uma política de segurança sem exceção.
// - A publicação: ações fixadas por commit, permissão mínima, só da main, e só os arquivos de uma lista fechada.
// Roda com `node --test scripts/site.test.mjs`.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const ler = (...partes) => readFileSync(join(RAIZ, ...partes), 'utf8')

const html = ler('site', 'index.html')
const script = ler('site', 'app.js')
const estilo = ler('site', 'estilo.css')
const workflow = ler('.github', 'workflows', 'pages.yml')
const mods = JSON.parse(ler('.claude-plugin', 'marketplace.json')).plugins.map(p => p.name)

const REPO = 'https://github.com/orladigital/mare-mods'
// Para onde um link da página pode levar. Nada é carregado desses endereços: são só links.
const LINKS = [REPO, 'https://www.orla.tech/']
// O que não vai ao ar: a documentação da pasta, a das fontes e o texto da licença de cada fonte.
const SO_NO_REPO = [
  'README.md',
  'fontes/LEIA-ME.md',
  'fontes/OFL-inter.txt',
  'fontes/OFL-inter-tight.txt',
  'fontes/OFL-space-mono.txt',
]
// As fontes da página, com a impressão digital (SHA-256) de cada arquivo como foi baixado e conferido. Um arquivo
// trocado, mesmo com o mesmo nome, falha aqui. A origem de cada um está em site/fontes/LEIA-ME.md.
const FONTES = {
  'fontes/inter-latin.woff2': 'c940764593d0fe5d596be327ca7558855e018039fb78509aa21921fd3644c3e4',
  'fontes/inter-tight-latin.woff2': '83d548cd73ef2e039167db3adb5ea9d7a7870466ffc8a162c9820bc348938aaf',
  'fontes/space-mono-400-latin.woff2': 'e0c8e616bda27642f4c3cebaecff6525d901e73afc8a227cbbb0f2af4810f300',
}

// Os arquivos de site/, com o caminho a partir dela.
const arquivosDe = (pasta, prefixo = '') =>
  readdirSync(join(pasta, prefixo), { withFileTypes: true }).flatMap(d =>
    d.isDirectory() ? arquivosDe(pasta, `${prefixo}${d.name}/`) : [`${prefixo}${d.name}`],
  )

// ---------- O conteúdo ----------

test('a página mostra cada mod do marketplace, com o comando de instalação', () => {
  for (const mod of mods) {
    assert.ok(html.includes(`id="${mod}"`), `falta a seção do mod ${mod}`)
    assert.ok(html.includes(`claude plugin install ${mod} --marketplace ${REPO}.git`), `falta o comando de instalação do ${mod}`)
    assert.ok(html.includes(`data-mod="${mod}"`), `falta o ${mod} na escolha de "Instalar"`)
  }
})

test('a escolha de "Instalar" tem os mods do marketplace e o "Todos", e nada além', () => {
  const naPagina = [...html.matchAll(/data-mod="([^"]+)"/g)].map(m => m[1])
  assert.deepEqual(naPagina.sort(), [...mods, 'todos'].sort())
})

test('a versão mínima do Claude Code é a do CI', () => {
  const noCi = /CLAUDE_CODE_VERSAO:\s*([\d.]+)/.exec(ler('.github', 'workflows', 'ci.yml'))?.[1]
  const naPagina = /data-versao-minima>([\d.]+)</.exec(html)?.[1]
  assert.ok(noCi, 'não achei o CLAUDE_CODE_VERSAO no ci.yml')
  assert.equal(naPagina, noCi)
})

test('cada link do menu leva a uma seção que existe', () => {
  const ancoras = [...html.matchAll(/href="#([^"]+)"/g)].map(m => m[1])
  assert.ok(ancoras.length > 0)
  for (const id of ancoras) assert.ok(html.includes(`id="${id}"`), `o link #${id} não leva a lugar nenhum`)
})

// ---------- A segurança da página ----------

test('nada de script nem de estilo dentro do HTML', () => {
  assert.equal(/<script(?![^>]*\ssrc=)[^>]*>/.test(html), false, 'script escrito dentro do HTML')
  assert.equal(/<style[\s>]/.test(html), false, 'estilo escrito dentro do HTML')
  assert.equal(/\sstyle="/.test(html), false, 'atributo style no HTML')
  assert.equal(/\son[a-z]+="/.test(html), false, 'evento escrito no HTML (onclick e parecidos)')
  assert.equal(/javascript:/i.test(html), false, 'link com javascript:')
  assert.equal(/<(iframe|object|embed|form|base)[\s>]/i.test(html), false, 'moldura, objeto, formulário ou base no HTML')
})

test('a página não carrega nada de fora da pasta', () => {
  // Todo endereço completo do HTML é o destino de um link (<a>), nunca a origem de script, estilo, imagem ou fonte.
  const completos = [...html.matchAll(/(?:href|src|action|srcset|poster|data)="([a-z][a-z0-9+.-]*:[^"]*)"/gi)].map(m => m[1])
  const deLinks = [...html.matchAll(/<a\s[^>]*href="([a-z][a-z0-9+.-]*:[^"]*)"/gi)].map(m => m[1])
  assert.deepEqual(completos, deLinks, 'um endereço de fora é carregado pela página')
  // O estilo não importa outro estilo nem busca arquivo de fora: só os desenhos embutidos (data:) e as fontes da
  // própria pasta.
  assert.equal(/@import/.test(estilo), false, 'o estilo importa outro arquivo')
  const noEstilo = [...estilo.matchAll(/url\(\s*["']?([^"')]+)/g)].map(m => m[1])
  // O %23 é um # dentro de um desenho embutido: aponta para um filtro do próprio desenho.
  for (const endereco of noEstilo) {
    assert.ok(
      endereco.startsWith('data:image/svg+xml') || endereco.startsWith('%23') || endereco in FONTES,
      `o estilo busca ${endereco.slice(0, 40)}`,
    )
  }
  // Script e estilo próprios saem da pasta, por caminho relativo.
  assert.deepEqual([...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map(m => m[1]), ['app.js'])
  assert.deepEqual([...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(m => m[1]), ['estilo.css'])
})

test('os links para fora são HTTPS, só para endereços conhecidos, e não entregam de onde a pessoa veio', () => {
  const links = [...html.matchAll(/<a\s[^>]*href="([a-z][a-z0-9+.-]*:[^"]*)"[^>]*>/gi)]
  assert.ok(links.length > 0)
  for (const [etiqueta, endereco] of links) {
    assert.ok(LINKS.some(e => endereco === e || endereco.startsWith(e.endsWith('/') ? e : `${e}/`)), `link fora da lista: ${endereco}`)
    assert.match(etiqueta, /rel="noopener noreferrer"/, `falta rel="noopener noreferrer" no link ${endereco}`)
  }
})

test('a política de segurança fecha tudo e só abre a própria pasta', () => {
  const csp = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(html)?.[1]
  assert.ok(csp, 'falta a política de segurança (Content-Security-Policy) no index.html')
  const regras = Object.fromEntries(csp.split(';').map(r => r.trim().split(/\s+/)).map(([nome, ...valores]) => [nome, valores.join(' ')]))
  assert.deepEqual(regras, {
    'default-src': "'none'",
    'script-src': "'self'",
    'style-src': "'self'",
    'font-src': "'self'",
    'img-src': "'self' data:",
    'connect-src': "'none'",
    'object-src': "'none'",
    'base-uri': "'none'",
    'form-action': "'none'",
  })
  // A política vem antes de qualquer coisa que a página carregue.
  assert.ok(html.indexOf('Content-Security-Policy') < html.indexOf('<link'), 'a política precisa vir antes do primeiro <link>')
  assert.ok(html.indexOf('Content-Security-Policy') < html.indexOf('<script'), 'a política precisa vir antes do <script>')
  assert.match(html, /<meta name="referrer" content="no-referrer"/)
})

test('o script não fala com a rede, não guarda dado e não monta HTML com texto', () => {
  const proibidos = ['fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'EventSource', 'import(', 'localStorage', 'sessionStorage', 'document.cookie', 'indexedDB', 'eval(', 'new Function', 'innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'postMessage', 'window.open']
  for (const trecho of proibidos) assert.equal(script.includes(trecho), false, `o app.js usa ${trecho}`)
})

test('aberta dentro de outra página, ela não mostra nada', () => {
  // O frame-ancestors só existe como cabeçalho HTTP, e o GitHub Pages não deixa definir cabeçalho.
  assert.match(script, /window\.top !== window\.self/)
})

// ---------- A publicação ----------

test('o workflow usa só ações do GitHub, fixadas pelo commit', () => {
  const usos = [...workflow.matchAll(/^\s*(?:-\s+)?uses:\s*(\S+)(.*)$/gm)]
  assert.ok(usos.length > 0)
  for (const [, acao, resto] of usos) {
    assert.match(acao, /^actions\/[a-z-]+@[0-9a-f]{40}$/, `ação fora do padrão (dono actions/ e commit de 40 letras): ${acao}`)
    assert.match(resto, /#\s*v\d+\.\d+\.\d+/, `falta o comentário com a versão ao lado de ${acao}`)
  }
})

test('o workflow só publica da main, sem rodar em PR e com a permissão mínima', () => {
  // Sem as linhas de comentário, que explicam justamente o que o workflow não faz.
  const semComentarios = workflow.replace(/^\s*#.*$/gm, '')
  assert.equal(/pull_request/.test(semComentarios), false, 'o workflow de publicação não roda em pull_request')
  assert.match(workflow, /^permissions: \{\}$/m, 'o workflow começa sem permissão nenhuma')
  assert.match(workflow, /branches: \[main\]/)
  assert.match(workflow, /if: github\.ref == 'refs\/heads\/main'/)
  const permissoes = [...workflow.matchAll(/^ {6}([a-z-]+): (read|write)$/gm)].map(m => `${m[1]}: ${m[2]}`)
  assert.deepEqual(permissoes.sort(), ['contents: read', 'id-token: write', 'pages: write'])
  assert.equal(/secrets\./.test(semComentarios), false, 'a publicação não usa segredo')
})

test('só vai ao ar uma lista fechada de arquivos, com tudo o que a página usa', () => {
  // Cada linha "cp site/a site/b _site/<pasta>/" publica os arquivos nomeados nela, na mesma pasta de onde saem.
  const copias = [...workflow.matchAll(/^\s*cp (.+) _site\/(\S*)$/gm)]
  assert.ok(copias.length > 0, 'não achei a lista de arquivos publicados no workflow')
  const publicados = []
  for (const [, origens, destino] of copias) {
    for (const origem of origens.split(/\s+/)) {
      assert.equal(/[*?[]/.test(origem), false, `curinga na lista do que vai ao ar: ${origem}`)
      const arquivo = origem.replace(/^site\//, '')
      assert.equal(arquivo.slice(0, arquivo.lastIndexOf('/') + 1), destino, `${origem} é copiado para a pasta errada`)
      publicados.push(arquivo)
    }
  }
  publicados.sort()
  // Cada arquivo de site/ está na lista ou é só do repositório: um arquivo novo não vai ao ar sem alguém decidir.
  const naPasta = arquivosDe(join(RAIZ, 'site')).filter(nome => !SO_NO_REPO.includes(nome)).sort()
  assert.deepEqual(publicados, naPasta)
  // E tudo o que o index.html e o estilo buscam na pasta está publicado.
  const usados = [
    ...[...html.matchAll(/(?:href|src)="(?!#)([^":]+)"/g)].map(m => m[1]),
    ...[...estilo.matchAll(/url\(\s*["']?(fontes\/[^"')]+)/g)].map(m => m[1]),
  ]
  for (const arquivo of usados) assert.ok(publicados.includes(arquivo), `a página usa ${arquivo}, que não é publicado`)
})

test('as fontes são as que foram baixadas e conferidas', () => {
  const naPasta = arquivosDe(join(RAIZ, 'site')).filter(nome => nome.endsWith('.woff2')).sort()
  assert.deepEqual(naPasta, Object.keys(FONTES).sort())
  for (const [arquivo, esperado] of Object.entries(FONTES)) {
    const bytes = readFileSync(join(RAIZ, 'site', arquivo))
    assert.equal(bytes.subarray(0, 4).toString('latin1'), 'wOF2', `${arquivo} não é um arquivo woff2`)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), esperado, `${arquivo} não é o arquivo conferido`)
  }
})
