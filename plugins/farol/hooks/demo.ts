// As situações do /farol demo: sessões fictícias (títulos genéricos, nenhum dado real) que o painel e a faixa
// mostram no lugar das reais, cada situação pelo seu tempo, um ciclo inteiro. Lógica pura: nada vai para o disco.
import type { Ajustes, Estado, Registro, SuperficieDaDemo } from '../types'
import type { Especial } from './tour'

// O tempo de cada situação no terminal; no app, cada uma tem o seu.
const PASSO_NO_TERMINAL_MS = 6_000

export type SituacaoDaDemo = {
  // O nome da situação, no topo do painel.
  nome: string
  sessoes: Registro[]
  // O que muda nos ajustes durante a situação (o resto fica no padrão).
  ajustes: Partial<Ajustes>
  // O bloco de ajustes do painel aberto durante a situação.
  ajustesAbertos: boolean
  // O id de "esta sessão": a primeira livre da situação ('' sem livre).
  minha: string
  // Quanto tempo a situação fica na tela.
  ms: number
  // As linhas de texto que o painel mostra abaixo do desenho (só no encerramento).
  recado: string[]
  // O desenho próprio do tour no lugar da cena e dos cartões (a abertura, o "E tem mais" e o encerramento).
  especial?: Especial
}

// O encerramento diz o que fazer agora.
const RECADO_FINAL = ['/farol abre o painel · os ajustes ficam no rodapé']

// Uma sessão fictícia: o estado, o título, a pasta e há quantos minutos está nele. A sem sinal parou de renovar o
// registro há 10 min; a não vista é uma livre que respondeu fora da tela.
type Ficticia = { estado: Estado | 'nao-visto' | 'sem-sinal'; titulo: string; pasta: string; ha: number }

const MIN = 60_000

const SESSOES = {
  esperando: { estado: 'esperando', titulo: 'Publicar a nova versão do site', pasta: 'site', ha: 2 },
  esperandoHaMuito: { estado: 'esperando', titulo: 'Escolher o nome da nova tela', pasta: 'app', ha: 7 },
  pergunta: { estado: 'pergunta', titulo: 'Revisar o texto da página inicial', pasta: 'site', ha: 1 },
  naoVisto: { estado: 'nao-visto', titulo: 'Corrigir o relatório mensal', pasta: 'relatorios', ha: 3 },
  trabalhando: { estado: 'trabalhando', titulo: 'Escrever os testes do login', pasta: 'app', ha: 4 },
  trabalhandoOutra: { estado: 'trabalhando', titulo: 'Atualizar as dependências', pasta: 'api', ha: 9 },
  livre: { estado: 'livre', titulo: 'Explicar o módulo de pagamentos', pasta: 'api', ha: 12 },
  livreOutra: { estado: 'livre', titulo: 'Organizar as notas da reunião', pasta: 'notas', ha: 25 },
  semSinal: { estado: 'sem-sinal', titulo: 'Gerar o gráfico de vendas', pasta: 'dados', ha: 40 },
} as const satisfies Record<string, Ficticia>

// `minha`: a posição de "esta sessão" entre as fictícias (sem ela, a primeira livre).
type Extra = { ajustes?: Partial<Ajustes>; ajustesAbertos?: boolean; recado?: string[]; minha?: number; especial?: Especial }

const situacao = (nome: string, segundos: number, fic: readonly Ficticia[], agora: number, extra: Extra = {}): SituacaoDaDemo => {
  const sessoes = fic.map((f, i): Registro => {
    const base = { id: `demo-${i + 1}`, pasta: f.pasta, titulo: f.titulo, desde: agora - f.ha * MIN, vivoEm: agora }
    if (f.estado === 'nao-visto') return { ...base, estado: 'livre', naoVisto: true, respondeuEm: base.desde }
    if (f.estado === 'sem-sinal') return { ...base, estado: 'trabalhando', vivoEm: agora - 10 * MIN }
    return { ...base, estado: f.estado }
  })
  const minha = extra.minha !== undefined ? (sessoes[extra.minha]?.id ?? '') : (sessoes.find(r => r.estado === 'livre' && !r.naoVisto)?.id ?? '')
  return { nome, sessoes, ajustes: extra.ajustes ?? {}, ajustesAbertos: extra.ajustesAbertos ?? false, minha, ms: segundos * 1000, recado: extra.recado ?? [], ...(extra.especial ? { especial: extra.especial } : {}) }
}

