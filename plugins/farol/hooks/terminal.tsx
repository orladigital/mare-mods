// As linhas do painel no terminal: uma por sessão, com fundo na cor do estado, no mesmo hex nos terminais claro e
// escuro; o esperando vai dentro de uma borda grossa, com o mesmo fundo (três linhas). Sem desenho nem animação.
import type { EngineInterface, RenderElement, RenderInput } from 'claude-code'

import type { Registro } from '../types'
import { semLarguraAmbigua } from './comum/largura'
import { rotuloDe, tempoDe, visualDe } from './estado'
import type { Visual } from './estado'

type Linha = { marca: string; rotulo: string; fundo: string; texto: string; borda?: string }

const LIVRE: Linha = { marca: '~ ', rotulo: rotuloDe('livre'), fundo: '#4F6563', texto: '#E1EAE8' }

// O esperando diz "Esperando você" (no app, o cartão diz só "Esperando": a cor já chama). O não visto não chega
// aqui (no terminal, a sessão que estaria azul aparece livre), mas o tipo pede: fica como o livre. O sem sinal,
// num cinza de névoa, contrasta menos que o livre (4,2 contra 5,1), mas ainda se lê como os outros.
const LINHAS: Record<Visual, Linha> = {
  esperando: { marca: '!!', rotulo: 'Esperando você', fundo: '#C4564D', texto: '#FFF3EF', borda: '#EA8F85' },
  trabalhando: { marca: '>>', rotulo: rotuloDe('trabalhando'), fundo: '#2E7A73', texto: '#E3F4F1' },
  livre: LIVRE,
  'nao-visto': LIVRE,
  'sem-sinal': { marca: '? ', rotulo: rotuloDe('sem-sinal'), fundo: '#6E7472', texto: '#F2F2EF' },
}

// "marca estado · tempo · pasta · título", e "esta sessão" antes do título na sessão aberta aqui. O título vai por
// último e já trocado: o corte da linha no fim (`truncate-end`) cai nele, depois da troca.
export const textoDaLinha = (r: Registro, agora: number, minha: string): string => {
  const { marca, rotulo } = LINHAS[visualDe(r, agora)]
  const esta = r.id === minha ? ' · esta sessão' : ''
  return `${marca} ${rotulo} · ${tempoDe(r, agora)} · ${r.pasta}${esta} · ${semLarguraAmbigua(r.titulo)}`
}

export type DadosDasLinhas = { lista: readonly Registro[]; agora: number; minha: string }

export function desenharLinhas($: EngineInterface, e: RenderInput<'Pane'>, d: DadosDasLinhas): RenderElement {
  const { Box, Text } = $.ui.resolve(e)
  return (
    <Box flexDirection="column">
      {d.lista.map(r => {
        const l = LINHAS[visualDe(r, d.agora)]
        const borda = l.borda ? { borderStyle: 'bold', borderColor: l.borda } : {}
        return (
          <Box key={`linha-${r.id}`} backgroundColor={l.fundo} paddingX={1} {...borda}>
            <Text color={l.texto} bold={l.borda !== undefined} wrap="truncate-end">
              {textoDaLinha(r, d.agora, d.minha)}
            </Text>
          </Box>
        )
      })}
    </Box>
  )
}
