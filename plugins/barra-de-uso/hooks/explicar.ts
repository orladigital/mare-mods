import type { Pedido } from '../types'

const LIMITE_DETALHE = 6000

const comoObjeto = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : {}

const texto = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined)

// O que está pedindo permissão, em texto: o comando do Bash, o arquivo de um Edit/Write, ou a entrada crua.
export const descreverPedido = (ferramenta: string, entrada: unknown): Pedido => {
  const e = comoObjeto(entrada)
  const comando = texto(e.command)
  const arquivo = texto(e.file_path) ?? texto(e.notebook_path) ?? texto(e.path)
  const resumo = comando
    ? `${ferramenta}: ${comando.replace(/\s+/g, ' ').slice(0, 80)}`
    : arquivo
      ? `${ferramenta}: ${arquivo}`
      : ferramenta
  let detalhe: string
  try {
    detalhe = comando ?? JSON.stringify(entrada, null, 2)
  } catch {
    detalhe = String(entrada)
  }
  if (detalhe.length > LIMITE_DETALHE) detalhe = `${detalhe.slice(0, LIMITE_DETALHE)}\n… (cortado)`
  return { ferramenta, resumo, detalhe }
}

// A escala de risco que a explicação usa na primeira linha.
export const ESCALA_RISCO = [
  'BAIXO 1: só lê, na máquina, sem tocar em segredo. Ex.: ls, cat/grep em código, git status/diff/log, ' +
    'rodar teste ou lint local sem rede e sem credencial.',
  'BAIXO 2: altera só arquivos do projeto, fácil de desfazer pelo Git, sem efeito fora da pasta. Ex.: ' +
    'editar ou criar arquivo versionado, formatar código, gerar arquivo temporário ou cache, mover arquivo do projeto.',
  'MEDIO 3: efeito fora da pasta do projeto ou difícil de desfazer na máquina, ou lê segredo sem enviá-lo. ' +
    'Ex.: instalar dependência, baixar da internet, chamada de rede só de leitura, mudar config do usuário ' +
    '(~/.zshrc, settings), commit ou branch local, apagar arquivo não versionado, ler .env ou chave.',
  'ALTO 4: mexe em sistema compartilhado ou remoto, usa credencial real, ou pode expor segredo. Ex.: git push, ' +
    'abrir MR, escrever em API ou serviço externo, AWS/kubectl/terraform fora de produção, enviar mensagem, ' +
    'sudo, rm -rf de pasta inteira, mandar conteúdo de .env ou chave para fora da máquina.',
  'ALTISSIMO 5: irreversível, em produção, ou destrutivo em larga escala. Ex.: deploy ou mudança em prd, apagar ' +
    'dados ou infraestrutura remota, push --force em branch compartilhada, git reset --hard que perde trabalho, ' +
    'vazar credencial, rm -rf em ~ ou /, mudar permissão ou configuração de segurança.',
]

// Pergunta da conversa lateral: explicar sem executar, em português, curto, começando pela faixa de risco.
export const promptExplicacao = (p: Pedido): string =>
  [
    'Pergunta lateral do usuário, fora do fluxo principal: NÃO execute nada, NÃO continue a tarefa,',
    'só responda à pergunta. O usuário está vendo agora um pedido de permissão para a ferramenta',
    `${p.ferramenta} com esta entrada:`,
    '',
    '```',
    p.detalhe,
    '```',
    '',
    'Responda em português do Brasil, em Markdown.',
    '',
    'A PRIMEIRA linha é só a faixa de risco, em negrito e maiúsculas, um travessão e o motivo numa frase:',
    '**BAIXO 1** — <motivo>',
    'Use exatamente um destes rótulos: BAIXO 1, BAIXO 2, MEDIO 3, ALTO 4, ALTISSIMO 5. A escala:',
    ...ESCALA_RISCO.map(f => `- ${f}`),
    'Na dúvida entre duas faixas, fique com a mais alta. Avalie o trecho inteiro: a faixa é a do passo mais',
    'arriscado da cadeia (`&&`, `|`, `;`).',
    '',
    'Depois, em no máximo 12 linhas:',
    '1. O que isso faz, passo a passo (cada comando encadeado, flags que importam).',
    '2. Por que você está pedindo isso agora, no contexto da tarefa.',
    '3. O que altera: arquivos, rede, ambientes, credenciais; ou se só lê.',
    '4. Riscos, e se é seguro aprovar.',
  ].join('\n')

export type Risco = { rotulo: string; nivel: number; motivo: string }

// Separa a primeira linha da explicação ("**ALTO 4** — motivo") do resto, para o painel colorir a faixa.
export const separarRisco = (texto: string): { risco: Risco | null; resto: string } => {
  const linhas = texto.replace(/^\s+/, '').split('\n')
  const m = /^\*\*\s*(BAIXO|MEDIO|MÉDIO|ALTO|ALTISSIMO|ALTÍSSIMO)\s+([1-5])\s*\*\*\s*[—–-]?\s*(.*)$/.exec(linhas[0] ?? '')
  if (!m?.[1] || !m[2]) return { risco: null, resto: texto }
  const rotulo = m[1].normalize('NFD').replace(/[̀-ͯ]/g, '')
  return {
    risco: { rotulo: `${rotulo} ${m[2]}`, nivel: Number(m[2]), motivo: (m[3] ?? '').trim() },
    resto: linhas.slice(1).join('\n').replace(/^\s+/, ''),
  }
}

// Verde para 1 e 2, amarelo para 3, vermelho para 4 e 5.
export const corDoRisco = (nivel: number): 'success' | 'warning' | 'error' =>
  nivel <= 2 ? 'success' : nivel === 3 ? 'warning' : 'error'

export const campoTexto = (json: string, campo: string): string | undefined => {
  try {
    const v = (JSON.parse(json) as Record<string, unknown>)[campo]
    return typeof v === 'string' ? v : undefined
  } catch {
    return undefined
  }
}

// Aspas simples só quando o caminho precisa (espaço, acento, símbolo de shell).
const citarShell = (s: string): string => (/^[\w@%+=:,./-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`)

// O comando que reabre esta sessão no app desktop a partir de um terminal.
export const comandoRetomar = (cwd: string, id: string): string =>
  `cd ${citarShell(cwd)} && claude --desktop --resume ${id}`