// Uma situação com esperando e, logo depois, a mesma na intensidade alta, para comparar as duas lado a lado.
const comAlta = (nome: string, segundos: number, segundosNaAlta: number, fic: readonly Ficticia[], agora: number) => [
  situacao(nome, segundos, fic, agora),
  situacao(`${nome}, na intensidade alta`, segundosNaAlta, fic, agora, { ajustes: { intensidade: 'alta' } }),
]

// No app, 23: a abertura, as calmas (com esta sessão em destaque), os avisos, três esperando seguidos da Alta, todas
// as cenas do topo, os ajustes abertos e recolhidos, o movimento desligado, o "E tem mais" e o encerramento. No
// terminal, 5, sem o não visto (que o terminal não mostra) e com "esta sessão" na primeira.
export const situacoesDaDemo = (superficie: SuperficieDaDemo, agora: number): SituacaoDaDemo[] => {
  const s = SESSOES
  if (superficie === 'terminal') {
    const seg = PASSO_NO_TERMINAL_MS / 1000
    return [
      situacao('Esperando, trabalhando e livre', seg, [s.esperando, s.trabalhando, s.livre], agora),
      situacao('Só trabalhando', seg, [s.trabalhando], agora),
      situacao('Todas livres', seg, [s.livre, s.livreOutra], agora),
      situacao('Duas esperando', seg, [s.esperando, s.esperandoHaMuito], agora),
      situacao('Pergunta e trabalhando', seg, [s.pergunta, s.trabalhando], agora),
    ]
  }
  return [
    situacao('Bem-vindo ao tour do Farol da Orla', 6, [s.livre, s.livreOutra], agora, { especial: 'abertura' }),
    situacao('Todas livres', 4, [s.livre, s.livreOutra], agora),
    situacao('Só trabalhando', 4, [s.trabalhando, s.trabalhandoOutra], agora),
    situacao('Trabalhando e livre', 3, [s.trabalhando, s.livre], agora),
    situacao('Esta sessão em destaque', 4, [s.livre, s.trabalhando, s.livreOutra], agora, { minha: 1 }),
    situacao('Só não visto', 6, [s.naoVisto], agora),
    situacao('Não visto e trabalhando', 4, [s.naoVisto, s.trabalhando], agora),
    situacao('Só pergunta', 4, [s.pergunta], agora),
    situacao('Pergunta e não visto', 4, [s.pergunta, s.naoVisto], agora),
    ...comAlta('Só esperando', 6, 5, [s.esperando], agora),
    ...comAlta('Esperando e não visto', 5, 6, [s.esperando, s.naoVisto], agora),
    ...comAlta('Esperando e pergunta', 4, 3, [s.esperando, s.pergunta], agora),
    situacao('Esperando, trabalhando, livre e sem sinal', 3, [s.esperandoHaMuito, s.trabalhando, s.livre, s.semSinal], agora),
    situacao('Duas esperando, com a contagem na faixa', 3, [s.esperando, s.esperandoHaMuito], agora, { ajustes: { contagem: true } }),
    situacao('Só sem sinal', 3, [s.semSinal], agora),
    situacao('Ajustes abertos', 7, [s.esperando, s.naoVisto], agora, { ajustesAbertos: true }),
    situacao('Ajustes recolhidos', 3, [s.esperando, s.naoVisto], agora),
    situacao('Esperando e não visto, com o movimento desligado', 4, [s.esperando, s.naoVisto], agora, { ajustes: { movimento: false } }),
    situacao('E tem mais', 15, [s.livre, s.livreOutra], agora, { especial: 'mais' }),
    situacao('Obrigado por fazer o tour', 6, [s.livre, s.livreOutra], agora, { especial: 'encerramento', recado: RECADO_FINAL }),
  ]
}
