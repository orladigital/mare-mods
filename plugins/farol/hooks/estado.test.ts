import { describe, expect, test } from 'claude-code/testing'

import type { Registro } from '../types'
import { casaDe, esperandoAgora, estadoGeral, ha, lerRegistro, ordenar, pastaDoRegistro, rotuloDe, tituloDe, visualDe } from './estado'

const T = 1_000_000_000
const reg = (id: string, estado: Registro['estado'], o: { vivoHaMs?: number; desdeHaMs?: number; naoVisto?: boolean } = {}): Registro => ({
  id,
  pasta: 'exemplo',
  titulo: id,
  estado,
  desde: T - (o.desdeHaMs ?? 0),
  vivoEm: T - (o.vivoHaMs ?? 0),
  naoVisto: o.naoVisto,
})

describe('estado de cada sessão', () => {
  test('sem renovar o registro há mais de 3 min, a sessão fica sem sinal', async () => {
    expect(visualDe(reg('a', 'trabalhando', { vivoHaMs: 2 * 60_000 }), T)).toBe('trabalhando')
    expect(visualDe(reg('a', 'trabalhando', { vivoHaMs: 4 * 60_000 }), T)).toBe('sem-sinal')
  })

  test('não visto só vale para a sessão livre', async () => {
    expect(visualDe(reg('a', 'livre', { naoVisto: true }), T)).toBe('nao-visto')
    expect(visualDe(reg('a', 'trabalhando', { naoVisto: true }), T)).toBe('trabalhando')
    expect(visualDe(reg('a', 'livre'), T)).toBe('livre')
  })

  test('os rótulos dos estados', async () => {
    expect(['esperando', 'nao-visto', 'trabalhando', 'livre', 'sem-sinal'].map(v => rotuloDe(v as never))).toEqual([
      'Esperando',
      'Não visto',
      'Trabalhando',
      'Livre',
      'Sem sinal',
    ])
  })
})

describe('ordem e prioridade', () => {
  test('esperando, não visto, trabalhando, livre e sem sinal; dentro de cada um, a mais recente primeiro', async () => {
    const lista = [
      reg('livre-antiga', 'livre', { desdeHaMs: 60 * 60_000 }),
      reg('sem-sinal', 'livre', { vivoHaMs: 10 * 60_000 }),
      reg('livre-nova', 'livre', { desdeHaMs: 60_000 }),
      reg('trabalhando', 'trabalhando'),
      reg('nao-visto', 'livre', { naoVisto: true }),
      reg('esperando', 'esperando'),
    ]
    expect(ordenar(lista, T).map(r => r.id)).toEqual(['esperando', 'nao-visto', 'trabalhando', 'livre-nova', 'livre-antiga', 'sem-sinal'])
  })

  test('sem sinal há mais de 12 h, a sessão é esquecida', async () => {
    expect(ordenar([reg('velha', 'livre', { vivoHaMs: 13 * 3600_000 }), reg('viva', 'livre')], T).map(r => r.id)).toEqual(['viva'])
  })

  test('o estado geral é o de maior prioridade: esperando > não visto > trabalhando > livre', async () => {
    expect(estadoGeral([reg('a', 'livre'), reg('b', 'trabalhando'), reg('c', 'esperando')], T)).toBe('esperando')
    expect(estadoGeral([reg('a', 'trabalhando'), reg('b', 'livre', { naoVisto: true })], T)).toBe('nao-visto')
    expect(estadoGeral([reg('a', 'livre'), reg('b', 'trabalhando')], T)).toBe('trabalhando')
    expect(estadoGeral([reg('a', 'livre')], T)).toBe('livre')
  })

  test('sem sessões, ou só com sessões sem sinal, não há estado geral', async () => {
    expect(estadoGeral([], T)).toBe('nenhuma')
    expect(estadoGeral([reg('a', 'esperando', { vivoHaMs: 5 * 60_000 })], T)).toBe('nenhuma')
  })

  test('conta as sessões esperando você, sem as que estão sem sinal', async () => {
    expect(esperandoAgora([reg('a', 'esperando'), reg('b', 'esperando'), reg('c', 'livre'), reg('d', 'esperando', { vivoHaMs: 5 * 60_000 })], T)).toBe(2)
    expect(esperandoAgora([], T)).toBe(0)
  })
})

