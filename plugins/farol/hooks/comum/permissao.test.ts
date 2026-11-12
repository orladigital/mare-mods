// Gerado de comum/permissao.test.ts por scripts/copiar-comum.mjs; não edite aqui.

import { describe, expect, test } from 'claude-code/testing'

import { FILTRO_LOG_PERMISSAO, contarNoLog, modoPede, pedidosNoLog, situacaoNoLog } from './permissao'

describe('quando o "perguntar" vira pedido na tela', () => {
  test('manual e plano pedem; auto não', async () => {
    expect(modoPede('default', 'Bash')).toBe(true)
    expect(modoPede('plan', 'Bash')).toBe(true)
    expect(modoPede('auto', 'Bash')).toBe(false)
    expect(modoPede('bypassPermissions', 'Bash')).toBe(false)
  })

  test('aceitar edições só pede fora das edições', async () => {
    expect(modoPede('acceptEdits', 'Edit')).toBe(false)
    expect(modoPede('acceptEdits', 'Bash')).toBe(true)
  })

  test('modo desconhecido (terminal) fica com o evento de pedido', async () => {
    expect(modoPede(undefined, 'Bash')).toBe(false)
  })
})

const LOG = [
  '2026-10-09 13:38:57 [info] Emitted tool permission request antigo for Bash in session local_eu',
  '2026-10-09 14:35:31 [info] Emitted tool permission request novo for Bash in session local_eu',
  '2026-10-09 14:35:40 [info] Emitted tool permission request outro for Bash in session local_outra',
].join('\n')

describe('pedido de permissão pelo log do app', () => {
  test('pedido novo desta sessão sem resposta: aberto', async () => {
    expect(situacaoNoLog(LOG, 'local_eu', new Set(['antigo']))).toBe('aberto')
  })

  test('depois da sua resposta: respondido', async () => {
    const log = `${LOG}\n2026-10-09 14:36:02 [info] Received permission response for novo: once (tool: Bash)`
    expect(situacaoNoLog(log, 'local_eu', new Set(['antigo']))).toBe('respondido')
  })

  test('pedido antigo sem resposta e pedido de outra sessão não contam', async () => {
    expect(situacaoNoLog(LOG, 'local_eu', new Set(['antigo', 'novo']))).toBe('nada')
    expect(situacaoNoLog(LOG, 'local_ninguem', new Set())).toBe('nada')
  })

  test('conta os pedidos novos desta sessão que apareceram e os que esperam resposta', async () => {
    const respondido = `\n2026-10-09 14:36:02 [info] Received permission response for novo: once (tool: Bash)`
    expect(contarNoLog(LOG, 'local_eu', new Set(['antigo']))).toEqual({ emitidos: 1, abertos: 1 })
    expect(contarNoLog(`${LOG}${respondido}`, 'local_eu', new Set(['antigo']))).toEqual({ emitidos: 1, abertos: 0 })
    expect(contarNoLog(`${LOG}${respondido}`, 'local_eu', new Set())).toEqual({ emitidos: 2, abertos: 1 })
  })

  test('lista os pedidos que já estavam no log', async () => {
    expect([...pedidosNoLog(LOG)]).toEqual(['antigo', 'novo', 'outro'])
  })

  test('o filtro do grep pega as duas linhas que interessam', async () => {
    const linhas = [...LOG.split('\n'), 'Received permission response for novo: once (tool: Bash)', 'outra coisa']
    const filtro = new RegExp(FILTRO_LOG_PERMISSAO)
    expect(linhas.filter(l => filtro.test(l)).length).toBe(4)
  })
})
