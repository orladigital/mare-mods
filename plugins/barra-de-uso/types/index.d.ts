export type Limite = { kind: string; percentUsed: number; resetsAt?: string }

export type Medida = {
  limites: Limite[]
  contexto: { tokens?: number; window: number; percent?: number }
  custoUsd?: number
}

// O pedido de permissão aberto agora: a ferramenta e o que ela vai rodar, já em texto.
export type Pedido = { ferramenta: string; resumo: string; detalhe: string }

export type Explicacao = { estado: 'carregando' | 'pronta' | 'erro'; resumo: string; texto: string }

// Ola: o mar se mexendo no desenho do app. No terminal não há animação.
export type Ola = 'ligada' | 'desligada'

// Como a semana aparece na faixa: só o número, com a barra, ou nada.
export type Semana = 'numero' | 'barra' | 'escondida'

// O que cada pessoa liga e desliga no menu ⚓ da faixa.
export type Ajustes = { explain: boolean; copiar: boolean; ola: Ola; semana: Semana }

declare module 'claude-code' {
  interface PluginState {
    'barra-de-uso': {
      medida: Medida | null
      pendente: Pedido | null
      explicacao: Explicacao | null
      ajustes: Ajustes | null
      fase: number
    }
  }
}
