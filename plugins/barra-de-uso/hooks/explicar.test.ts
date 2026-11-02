import { describe, expect, test } from 'claude-code/testing'

import { campoTexto, comandoRetomar, corDoRisco, descreverPedido, modoPede, promptExplicacao, separarRisco } from './explicar'

describe('explicar o pedido de permissão', () => {
  test('Bash: resume pelo comando', async () => {
    const p = descreverPedido('Bash', { command: '.venv/bin/flake8 src tests\n  && echo OK', description: 'lint' })
    expect(p.resumo).toBe('Bash: .venv/bin/flake8 src tests && echo OK')
    expect(p.detalhe).toBe('.venv/bin/flake8 src tests\n  && echo OK')
  })

  test('Edit: resume pelo arquivo, detalhe com a entrada inteira', async () => {
    const p = descreverPedido('Edit', { file_path: '/x/a.py', old_string: 'a', new_string: 'b' })
    expect(p.resumo).toBe('Edit: /x/a.py')
    expect(p.detalhe).toContain('"new_string": "b"')
  })

  test('entrada enorme é cortada', async () => {
    const p = descreverPedido('Bash', { command: 'x'.repeat(10_000) })
    expect(p.detalhe.length).toBeLessThan(6100)
    expect(p.detalhe.endsWith('(cortado)')).toBe(true)
  })

  test('o prompt pede para não executar e traz o comando', async () => {
    const prompt = promptExplicacao(descreverPedido('Bash', { command: 'rm -rf build' }))
    expect(prompt).toContain('NÃO execute nada')
    expect(prompt).toContain('rm -rf build')
  })
})

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

  test('lê o modo do arquivo da sessão no app', async () => {
    expect(campoTexto('{"permissionMode":"default"}', 'permissionMode')).toBe('default')
    expect(campoTexto('{', 'permissionMode')).toBe(undefined)
  })
})

describe('faixa de risco na explicação', () => {
  test('o prompt pede a faixa na primeira linha e traz as cinco faixas', async () => {
    const prompt = promptExplicacao(descreverPedido('Bash', { command: 'ls' }))
    expect(prompt).toContain('**BAIXO 1** — <motivo>')
    for (const r of ['BAIXO 1:', 'BAIXO 2:', 'MEDIO 3:', 'ALTO 4:', 'ALTISSIMO 5:']) expect(prompt).toContain(r)
  })

  test('separa a faixa do resto do texto', async () => {
    const { risco, resto } = separarRisco('**ALTO 4** — faz push para a origin\n\n1. Envia a branch.')
    expect(risco).toEqual({ rotulo: 'ALTO 4', nivel: 4, motivo: 'faz push para a origin' })
    expect(resto).toBe('1. Envia a branch.')
  })

  test('aceita acento e hífen no lugar do travessão', async () => {
    expect(separarRisco('**MÉDIO 3** - instala dependência').risco?.rotulo).toBe('MEDIO 3')
    expect(separarRisco('**ALTÍSSIMO 5**').risco).toEqual({ rotulo: 'ALTISSIMO 5', nivel: 5, motivo: '' })
  })

  test('sem a faixa, mostra o texto inteiro', async () => {
    expect(separarRisco('Só lê arquivos.')).toEqual({ risco: null, resto: 'Só lê arquivos.' })
  })

  test('cores: verde até 2, amarelo no 3, vermelho em 4 e 5', async () => {
    expect([1, 2, 3, 4, 5].map(corDoRisco)).toEqual(['success', 'success', 'warning', 'error', 'error'])
  })
})

describe('comando para reabrir a sessão', () => {
  test('cd na pasta e resume pelo id', async () => {
    expect(comandoRetomar('/Users/exemplo/projeto', '00000000-0000-4000-8000-000000000001')).toBe(
      'cd /Users/exemplo/projeto && claude --desktop --resume 00000000-0000-4000-8000-000000000001',
    )
  })

  test('pasta com espaço ou aspas vai entre aspas simples', async () => {
    expect(comandoRetomar('/Users/exemplo/Meus Projetos', 'abc')).toBe("cd '/Users/exemplo/Meus Projetos' && claude --desktop --resume abc")
    expect(comandoRetomar("/tmp/it's", 'abc')).toBe("cd '/tmp/it'\\''s' && claude --desktop --resume abc")
  })
})
