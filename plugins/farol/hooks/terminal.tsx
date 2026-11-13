// O painel no terminal: no topo, um resumo com os estados que têm sessão; abaixo, um cartão de duas linhas por
// sessão, como no app (o título em negrito em cima e "projeto · tempo · estado" embaixo), cada um na sua borda; no
// fim, as sessões sem sinal juntas numa linha apagada. O peso segue a urgência: fundo cheio só no esperando (com a
// borda grossa) e no trabalhando; o livre leva só uma borda clara. Os tons são os mesmos nos
// terminais claro e escuro. Sem desenho nem animação.
import type { EngineInterface, RenderElement, RenderInput } from 'claude-code'

import type { Registro } from '../types'
import { semLarguraAmbigua } from './comum/largura'
import { ha, rotuloDe, tempoDe, visualDe } from './estado'
import type { Visual } from './estado'

// O cartão: com `fundo`, cheio; sem, só a `borda`. O texto vai no tom `texto` (um hex, ou uma cor do tema). `desta`:
// o fundo e o texto do cartão da sessão aberta aqui: o fundo do estado bem mais claro, com o texto escuro.
type Cartao = {
  rotulo: string
  fundo?: string
  texto?: string
  borda: string
  estiloDaBorda?: 'bold' | 'round'
  desta?: { fundo: string; texto: string }
}

// O livre não tem fundo: o texto vai na cor de texto do tema do Claude Code (`text`), que acompanha o fundo do painel;
// a cor padrão seria a do terminal, que pode ser de outro tema (o texto claro some no painel claro).
const LIVRE: Cartao = { rotulo: rotuloDe('livre'), texto: 'text', borda: '#9DB4BE', estiloDaBorda: 'round' }

// O esperando diz "Esperando você" (no app, o cartão diz só "Esperando": a cor já chama). O não visto não chega
// aqui (no terminal, a sessão que estaria azul aparece livre), mas o tipo pede: fica como o livre.
const CARTOES: Record<Exclude<Visual, 'sem-sinal'>, Cartao> = {
  esperando: {
    rotulo: 'Esperando você', fundo: '#C4564D', texto: '#FFF3EF', borda: '#EA8F85', estiloDaBorda: 'bold',
    desta: { fundo: '#D9726A', texto: '#3A0F0B' },
  },
  trabalhando: {
    rotulo: rotuloDe('trabalhando'), fundo: '#2E7A73', texto: '#E3F4F1', borda: '#2E7A73', estiloDaBorda: 'round',
    desta: { fundo: '#4FA79E', texto: '#0B2E2A' },
  },
  livre: LIVRE,
  'nao-visto': LIVRE,
}

// O resumo do topo: fundo claro, texto escuro e borda na cor do estado; o sem sinal fica de fora (é a linha do fim).
type Resumo = { estado: 'esperando' | 'trabalhando' | 'livre'; nome: (n: number) => string; fundo: string; texto: string; borda: string }
const RESUMO: readonly Resumo[] = [
  { estado: 'esperando', nome: () => 'Esperando', fundo: '#F6D3CE', texto: '#8A2A22', borda: '#C4564D' },
  { estado: 'trabalhando', nome: () => 'Trabalhando', fundo: '#CFEAE6', texto: '#1F5C56', borda: '#2E7A73' },
  { estado: 'livre', nome: n => (n === 1 ? 'Livre' : 'Livres'), fundo: '#DCE5E4', texto: '#3E5A66', borda: '#4F6563' },
]

// No resumo, o não visto conta como livre (no terminal não há não visto).
const noResumo = (v: Visual): Resumo['estado'] | null => (v === 'sem-sinal' ? null : v === 'nao-visto' ? 'livre' : v)

// A segunda linha do cartão: "projeto · tempo · estado". Na sessão aberta aqui, vem depois `ESTA_SESSAO`, em
// negrito.
export const detalheNoTerminal = (r: Registro, agora: number): string => {
  const v = visualDe(r, agora)
  const rotulo = v === 'sem-sinal' ? rotuloDe(v) : CARTOES[v].rotulo
  return `${r.pasta} · ${tempoDe(r, agora)} · ${rotulo}`
}
const ESTA_SESSAO = ' · esta sessão'

// O fundo bem leve do cartão desta sessão, quando o estado não tem fundo próprio (o livre): um tom pouco acima do
// fundo do terminal, que depende do tema (o terminal não tem cor de tema para isso; o tema vem do Claude Code).
const FUNDO_DESTA = { escuro: '#2F3A42', claro: '#EFF4F6' } as const

