# mare-mods

Mods para o Claude Code, feitos para quem usa a [Maré](https://github.com/orladigital/mare). Um mod muda a
interface do próprio Claude Code: uma faixa acima do prompt, um painel, um botão. Este repositório é um
*marketplace*: cada pessoa instala só os mods que quiser, e cada mod liga e desliga sozinho.

| Mod | O que faz |
|---|---|
| [`barra-de-uso`](plugins/barra-de-uso/README.md) | Faixa acima do prompt com o contexto da sessão, a janela de 5h e a semana; no app, uma praia e um pôr do sol, e o botão 🐚 Explain para pedidos de permissão |

## Instalar

O repositório é público: não precisa de conta no GitHub nem de chave SSH.

**No terminal**, fora de uma sessão:

```bash
claude plugin install barra-de-uso --marketplace https://github.com/orladigital/mare-mods.git
```

Dentro de uma sessão do terminal, o mesmo comando começa com `/plugin install`. Na primeira vez, o Claude Code
pergunta se pode adicionar o marketplace (`y`) e em que escopo instalar: escolha o de usuário, para o mod
valer em todos os projetos.

**No app desktop:** clique no **+** ao lado do prompt → **Plugins** → **Add marketplace**, informe
`https://github.com/orladigital/mare-mods.git` e depois **Add plugin** → `barra-de-uso`.

O mod passa a valer nas sessões novas, no terminal e no app. No app, feche e abra o app (Cmd+Q) para as
sessões já abertas pegarem o mod.

O atalho `--marketplace orladigital/mare-mods` também funciona, mas clona por SSH: só serve para quem tem
chave SSH cadastrada no GitHub.

Requisitos: Claude Code 2.1.316 ou mais novo e o `git` instalado (no macOS, vem com as Command Line Tools).
Onde cada mod funciona está em [docs/compatibilidade.md](docs/compatibilidade.md).

### Atualizar, desligar e desinstalar

```bash
claude plugin marketplace update mare-mods
```

```bash
claude plugin update barra-de-uso
```

```bash
claude plugin disable barra-de-uso
```

```bash
claude plugin enable barra-de-uso
```

```bash
claude plugin uninstall barra-de-uso
```

## Problemas e ideias

Abra uma [issue](https://github.com/orladigital/mare-mods/issues) dizendo o mod, o sistema, se é o terminal ou
o app, e a versão do Claude Code (`claude --version`).

## Contribuir

- [docs/criar-um-mod.md](docs/criar-um-mod.md): como um mod é feito, como desenvolver e o que aprendemos.
- [docs/requisitos.md](docs/requisitos.md): o que todo mod cumpre para entrar; o template de PR traz a lista.
- [docs/adr/](docs/adr/): as decisões do repositório e o porquê.

Ao abrir o primeiro PR, você aceita o [termo de contribuição](CLA.md).

## Licença

[Apache 2.0](LICENSE).
