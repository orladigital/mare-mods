# mare-mods

Marketplace de mods do Claude Code. Cada mod é uma pasta em `plugins/<mod>/` e uma entrada em
`.claude-plugin/marketplace.json`. Decisões do repositório: `docs/adr/`.

## Antes de mexer num mod

Leia `docs/criar-um-mod.md` (o formato e as armadilhas da API) e `docs/requisitos.md` (o que o PR precisa
cumprir). A API completa está nos tipos que o Claude Code escreve em `plugins/<mod>/.claude-plugin/types/` ao
carregar o mod; a skill `plugin-authoring` ajuda.

## Conferir

Na pasta do mod, depois de cada mudança:

```bash
claude plugin validate . && claude plugin test . && npx -y -p typescript@5.6.3 tsc -p . --noEmit
```

Na raiz, depois de mexer no `marketplace.json`: `claude plugin validate .`.

## Regras

- Textos, comentários, testes e mensagens de commit em português do Brasil.
- Nenhum dado pessoal nem segredo em arquivo nenhum: nos testes, `/Users/exemplo` e ids fictícios. O CI barra.
- Um mod não importa arquivos de outro.
- Toda mudança de comportamento de um mod sobe a versão no `plugin.json` dele e ganha uma entrada no
  `CHANGELOG.md` dele. Mudança só de documentação não sobe a versão.
- Terminal e app são superfícies diferentes (`e.surface`): no terminal, nada de animação; teste as duas.
- Commits em Conventional Commits (`feat(<mod>): …`, `docs(…): …`), com o assunto dizendo o que muda para
  quem usa e um corpo explicando o porquê. Documentação em commit separado.
- A versão mínima do Claude Code é a do `CLAUDE_CODE_VERSAO` em `.github/workflows/ci.yml`; ao subir, atualize
  também `docs/compatibilidade.md` e o README.
