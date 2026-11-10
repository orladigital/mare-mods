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
├── hooks/comum/                 # cópia gerada do código comum (se o mod usa); não editar à mão
├── comum.json                   # os arquivos de comum/ que o mod usa (opcional)
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

Antes do PR, na pasta do mod. A checagem de tipos (`tsc`) só roda aqui: o CI não a faz.

```bash
claude plugin validate . && claude plugin test . && npx -y -p typescript@5.6.3 tsc -p . --noEmit
```

## Código comum

Código que mais de um mod usa fica em `comum/`, na raiz, com o teste ao lado (decisão no
[ADR 0002](adr/0002-codigo-comum-por-copia.md)). Um mod não importa de outro, então cada um leva uma cópia:

1. Declare em `plugins/<mod>/comum.json` os arquivos que o mod usa, ex.: `["permissao.ts"]`.
2. Rode, na raiz do repositório:

   ```bash
   node scripts/copiar-comum.mjs
   ```

   O script escreve as cópias em `plugins/<mod>/hooks/comum/`, cada arquivo com o teste dele, e apaga as que o
   mod não declara mais.
3. Importe da cópia: `import { modoPede } from './comum/permissao'`.

Para mudar o código comum, edite `comum/`, nunca a cópia, rode o script e commite a fonte e as cópias juntas. O
CI roda `node scripts/copiar-comum.mjs --conferir` e falha se alguma cópia estiver fora de dia. Se a mudança
altera o comportamento de um mod, a versão dele sobe.

## Enviar

Push por HTTPS que cria ou altera arquivos em `.github/workflows/` precisa de uma credencial com o escopo
`workflow`; sem ele, o GitHub recusa o push. Para dar o escopo ao `gh` e usar o token dele só nesse push:

```bash
gh auth login -h github.com -p https -s workflow --web
```

```bash
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push -u origin <branch>
```

Os outros pushes seguem normais.

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
