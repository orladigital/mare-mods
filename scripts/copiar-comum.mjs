// Copia o código comum (comum/) para cada mod que o usa, em plugins/<mod>/hooks/comum/ (ADR 0002).
//
// Cada mod declara o que usa em plugins/<mod>/comum.json, uma lista de arquivos de comum/ (ex.: ["permissao.ts"]).
// Cada arquivo vai com o teste dele (<nome>.test.ts), quando existe, para rodar no `claude plugin test` do mod.
// Uma cópia gerada que o mod não declara mais é apagada; arquivo feito à mão na pasta não é tocado.
//
//   node scripts/copiar-comum.mjs              escreve as cópias
//   node scripts/copiar-comum.mjs --conferir   só confere: sai com 1 se alguma cópia falta, sobra ou divergiu (CI)
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DECLARACAO = 'comum.json'
const DESTINO = join('hooks', 'comum')
const MARCA = '// Gerado de comum/'
const NOME_VALIDO = /^[\w-]+(\.[\w-]+)*\.tsx?$/

const cabecalho = arquivo => `${MARCA}${arquivo} por scripts/copiar-comum.mjs; não edite aqui.\n\n`

const testeDe = arquivo => arquivo.replace(/\.(tsx?)$/, '.test.$1')

// Lido sempre com fim de linha \n: no Windows, o Git pode entregar a fonte e a cópia com \r\n.
const lerTexto = caminho => readFileSync(caminho, 'utf8').replace(/\r\n/g, '\n')

const lerDeclaracao = caminho => {
  if (!existsSync(caminho)) return []
  const declarados = JSON.parse(readFileSync(caminho, 'utf8'))
  const invalido = !Array.isArray(declarados)
    || declarados.some(a => typeof a !== 'string' || !NOME_VALIDO.test(a) || /\.test\.tsx?$/.test(a))
  if (invalido) throw new Error(`${caminho}: esperava uma lista de arquivos .ts de comum/ (o teste vai junto sozinho)`)
  return declarados
}

// O que cada mod deveria ter em hooks/comum/: nome do arquivo → conteúdo.
const esperadoNoMod = (raiz, pastaMod) => {
  const caminho = join(pastaMod, DECLARACAO)
  const esperado = new Map()
  for (const arquivo of lerDeclaracao(caminho)) {
    if (!existsSync(join(raiz, 'comum', arquivo))) throw new Error(`${caminho}: comum/${arquivo} não existe`)
    for (const nome of [arquivo, testeDe(arquivo)]) {
      const f = join(raiz, 'comum', nome)
      if (existsSync(f)) esperado.set(nome, cabecalho(nome) + lerTexto(f))
    }
  }
  return esperado
}

// Uma cópia que o script gerou (e pode apagar): arquivo que começa com o cabeçalho.
const gerado = caminho => statSync(caminho).isFile() && lerTexto(caminho).startsWith(MARCA)

// Escreve as cópias (ou, com `conferir`, só compara). Devolve os caminhos, relativos à raiz, que estavam
// fora de dia: cópia que faltava, que sobrava ou que divergia da fonte.
export const copiarComum = (raiz, { conferir = false } = {}) => {
  const foraDeDia = []
  const pastaPlugins = join(raiz, 'plugins')
  const mods = existsSync(pastaPlugins)
    ? readdirSync(pastaPlugins, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort()
    : []
  for (const mod of mods) {
    const pastaMod = join(pastaPlugins, mod)
    const esperado = esperadoNoMod(raiz, pastaMod)
    const pastaCopia = join(pastaMod, DESTINO)
    const existentes = existsSync(pastaCopia) ? readdirSync(pastaCopia).sort() : []
    const relativo = nome => ['plugins', mod, 'hooks', 'comum', nome].join('/')

    for (const nome of existentes) {
      if (esperado.has(nome) || !gerado(join(pastaCopia, nome))) continue
      foraDeDia.push(relativo(nome))
      if (!conferir) rmSync(join(pastaCopia, nome))
    }
    for (const [nome, conteudo] of esperado) {
      const destino = join(pastaCopia, nome)
      if (existsSync(destino) && lerTexto(destino) === conteudo) continue
      foraDeDia.push(relativo(nome))
      if (!conferir) {
        mkdirSync(pastaCopia, { recursive: true })
        writeFileSync(destino, conteudo)
      }
    }
    if (!conferir && existsSync(pastaCopia) && readdirSync(pastaCopia).length === 0) rmdirSync(pastaCopia)
  }
  return foraDeDia
}

const principal = argv => {
  const conferir = argv.includes('--conferir')
  const i = argv.indexOf('--raiz')
  if (i >= 0 && (!argv[i + 1] || argv[i + 1].startsWith('--'))) throw new Error('--raiz pede uma pasta')
  const raiz = i >= 0 ? resolve(argv[i + 1]) : resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const foraDeDia = copiarComum(raiz, { conferir })
  if (conferir && foraDeDia.length > 0) {
    console.error('Cópias de comum/ fora de dia (rode `node scripts/copiar-comum.mjs` e commite o resultado):')
    for (const d of foraDeDia) console.error(`  ${d}`)
    return 1
  }
  for (const d of foraDeDia) console.log(`posto em dia (escrito ou apagado): ${d}`)
  return 0
}

// Roda só quando chamado direto (também por um link simbólico), não quando o teste importa o módulo.
const chamadoDireto = () => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
}

if (chamadoDireto()) {
  try {
    process.exitCode = principal(process.argv.slice(2))
  } catch (e) {
    console.error(e instanceof Error ? e.message : e)
    process.exitCode = 1
  }
}
