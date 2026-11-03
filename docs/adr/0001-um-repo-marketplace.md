# ADR 0001: um repositório marketplace, com versão por mod

Data: 2026-11-03. Estado: aceito.

## Contexto

A Maré queria oferecer mods do Claude Code ao time. Cada pessoa escolhe quais usar, e um mod muda num ritmo
diferente do da CLI da Maré.

## Decisão

- **Repositório próprio** (`orladigital/mare-mods`), público, separado do `orladigital/mare`. A Maré pode
  oferecer a instalação no futuro, como já faz com outros plugins, sem carregar código de interface do Claude
  Code.
- **Um marketplace com vários mods** em `plugins/<mod>/`, listados em `.claude-plugin/marketplace.json`. Cada
  pessoa instala só os que quiser.
- **Versão por mod**, no `plugin.json` de cada um, com CHANGELOG próprio e tag `<mod>--v<versão>`
  (`claude plugin tag`). Não há versão do repositório nem pacote npm, então o semantic-release da Maré não
  se aplica.
- **Instalação por HTTPS** (`--marketplace https://github.com/orladigital/mare-mods.git`): o atalho
  `orladigital/mare-mods` clona por SSH, que falha para quem não tem chave cadastrada no GitHub.
- **Licença Apache 2.0 com CLA.** A Apache concede licença de patente explícita, comum em código aberto de
  empresa. O CLA autoriza a Orla a relicenciar as contribuições, para a licença poder ser revista no futuro
  mesmo depois de contribuições de fora.
- **CI com o Claude Code numa versão fixa** (a mínima prometida) e **canário semanal** na mais nova, porque a
  API de mods está em early access.

## Consequências

- Um mod não importa arquivos de outro. Código comum entre mods (por exemplo, a detecção de pedidos de
  permissão) será decidido quando o segundo mod precisar dele, num ADR próprio.
- Cada PR que muda um mod sobe a versão dele; sem isso, quem instalou não recebe a atualização.
- A proteção da `main`, o CLA Assistant e a liberação do Actions dependem de quem administra a orladigital.
