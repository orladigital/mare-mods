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

Um clique abre o painel. O farol divide a faixa com os outros mods, à esquerda deles.

## O painel

Abre pelo clique na faixa ou pelo `/farol`. Cada sessão aparece em duas linhas: o título (a primeira mensagem
da sessão) e `pasta · tempo · estado`. A sessão de onde você abriu leva `esta sessão`.

No app desktop, o painel tem no topo a cena do farol, cuja lanterna diz o estado de todas as sessões juntas
(vermelha, com os feixes girando, quando alguma espera você; âmbar com alguma trabalhando; verde com todas livres;
apagada sem sessões), e cada sessão é um cartão na cor do estado, com um barco ao lado. No terminal, o painel é
em texto.

| Estado | Quando |
|---|---|
| Esperando | a sessão fez uma pergunta (`AskUserQuestion`), dela ou de um subagente, e aguarda a resposta |
| Trabalhando | entre o prompt e o fim da resposta |
| Livre | a resposta terminou |
| Sem sinal | a sessão não dá sinal há mais de 3 minutos (travou ou fechou sem avisar) |

A ordem é a da atenção: esperando, trabalhando, livre e sem sinal; dentro de cada um, a mais recente primeiro.
Uma sessão sem sinal há mais de 12 horas sai do painel.

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

## Limites

- **Pedido de permissão não acende o farol nesta versão:** só a pergunta (`AskUserQuestion`). O vermelho
  pelo pedido de permissão chega numa versão seguinte, no app desktop do macOS.
- **Windows:** não testado. A pasta da casa vem do `USERPROFILE` quando não há `HOME`, mas lá não há `rm`, e o
  arquivo de uma sessão fechada não é apagado: ele fica no painel como sem sinal e sai depois de 12 horas.
- **Sem `HOME` nem `USERPROFILE`**, o farol não grava nem lê nada, e o painel diz isso.

## Compatibilidade

Claude Code 2.1.316 ou mais novo, no app desktop e no terminal. A tabela completa está em
[docs/compatibilidade.md](../../docs/compatibilidade.md).
