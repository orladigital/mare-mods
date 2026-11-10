// O que a sessão faz agora, gravado no registro dela.
export type Estado = 'esperando' | 'trabalhando' | 'livre'

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
  // Respondeu depois da última vez que você a abriu no app (só no app no macOS; calculado ao ler, não gravado).
  naoVisto?: boolean
}

// Os ajustes de cada pessoa, guardados no $.store.
export type NaFaixa = 'mostrar' | 'esconder'
export type Ajustes = {
  naFaixa: NaFaixa
  // A torre da faixa com o número de sessões esperando (só no app; no terminal, o número sempre aparece).
  contagem: boolean
  // A cena do painel se mexendo (só no app).
  movimento: boolean
}

declare module 'claude-code' {
  interface PluginState {
    farol: {
      sessoes: Registro[]
      agora: number
      minhaId: string
      ajustes: Ajustes | null
    }
  }
}
