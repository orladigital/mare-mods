# ADR 0002: código comum entre mods, por cópia conferida no CI

Data: 2026-11-10. Estado: aceito.

## Contexto

O ADR 0001 deixou para depois o código comum entre mods: "será decidido quando o segundo mod precisar dele".
O segundo mod, o farol, precisa: ele e a barra de uso leem os pedidos de permissão do mesmo jeito (o modo da
sessão e o log do app desktop). E um mod não importa arquivos de outro: cada plugin é instalado sozinho, e o
Claude Code só carrega o que está dentro da pasta dele.

## Decisão

- **Fonte única em `comum/`,** na raiz do repositório, com os testes ao lado (`<nome>.test.ts`).
- **Cada mod declara o que usa** em `plugins/<mod>/comum.json`, uma lista de arquivos de `comum/`
  (ex.: `["permissao.ts"]`).
- **Um script copia** cada arquivo declarado, e o teste dele, para `plugins/<mod>/hooks/comum/`, com o cabeçalho
  "Gerado de comum/<arquivo>; não edite aqui", e apaga a cópia que o mod não declara mais:
  `node scripts/copiar-comum.mjs`. O teste vai junto para rodar no `claude plugin test` de cada mod.
- **O CI falha se uma cópia divergir da fonte:** `node scripts/copiar-comum.mjs --conferir` aponta a cópia que
  falta, a que sobra e a que mudou, sem escrever nada.

## Alternativas descartadas

- **O farol depender do plugin da barra de uso:** obrigaria quem quer só um dos mods a instalar os dois.
- **Cópia à mão:** as cópias divergem em silêncio; uma correção feita num mod não chega ao outro.
- **Conferir com `git diff --exit-code` depois de rodar o script:** não vê a cópia nova que ninguém adicionou
  ao Git. O `--conferir` compara o disco com a fonte e vê os dois casos.

## Consequências

- Corrige-se uma vez, em `comum/`, e roda-se o script; o commit leva a fonte e as cópias juntas.
- O PR que muda `comum/` sobe a versão de cada mod cujo comportamento mudou, com a entrada no CHANGELOG dele.
- As cópias em `plugins/<mod>/hooks/comum/` não se editam: a próxima execução do script as sobrescreve, e o CI
  barra a edição antes disso.
- O script usa só o Node, sem dependência, e roda no macOS, no Linux e no Windows.
