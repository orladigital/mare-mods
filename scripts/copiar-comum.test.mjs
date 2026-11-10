// Testes do script que copia comum/ para os mods. Rodam com `node --test scripts/copiar-comum.test.mjs`.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { copiarComum } from './copiar-comum.mjs'

const SCRIPT = fileURLToPath(new URL('./copiar-comum.mjs', import.meta.url))

// As pastas temporárias saem no fim.
const temporarias = []
after(() => { for (const p of temporarias) rmSync(p, { recursive: true, force: true }) })

const pastaTemporaria = () => {
  const p = mkdtempSync(join(tmpdir(), 'copiar-comum-'))
  temporarias.push(p)
  return p
}

// Um repo de mentira: comum/ com um arquivo e o teste dele, e um mod que declara usá-lo.
const montarRepo = () => {
  const raiz = pastaTemporaria()
  mkdirSync(join(raiz, 'comum'))
  writeFileSync(join(raiz, 'comum', 'a.ts'), 'export const a = 1\n')
  writeFileSync(join(raiz, 'comum', 'a.test.ts'), "import { a } from './a'\n")
  writeFileSync(join(raiz, 'comum', 'b.ts'), 'export const b = 2\n')
  mkdirSync(join(raiz, 'plugins', 'mod', 'hooks'), { recursive: true })
  writeFileSync(join(raiz, 'plugins', 'mod', 'comum.json'), '["a.ts"]\n')
  return raiz
}

const copia = (raiz, arquivo) => join(raiz, 'plugins', 'mod', 'hooks', 'comum', arquivo)

test('copia o arquivo declarado e o teste dele, com o cabeçalho de gerado', () => {
  const raiz = montarRepo()
  copiarComum(raiz)
  assert.equal(
    readFileSync(copia(raiz, 'a.ts'), 'utf8'),
    '// Gerado de comum/a.ts por scripts/copiar-comum.mjs; não edite aqui.\n\nexport const a = 1\n',
  )
  assert.match(readFileSync(copia(raiz, 'a.test.ts'), 'utf8'), /^\/\/ Gerado de comum\/a\.test\.ts/)
  assert.equal(existsSync(copia(raiz, 'b.ts')), false)
})

test('apaga a cópia que o mod não declara mais', () => {
  const raiz = montarRepo()
  copiarComum(raiz)
  writeFileSync(join(raiz, 'plugins', 'mod', 'comum.json'), '[]\n')
  copiarComum(raiz)
  assert.equal(existsSync(join(raiz, 'plugins', 'mod', 'hooks', 'comum')), false)
})

test('conferir: cópias em dia passam, sem escrever nada', () => {
  const raiz = montarRepo()
  copiarComum(raiz)
  assert.deepEqual(copiarComum(raiz, { conferir: true }), [])
})

test('conferir: editar comum/ sem rodar o script é apontado, e a cópia fica como estava', () => {
  const raiz = montarRepo()
  copiarComum(raiz)
  writeFileSync(join(raiz, 'comum', 'a.ts'), 'export const a = 3\n')
  assert.deepEqual(copiarComum(raiz, { conferir: true }), ['plugins/mod/hooks/comum/a.ts'])
  assert.match(readFileSync(copia(raiz, 'a.ts'), 'utf8'), /a = 1/)
})

test('conferir: aponta a cópia que falta e a que sobra', () => {
  const raiz = montarRepo()
  copiarComum(raiz)
  writeFileSync(join(raiz, 'plugins', 'mod', 'comum.json'), '["b.ts"]\n')
  assert.deepEqual(copiarComum(raiz, { conferir: true }).sort(), [
    'plugins/mod/hooks/comum/a.test.ts',
    'plugins/mod/hooks/comum/a.ts',
    'plugins/mod/hooks/comum/b.ts',
  ])
})

test('arquivo declarado que não existe em comum/ é erro', () => {
  const raiz = montarRepo()
  writeFileSync(join(raiz, 'plugins', 'mod', 'comum.json'), '["nao-existe.ts"]\n')
  assert.throws(() => copiarComum(raiz), /nao-existe\.ts/)
})

test('pela linha de comando, --conferir sai com 1 quando há diferença', () => {
  const raiz = montarRepo()
  const r = spawnSync(process.execPath, [SCRIPT, '--conferir', '--raiz', raiz], { encoding: 'utf8' })
  assert.equal(r.status, 1)
  assert.match(r.stderr, /plugins\/mod\/hooks\/comum\/a\.ts/)
  assert.equal(spawnSync(process.execPath, [SCRIPT, '--raiz', raiz]).status, 0)
  assert.equal(spawnSync(process.execPath, [SCRIPT, '--conferir', '--raiz', raiz]).status, 0)
})

test('fim de linha do Windows (CRLF) não conta como diferença', () => {
  const raiz = montarRepo()
  writeFileSync(join(raiz, 'comum', 'a.ts'), 'export const a = 1\r\n')
  copiarComum(raiz)
  assert.equal(readFileSync(copia(raiz, 'a.ts'), 'utf8').includes('\r'), false)
  writeFileSync(copia(raiz, 'a.ts'), readFileSync(copia(raiz, 'a.ts'), 'utf8').replace(/\n/g, '\r\n'))
  assert.deepEqual(copiarComum(raiz, { conferir: true }), [])
})

test('só apaga o que o script gerou: arquivo feito à mão e subpasta ficam', () => {
  const raiz = montarRepo()
  mkdirSync(join(raiz, 'plugins', 'mod', 'hooks', 'comum', 'sub'), { recursive: true })
  writeFileSync(copia(raiz, 'meu.ts'), 'export const meu = 1\n')
  rmSync(join(raiz, 'plugins', 'mod', 'comum.json'))
  assert.deepEqual(copiarComum(raiz), [])
  assert.equal(existsSync(copia(raiz, 'meu.ts')), true)
  assert.equal(existsSync(copia(raiz, 'sub')), true)
})

test('nome inválido em comum.json é erro claro', () => {
  const raiz = montarRepo()
  for (const ruim of ['[".."]', '[""]', '["a.test.ts"]', '["../a.ts"]', '{"a": 1}']) {
    writeFileSync(join(raiz, 'plugins', 'mod', 'comum.json'), ruim)
    assert.throws(() => copiarComum(raiz), /comum\.json/)
  }
})

test('pela linha de comando: chamado por um link simbólico, roda do mesmo jeito', () => {
  const raiz = montarRepo()
  const link = join(pastaTemporaria(), 'copiar.mjs')
  symlinkSync(SCRIPT, link)
  assert.equal(spawnSync(process.execPath, [link, '--conferir', '--raiz', raiz]).status, 1)
})

test('pela linha de comando: --raiz sem valor é erro', () => {
  const r = spawnSync(process.execPath, [SCRIPT, '--conferir', '--raiz'], { encoding: 'utf8' })
  assert.equal(r.status, 1)
  assert.match(r.stderr, /--raiz/)
})
