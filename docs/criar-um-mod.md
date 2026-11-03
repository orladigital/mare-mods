# Criar um mod

Um mod é um plugin do Claude Code com um módulo de hooks: ele muda a interface (uma faixa, um painel, um
botão) ou reage ao que acontece na sessão. A API completa está nos tipos que o Claude Code escreve em
`plugins/<mod>/.claude-plugin/types/` quando carrega o mod; a skill `plugin-authoring` do Claude Code ajuda a
escrever.

## Arquivos

```
plugins/<mod>/
├── .claude-plugin/plugin.json   # nome, versão, descrição e "types": "./types/index.d.ts"
├── hooks/hooks.json             # { "modules": ["./register.tsx"] }
├── hooks/register.tsx           # export const register: Register = on => { ... }
├── hooks/*.test.ts(x)           # testes, rodados por `claude plugin test`
├── types/index.d.ts             # o contrato do $.state do mod (interface PluginState)
├── tsconfig.json                # { "extends": "./.claude-plugin/types/tsconfig.json" }
├── README.md
└── CHANGELOG.md
```

E uma entrada em `.claude-plugin/marketplace.json`:

```json
{ "name": "<mod>", "source": "./plugins/<mod>", "description": "<uma linha>" }
```

## Desenvolver

Carregue o mod direto da pasta numa sessão do terminal; `/reload-plugins` recarrega depois de cada mudança:

```bash
claude --plugin-dir plugins/<mod>
```

Antes do PR, na pasta do mod:

```bash
claude plugin validate . && claude plugin test . && npx -y -p typescript@5.6.3 tsc -p . --noEmit
```

## O que aprendemos fazendo o barra-de-uso

- **Atoms com nome literal:** `atom({ plugin: 'meu-mod', key: 'x' } as const, inicial)`. O validador lê o
  código antes de rodar e recusa uma constante no lugar do texto.
- **Helpers que recebem `$` ficam no topo do arquivo**, fora do `register`.
- **Hooks que barram prompt ou ferramenta levam `.catch(($, e, next) => next(e))`**, para um erro do mod não
  travar a sessão.
- **Nos testes, o próprio teste faz o papel do Claude Code:** `mock.store(on)` e `mock.clock(on)` respondem ao
  `$.store` e ao `$.clock`; `on('ui.render', ...)` devolvendo `<Box />` é o que fica por baixo da faixa;
  `on('ui.open', ...)` e `on('ui.close', ...)` abrem e fecham painéis.
- **Terminal e app são superfícies diferentes:** `e.surface` diz qual. O app desenha `Svg` (com animação no
  próprio desenho, sem custo); o terminal só tem texto, e um emoji pode contar duas casas no layout e ocupar
  uma na tela.
- **Arquivos internos do app** (log e sessões em `~/Library`) não são documentados: use só com degradação
  silenciosa, e só no macOS.
