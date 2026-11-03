# Requisitos de um mod

O que todo mod cumpre para entrar no `mare-mods`. O template de PR traz esta lista para marcar.

## Funciona

- `claude plugin validate plugins/<mod>` e `claude plugin test plugins/<mod>` passam, e a checagem de tipos
  (`npx -y -p typescript@5.6.3 tsc -p plugins/<mod> --noEmit`, com os tipos que o Claude Code gera ao
  carregar o mod) não acusa erro. O CI valida e testa, mas não checa os tipos: ele não tem login, e sem
  login o Claude Code não gera os tipos. A checagem de tipos é de quem abre o PR.
- Os testes montam a interface em cada superfície que o mod diz suportar (`terminal`, `desktop`), e não só
  numa delas.
- O mod foi carregado de verdade, ao menos no terminal (`claude --plugin-dir plugins/<mod>`), e quem abriu o
  PR viu ele fazer o que promete.

## Não atrapalha

- Timers (`$.clock.every`) só enquanto precisam rodar, e parados quando não precisam. No terminal, nada de
  animação: cada quadro redesenha a faixa.
- Se depende de arquivo interno do Claude Code ou do app (log, arquivos de sessão), a parte que depende dele
  some sem erro quando o arquivo não existe ou muda de formato, e o README do mod diz isso em "Limites".
- Nada de rede sem dizer no README do mod para onde vai e por quê.
- Divide a faixa acima do prompt com os outros mods: desenha o seu pedaço e inclui o dos outros (`next(e)`),
  com os itens alinhados pela base no terminal.

## É do time

- Textos em português do Brasil.
- Os ajustes de cada pessoa ficam no `$.store`, com um padrão para quem nunca mexeu, e um valor guardado por
  uma versão antiga é lido sem quebrar.
- Nenhum dado pessoal nem segredo: nada de caminho de usuário real (use `/Users/exemplo`), id real de sessão,
  nome de projeto, chave ou token. O CI procura.
- O mod não importa arquivos de outro mod: cada um leva o que precisa.

## Está documentado

- `plugins/<mod>/README.md`: o que faz, como usar, ajustes e limites.
- `plugins/<mod>/CHANGELOG.md` com uma entrada para a versão nova.
- A versão em `plugins/<mod>/.claude-plugin/plugin.json` sobe a cada PR que muda o mod (semver: correção
  sobe o último número; funcionalidade, o do meio; mudança que quebra ajuste guardado, o primeiro).
- A entrada do mod em `.claude-plugin/marketplace.json`, com uma descrição de uma linha.
