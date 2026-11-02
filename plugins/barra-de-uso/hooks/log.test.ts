import { describe, expect, test } from 'claude-code/testing'

import { pedidosNoLog, situacaoNoLog } from './explicar'

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

  test('lista os pedidos que já estavam no log', async () => {
    expect([...pedidosNoLog(LOG)]).toEqual(['antigo', 'novo', 'outro'])
  })
})
