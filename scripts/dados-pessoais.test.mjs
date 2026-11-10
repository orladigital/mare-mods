// Varre os arquivos do farol atrás de dado pessoal ou segredo: caminho de usuário real (só /Users/exemplo vale),
// e-mail, id real de sessão e token (as chaves de nuvem ficam com o gitleaks, no job "segredos"). O passo "Procura
// dados pessoais" do CI já barra parte disso (caminho de usuário e id do app) no repo inteiro; este teste cobre o
// resto. Roda com `node --test scripts/dados-pessoais.test.mjs`.
//
// É um teste de Node, e não do `claude plugin test`, porque lá o disco é o que o próprio teste responde: o mod
// não lê os arquivos de verdade.
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const RAIZ = fileURLToPath(new URL('..', import.meta.url))
const MODS = ['farol']

const PROCURADOS = [
  ['caminho de usuário', /\/Users\/(?!exemplo\b)[A-Za-z0-9._-]+|[A-Z]:\\Users\\(?!exemplo\b)[A-Za-z0-9._-]+/],
  ['e-mail', /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/],
  ['id de sessão', /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i],
  ['token', /\b(sk-ant-[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[abposr]-[A-Za-z0-9-]{10,})/],
]
// Os tipos que o Claude Code gera ao carregar o mod não entram no Git.
const FORA = new Set([join('.claude-plugin', 'types')])

// Cada achado como "<arquivo>: <o que> (<trecho>)", com o caminho relativo à pasta varrida.
const procurar = pasta => {
  const achados = []
  const varrer = dir => {
    for (const d of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, d.name)
      if (FORA.has(relative(pasta, caminho))) continue
      if (d.isDirectory()) varrer(caminho)
      if (!d.isFile()) continue
      const texto = readFileSync(caminho, 'utf8')
      for (const [nome, padrao] of PROCURADOS) {
        const m = padrao.exec(texto)
        if (m) achados.push(`${relative(pasta, caminho)}: ${nome} (${m[0]})`)
      }
    }
  }
  varrer(pasta)
  return achados
}

for (const mod of MODS) {
  test(`${mod}: nenhum arquivo tem dado pessoal nem segredo`, () => {
    assert.deepEqual(procurar(join(RAIZ, 'plugins', mod)), [])
  })
}

// Os exemplos montam o caminho por partes: escrito inteiro, o passo "Procura dados pessoais" do CI o barraria.
const USUARIOS = '/Users/'
const temporarias = []
after(() => { for (const p of temporarias) rmSync(p, { recursive: true, force: true }) })

test('a varredura acha cada tipo de dado, e deixa passar o /Users/exemplo', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'dados-pessoais-'))
  temporarias.push(pasta)
  mkdirSync(join(pasta, 'hooks'))
  writeFileSync(join(pasta, 'hooks', 'ok.ts'), "const casa = '/Users/exemplo/.claude'\n")
  writeFileSync(join(pasta, 'hooks', 'caminho.ts'), `const casa = '${USUARIOS}fulano/.claude'\n`)
  writeFileSync(join(pasta, 'hooks', 'windows.ts'), "const casa = 'C:\\\\Users\\\\fulano'\n".replace(/\\\\/g, '\\'))
  writeFileSync(join(pasta, 'README.md'), 'Fale com fulano@exemplo.com.br\n')
  writeFileSync(join(pasta, 'sessao.json'), '{"id":"0f2b4c6d-1a3e-4b5c-8d7e-9f0a1b2c3d4e"}\n')
  writeFileSync(join(pasta, 'token.txt'), `chave ${'sk-ant-'}abcdefgh12345678\n`)

  assert.deepEqual(procurar(pasta).sort(), [
    'README.md: e-mail (fulano@exemplo.com.br)',
    `hooks/caminho.ts: caminho de usuário (${USUARIOS}fulano)`,
    'hooks/windows.ts: caminho de usuário (C:\\Users\\fulano)',
    'sessao.json: id de sessão (0f2b4c6d-1a3e-4b5c-8d7e-9f0a1b2c3d4e)',
    'token.txt: token (sk-ant-abcdefgh12345678)',
  ])
})
