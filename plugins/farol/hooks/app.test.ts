import { describe, expect, test } from 'claude-code/testing'

import type { Registro } from '../types'
import { comOApp, idEmFoco, lerNoApp, linkDaSessao, mesclarNoApp, naoVistoDe } from './app'

const T = Date.parse('2026-11-10T15:00:00Z')
const reg = (id: string, r: Partial<Registro> = {}): Registro => ({
  id, pasta: 'exemplo', titulo: `primeira mensagem de ${id}`, estado: 'livre', desde: T, vivoEm: T, ...r,
})

describe('o arquivo de uma sessão no app', () => {
  test('dá o id da sessão no Claude Code, o nome na barra lateral, o id no app, o foco e o modo', async () => {
    const texto = JSON.stringify({
      cliSessionId: 'cli-1', sessionId: 'local_abc-1', title: 'Revisar o PR', titleSource: 'user',
      lastFocusedAt: 100, lastActivityAt: 90, permissionMode: 'default', outroCampo: { x: 1 },
    })
    expect(lerNoApp(texto)).toEqual({
      cli: 'cli-1',
      info: { titulo: 'Revisar o PR', appId: 'local_abc-1', focadoEm: 100, ativoEm: 90, modo: 'default' },
    })
  })

  test('sem o id da sessão, estragado ou de outro formato, é ignorado', async () => {
    expect(lerNoApp('{"sessionId":"local_x"}')).toBe(null)
    expect(lerNoApp('{"cliSessionId":')).toBe(null)
    expect(lerNoApp('[]')).toBe(null)
    expect(lerNoApp(JSON.stringify({ cliSessionId: 'cli-1', title: 3, lastFocusedAt: 'ontem' }))).toEqual({ cli: 'cli-1', info: {} })
  })

  test('dois arquivos da mesma sessão: vale o mais recente para nome, link e modo, e o foco mais recente de todos', async () => {
    const velho = { titulo: 'Velho', appId: 'local_velho', focadoEm: 100, ativoEm: 90, modo: 'auto' }
    const novo = { titulo: 'Novo', appId: 'local_novo', focadoEm: 500, ativoEm: 480, modo: 'default' }
    expect(mesclarNoApp(mesclarNoApp(undefined, novo), velho)).toEqual(novo)
    expect(mesclarNoApp(mesclarNoApp(undefined, velho), novo)).toEqual(novo)
    expect(mesclarNoApp({ ...novo, focadoEm: 200 }, { ...velho, focadoEm: 600 }).focadoEm).toBe(600)
  })
})

describe('não visto: respondeu e você não viu', () => {
  test('respondeu depois da última vez que você abriu a sessão no app', async () => {
    expect(naoVistoDe(T, T - 60_000, false)).toBe(true)
  })

  test('abriu depois da resposta, ou a sessão é a que está na tela: já viu', async () => {
    expect(naoVistoDe(T - 60_000, T, false)).toBe(false)
    expect(naoVistoDe(T, T - 60_000, true)).toBe(false)
  })

  test('sem a hora da resposta ou sem a do foco, não há como saber', async () => {
    expect(naoVistoDe(undefined, T, false)).toBe(false)
    expect(naoVistoDe(T, undefined, false)).toBe(false)
  })

  test('a sessão na tela é a que você abriu por último', async () => {
    expect(idEmFoco(new Map([['a', { focadoEm: 10 }], ['b', { focadoEm: 30 }], ['c', {}]]))).toBe('b')
    expect(idEmFoco(new Map())).toBe(undefined)
  })
})

test('o link do app só sai de um id de sessão do app', async () => {
  expect(linkDaSessao('local_exemplo-1')).toBe(
    'claude://code/continue?session=local_exemplo-1',
  )
  expect(linkDaSessao('exemplo-1')).toBe(undefined)
  expect(linkDaSessao('local_x&rm')).toBe(undefined)
  expect(linkDaSessao(undefined)).toBe(undefined)
})

describe('as sessões com o que o app sabe delas', () => {
  test('o título vira o nome na barra lateral, e vêm o id no app e o não visto', async () => {
    const app = new Map([
      ['vista', { titulo: 'Nome dado no app', appId: 'local_vista', focadoEm: T - 1_000 }],
      ['respondeu', { titulo: '  Outra  ', appId: 'local_respondeu', focadoEm: T - 120_000 }],
      ['na-tela', { appId: 'local_na-tela', focadoEm: T }],
    ])
    const lista = [
      reg('vista', { respondeuEm: T - 60_000 }),
      reg('respondeu', { respondeuEm: T - 60_000 }),
      reg('na-tela', { respondeuEm: T - 60_000 }),
      reg('do-terminal', { respondeuEm: T - 60_000 }),
    ]
    expect(comOApp(lista, app).map(r => [r.id, r.titulo, r.appId, r.naoVisto ?? false])).toEqual([
      ['vista', 'Nome dado no app', 'local_vista', false],
      ['respondeu', 'Outra', 'local_respondeu', true],
      ['na-tela', 'primeira mensagem de na-tela', 'local_na-tela', false],
      ['do-terminal', 'primeira mensagem de do-terminal', undefined, false],
    ])
  })
})
