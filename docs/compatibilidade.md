# Compatibilidade

## Versão do Claude Code

A versão mínima é a **2.1.316**: é a que o CI usa para testar cada PR. Com a atualização automática do
Claude Code ligada, ninguém fica abaixo dela. A versão mais nova é testada toda semana pelo canário
(`.github/workflows/canario.yml`), que abre uma issue quando algo quebra.

A versão mínima sobe quando um mod passa a usar algo que só existe numa versão mais nova: o PR troca o
`CLAUDE_CODE_VERSAO` do `ci.yml`, esta página e o README, e escreve no CHANGELOG do mod.

A API de mods está em early access: pode mudar entre versões sem aviso.

## Onde cada mod funciona

| Mod | App desktop (macOS) | App desktop (Windows) | Terminal (macOS) | Terminal (Windows) |
|---|---|---|---|---|
| `barra-de-uso` | tudo | sem o Explain; não testado | tudo, menos o Explain | não testado |
| `farol` | o núcleo; o não visto e o vermelho do pedido de permissão chegam numa versão seguinte | não testado; o registro de uma sessão fechada não se apaga (sai depois de 12 h) | o núcleo, sem o vermelho do pedido de permissão | não testado; o registro de uma sessão fechada não se apaga (sai depois de 12 h) |

Testado no terminal com iTerm2 e o terminal do Cursor, os dois com cor de 24 bits (`COLORTERM=truecolor`).
Num terminal sem cor de 24 bits, as cores das barras saem aproximadas.

Quem testar numa combinação marcada como "não testado" pode abrir uma issue com o resultado, ou um PR
atualizando esta tabela.
