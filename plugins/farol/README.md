# farol

O estado de todas as sessões abertas do Claude Code na máquina, para você saber de relance qual espera você.

```bash
claude plugin install farol --marketplace https://github.com/orladigital/mare-mods.git
```

A instalação pelo app desktop, a atualização e a desinstalação estão no
[README do repositório](../../README.md#instalar).

## Na faixa

| | App desktop | Terminal |
|---|---|---|
| sem aviso | a torre do farol, na cor do texto | `🚦` |
| alguma sessão esperando você | o feixe da torre acende em vermelho | `🚨 N` (N sessões esperando) |
| só resposta que você não viu (app no macOS) | o feixe acende em azul | `🚦` |

Um clique abre o painel. O farol divide a faixa com os outros mods, à esquerda deles.

## O painel

Abre pelo clique na faixa ou pelo `/farol`. Cada sessão aparece em duas linhas: o título e
`pasta · tempo · estado`. A sessão de onde você abriu leva `esta sessão`. O título é o nome da sessão na barra
lateral do app (também depois de renomear), no app desktop do macOS; fora dele, a primeira mensagem da sessão.

No app desktop, o painel tem no topo a cena do farol, cuja lanterna diz o estado de todas as sessões juntas
(vermelha, com os feixes girando, quando alguma espera você; azul-luar, com a boia acesa, quando há resposta que
você não viu; âmbar com alguma trabalhando; verde com todas livres; apagada sem sessões), e cada sessão é um
cartão na cor do estado, com um barco ao lado. No macOS, um clique no cartão de outra sessão leva o app para ela.
No terminal, o painel é em texto.

| Estado | Quando |
|---|---|
| Esperando | a sessão fez uma pergunta (`AskUserQuestion`) ou, no app no macOS, pediu uma permissão, dela ou de um subagente, e aguarda a resposta |
| Não visto | só no app no macOS: a sessão respondeu fora da tela, depois da última vez que você a abriu; abrir a sessão apaga |
| Trabalhando | entre o prompt e o fim da resposta |
| Livre | a resposta terminou |
| Sem sinal | a sessão não dá sinal há mais de 3 minutos (travou ou fechou sem avisar) |

A ordem é a da atenção: esperando, não visto, trabalhando, livre e sem sinal; dentro de cada um, a mais recente
primeiro. Uma sessão sem sinal há mais de 12 horas sai do painel.

## Ajustes

No próprio painel, pelo botão **Ajustes** no rodapé (eles abrem recolhidos):

| Ajuste | Padrão | O que muda |
|---|---|---|
| Na faixa | mostrar | **esconder:** o farol sai da faixa; o `/farol` continua abrindo o painel |
| Contagem na faixa | desligada | Só no app: o número de sessões esperando ao lado da torre. No terminal, o número sempre aparece |
| Movimento | ligado | Só no app: a cena e os barcos do painel se mexendo. Desligado, tudo fica parado |

Os ajustes ficam guardados para você e valem nas sessões seguintes.

## Como funciona

Cada sessão com o farol grava o próprio estado em `~/.claude/farol/<id da sessão>.json` e renova o arquivo a
cada 30 segundos; a cada 5 segundos, ela relê o das outras. O arquivo tem o id da sessão, o nome da pasta, o
título, o estado e os horários; nada sai da máquina. Ao fechar a sessão, o arquivo é apagado.

No app desktop do macOS, o farol também lê o que o app sabe das sessões: os arquivos de sessão do app
(`~/Library/Application Support/Claude/claude-code-sessions/`), com o nome na barra lateral, o modo de permissão e
a última vez que você abriu cada sessão, e o log do app (`~/Library/Logs/Claude/main.log`), que registra cada
pedido de permissão que aparece na sua tela e a sua resposta. A troca de sessão abre o link `claude://` da
sessão pelo `open` do macOS.

## Limites

- **O não visto, o vermelho do pedido de permissão e a troca de sessão dependem de arquivos internos do app
  desktop**, que o app pode mudar sem aviso. Se eles faltarem ou mudarem de formato, o farol segue sem esses
  extras e sem erro: sem azul, só a pergunta (`AskUserQuestion`) acendendo o vermelho, e o título pela primeira
  mensagem.
- **Pedido de permissão no terminal não acende o farol nesta versão:** só a pergunta (`AskUserQuestion`).
- **O não visto conta a sessão aberta por último no app como a que está na tela**, mesmo com o app atrás de outra
  janela: uma resposta dela nesse momento não fica azul.
- **Windows:** não testado. A pasta da casa vem do `USERPROFILE` quando não há `HOME`, mas lá não há `rm`, e o
  arquivo de uma sessão fechada não é apagado: ele fica no painel como sem sinal e sai depois de 12 horas.
- **Sem `HOME` nem `USERPROFILE`**, o farol não grava nem lê nada, e o painel diz isso.

## Compatibilidade

Claude Code 2.1.316 ou mais novo, no app desktop e no terminal. A tabela completa está em
[docs/compatibilidade.md](../../docs/compatibilidade.md).
