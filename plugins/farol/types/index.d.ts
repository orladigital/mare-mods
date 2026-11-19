// O que a sessão faz agora, gravado no registro dela.
export type Estado = 'esperando' | 'pergunta' | 'trabalhando' | 'livre'

// O registro de uma sessão em ~/.claude/farol/<id>.json: um arquivo por sessão, renovado a cada 30 s.
export type Registro = {
  id: string
  // O nome da pasta onde a sessão roda (a última parte do cwd).
  pasta: string
  titulo: string
  estado: Estado
  // Quando a sessão entrou no estado atual.
  desde: number
  // A última vez que a sessão renovou o registro.
  vivoEm: number
  // Quando a sessão terminou a última resposta fora da tela do app (gravado; o não visto parte dele).
  respondeuEm?: number
  // Respondeu depois da última vez que você a abriu no app (só no app no macOS; calculado ao ler, não gravado).
  naoVisto?: boolean
  // O id da sessão no app (local_…), para o clique trocar para ela (só no app no macOS; calculado ao ler).
  appId?: string
}

// Os ajustes de cada pessoa, guardados no $.store.
export type NaFaixa = 'mostrar' | 'esconder'
export type Ajustes = {
  naFaixa: NaFaixa
  // A torre da faixa com o número de sessões esperando (só no app; no terminal, o número sempre aparece).
  contagem: boolean
  // A cena do painel se mexendo (só no app).
  movimento: boolean
  // O som quando esta sessão passa a esperar você.
  somEsperando: boolean
  // O som quando esta sessão responde fora da tela do app (só no app).
  somNaoVisto: boolean
  // O quanto o farol chama o olho: na alta, no app, o feixe vermelho gira mais rápido, sobem quatro sinalizadores e a
  // contagem aparece na torre; nas duas superfícies, o som do esperando se repete enquanto a sessão espera.
  intensidade: Intensidade
  // O volume dos sons (o `gain` do `$.audio.play`).
  volume: Volume
}

// Onde o /farol demo roda: o app (e a IDE) ou o terminal, cada um com as suas situações.
export type SuperficieDaDemo = 'app' | 'terminal'

export type Intensidade = 'padrao' | 'alta'
export type Volume = 'baixo' | 'medio' | 'alto'

declare module 'claude-code' {
  interface PluginState {
    farol: {
      sessoes: Registro[]
      agora: number
      minhaId: string
      ajustes: Ajustes | null
      // O bloco de ajustes aberto no painel (abre recolhido).
      ajustesAbertos: boolean
      // A fase do relógio do painel do app.
      aceso: boolean
      // O /farol demo em curso (null fora dele): a superfície, a situação da vez (de 0) e a hora em que começou.
      demo: { superficie: SuperficieDaDemo; passo: number; inicio: number } | null
    }
  }
}