describe('tempo, título e registro', () => {
  test('"há N min"', async () => {
    expect(ha(30_000)).toBe('agora')
    expect(ha(7 * 60_000)).toBe('há 7 min')
    expect(ha(70 * 60_000)).toBe('há 1h10')
    expect(ha(26 * 3600_000)).toBe('há 1d')
  })

  test('o título sai da mensagem: sem marcações; comando de shell e comando de barra não viram título', async () => {
    expect(tituloDe('  corrige\n o   teste ')).toBe('corrige o teste')
    // Um comando de shell digitado (!cd …) não diz do que a sessão trata: o título fica para a mensagem seguinte.
    expect(tituloDe('<bash-input>cd /Users/exemplo/projetos</bash-input><bash-stdout></bash-stdout>')).toBe('')
    // O aviso da IDE sobre o arquivo aberto não é mensagem sua; o que você escreveu junto é.
    expect(tituloDe('<ide_opened_file>The user opened the file /Users/exemplo/a.ts in the IDE.</ide_opened_file>')).toBe('')
    expect(tituloDe('<ide_opened_file>The user opened the file /Users/exemplo/a.ts in the IDE.</ide_opened_file> revisa este arquivo')).toBe('revisa este arquivo')
    expect(tituloDe('<ide_selection>The user selected the lines 1 to 3</ide_selection>explica isto')).toBe('explica isto')
    expect(tituloDe('<command-name>/farol</command-name>')).toBe('')
    expect(tituloDe('/farol')).toBe('')
    // O marcador de interrupção do Claude Code não é mensagem sua.
    expect(tituloDe('[Request interrupted by user]')).toBe('')
    expect(tituloDe('[Request interrupted by user for tool use]')).toBe('')
    // Nem o aviso que abre uma sessão começada por outra.
    expect(tituloDe('Background (from the session that started this one): a tarefa')).toBe('')
    expect(tituloDe('This session is being continued from a previous conversation')).toBe('')
    expect(tituloDe('x'.repeat(80))).toHaveLength(70)
  })

  test('a pasta é a última parte do cwd, no macOS e no Windows', async () => {
    expect(pastaDoRegistro('/Users/exemplo/projetos/exemplo')).toBe('exemplo')
    expect(pastaDoRegistro('C:\\Users\\exemplo\\projeto')).toBe('projeto')
    expect(pastaDoRegistro('/')).toBe('/')
  })

  test('registro inválido é ignorado', async () => {
    expect(lerRegistro('{')).toBe(null)
    expect(lerRegistro('{"id":"a"}')).toBe(null)
    expect(lerRegistro('{"id":"a","vivoEm":1,"desde":1,"estado":"dormindo","pasta":"p","titulo":"t"}')).toBe(null)
    expect(lerRegistro(JSON.stringify(reg('a', 'livre')))?.id).toBe('a')
  })

  test('o não visto não vem do arquivo: só o app calcula, ao ler', async () => {
    expect(lerRegistro(JSON.stringify(reg('a', 'livre', { naoVisto: true })))?.naoVisto).toBe(undefined)
  })
})

describe('a pasta da casa', () => {
  test('o HOME; vazio, o USERPROFILE (Windows); os dois vazios, nenhuma', async () => {
    expect(casaDe('/Users/exemplo', undefined)).toBe('/Users/exemplo')
    expect(casaDe('', 'C:\\Users\\exemplo')).toBe('C:\\Users\\exemplo')
    expect(casaDe(undefined, undefined)).toBe(undefined)
    expect(casaDe('  ', '')).toBe(undefined)
  })
})