// As sem sinal numa linha: quantas, desde quando (da mais recente à mais antiga) e de que projetos.
export const linhaSemSinal = (lista: readonly Registro[], agora: number): string => {
  const parados = lista.map(r => agora - r.vivoEm)
  const recente = ha(Math.min(...parados))
  const antiga = ha(Math.max(...parados))
  const tempo = recente === antiga ? recente : `${recente} a ${antiga.replace(/^há /, '')}`
  const projetos = [...new Set(lista.map(r => r.pasta))].join(', ')
  return `${lista.length} ${lista.length === 1 ? 'sessão' : 'sessões'} sem sinal · ${tempo} · ${projetos}`
}

// `temaClaro`: o tema do Claude Code é um dos claros (o fundo desta sessão muda com ele).
export type DadosDoPainelNoTerminal = { lista: readonly Registro[]; agora: number; minha: string; temaClaro: boolean }

// O título passa pela troca dos símbolos de largura ambígua antes do corte no fim da linha (`truncate-end`): cortado
// antes, a seta trocada por dois caracteres o faria passar da linha e entortar a borda.
export function desenharPainelNoTerminal($: EngineInterface, e: RenderInput<'Pane'>, d: DadosDoPainelNoTerminal): RenderElement {
  const { Box, Text } = $.ui.resolve(e)
  const comSinal = d.lista.filter(r => visualDe(r, d.agora) !== 'sem-sinal')
  const semSinal = d.lista.filter(r => visualDe(r, d.agora) === 'sem-sinal')
  const quantos = (estado: Resumo['estado']) => comSinal.filter(r => noResumo(visualDe(r, d.agora)) === estado).length

  const resumo = RESUMO.filter(x => quantos(x.estado) > 0).map(x => (
    <Box key={`resumo-${x.estado}`} borderStyle="round" borderColor={x.borda} backgroundColor={x.fundo} paddingX={1} flexShrink={0}>
      <Text color={x.texto} bold>{`${quantos(x.estado)} ${x.nome(quantos(x.estado))}`}</Text>
    </Box>
  ))

  const cartao = (r: Registro) => {
    const v = visualDe(r, d.agora)
    const c = CARTOES[v === 'sem-sinal' ? 'livre' : v]
    // A sessão aberta aqui tem a borda dupla e um fundo um pouco diferente, para achá-la de relance: o do estado num
    // tom mais claro ou, no livre, um bem leve; esperando, fica a borda grossa do aviso.
    const minha = r.id === d.minha
    const estilo = minha && v !== 'esperando' ? 'double' : c.estiloDaBorda
    const borda = estilo ? { borderStyle: estilo, borderColor: c.borda } : {}
    const fundo = !minha ? c.fundo : c.desta?.fundo ?? c.fundo ?? FUNDO_DESTA[d.temaClaro ? 'claro' : 'escuro']
    const texto = minha && c.desta ? c.desta.texto : c.texto
    const detalhe = detalheNoTerminal(r, d.agora)
    return (
      <Box key={`cartao-${r.id}`} flexDirection="column" backgroundColor={fundo} paddingX={1} {...borda}>
        <Text color={texto} bold wrap="truncate-end">
          {semLarguraAmbigua(r.titulo)}
        </Text>
        {minha ? (
          <Text color={texto} wrap="truncate-end">
            <Text dimColor={!c.fundo}>{detalhe}</Text>
            <Text bold>{ESTA_SESSAO}</Text>
          </Text>
        ) : (
          <Text color={c.texto} dimColor={!c.fundo} wrap="truncate-end">
            {detalhe}
          </Text>
        )}
      </Box>
    )
  }

  // Os cartões vão colados: a borda de cada um já os separa.
  return (
    <Box key="painel-terminal" flexDirection="column" gap={1}>
      {resumo.length > 0 && (
        <Box flexDirection="row" flexWrap="wrap" columnGap={1} rowGap={0}>
          {resumo}
        </Box>
      )}
      {comSinal.length > 0 && (
        <Box key="cartoes" flexDirection="column">
          {comSinal.map(cartao)}
        </Box>
      )}
      {semSinal.length > 0 && (
        <Text dimColor wrap="truncate-end">
          {linhaSemSinal(semSinal, d.agora)}
        </Text>
      )}
    </Box>
  )
}
