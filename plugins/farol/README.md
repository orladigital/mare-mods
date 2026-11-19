# farol

O estado de todas as sessões abertas do Claude Code na máquina, para você saber de relance qual espera você.

```bash
claude plugin install farol --marketplace https://github.com/orladigital/mare-mods.git
```

A instalação pelo app desktop, a atualização e a desinstalação estão no
[README do repositório](../../README.md#instalar).

## Na faixa

| | App desktop | Terminal e extensão da IDE |
|---|---|---|
| sem aviso | a torre do farol, na cor do texto | `🚦` |
| alguma sessão esperando você | o feixe da torre acende em vermelho e pisca (parado com o "Movimento" desligado) | `🚨 N` (N sessões esperando), o número em negrito na cor de erro do tema |
| alguma sessão com uma pergunta para você | o feixe acende em coral, parado | `🚦` |
| só resposta que você não viu (app no macOS) | o feixe acende em azul | `🚦` |

Um clique abre o painel. O farol divide a faixa com os outros mods, à esquerda deles. Na extensão da IDE, a faixa
usa o botão do terminal, que a IDE desenha como um botão de verdade.

## O painel

Abre pelo clique na faixa ou pelo `/farol`. Cada sessão aparece em duas linhas: o título e
`pasta · tempo · estado`. No macOS, o título é o nome da sessão na barra lateral do app (também depois de
renomear), no app e no terminal; fora do macOS, a primeira mensagem da sessão. Depois de 5 minutos esperando você,
o tempo da sessão fica mais forte (no app, em vermelho e negrito; no terminal, em negrito e sublinhado).

No app desktop, o painel tem no topo a cena do farol, que diz o estado de todas as sessões juntas:
- **alguma esperando você:** a lanterna pisca em vermelho, com feixes largos girando, o reflexo no mar e
  sinalizadores que avermelham o céu;
- **alguma com uma pergunta para você:** a lanterna coral, com o halo parado;
- **resposta que você não viu:** a boia azul pisca no mar e, sem sessão esperando, a lanterna e os feixes ficam
  azuis;
- **alguma trabalhando:** a lanterna e o halo em âmbar;
- **todas livres:** a luz branca, bem fraca; **sem sessões:** apagada.

Abaixo da cena, um resumo em selos com o que pede atenção ou está em curso (`1 Esperando`, `2 Perguntas`,
`1 Trabalhando`), e um cartão por sessão, na cor do estado, com um barco ao lado. O cartão da sessão de onde você
abriu tem o aspecto de uma aba selecionada: uma barra na cor do estado à esquerda, o fundo um tom mais forte e
`esta sessão` em negrito. Com o painel aberto e o "Movimento" ligado, a borda do cartão esperando e os barcos que
avisam (o vermelho e o azul) piscam juntos, a cada 0,6 segundo. No macOS, um clique no cartão de outra sessão leva
o app para ela. No tema escuro, a cena ganha uma borda clara.

No terminal, sem animação e com os mesmos tons nos temas claro e escuro:
- **no topo, um resumo** com os estados que têm sessão: `1 Esperando`, `1 Pergunta`, `1 Trabalhando`, `3 Livres`;
- **a seção "Esta sessão"**, com o cartão da sessão de onde você abriu (borda dupla; esperando, fica a grossa), e
  depois **"Outras sessões"**;
- **um cartão de duas linhas por sessão:** o título em negrito em cima e `pasta · há 2 min · estado` embaixo. O
  esperando tem fundo vermelho e uma borda grossa; a pergunta, fundo coral escuro; o trabalhando, fundo verde-água
  claro; o livre, só uma borda clara;
- **no fim, as sessões sem sinal** juntas numa linha apagada: `2 sem sinal · há 4 min a 35 min · pasta`.

O título corta no fim da linha, e os símbolos que alguns terminais desenham mais largos (setas, ◆, ⚓…) viram texto
(`->`, `*`, `~`) para a borda não entortar. No terminal não há não visto: a
sessão que estaria azul aparece livre.

| Estado | Quando |
|---|---|
| Esperando | a sessão fez uma pergunta (`AskUserQuestion`) ou pediu uma permissão, dela ou de um subagente, e aguarda a resposta; no app, também quando a resposta termina com uma caixa que depende de você, até o próximo prompt |
| Pergunta | só no app: a resposta termina com uma caixa que pergunta algo, mas não depende de você para seguir; vai até o próximo prompt, sem o som do esperando |
| Não visto | só no app no macOS: a sessão respondeu fora da tela, depois da última vez que você a abriu; abrir a sessão apaga |
| Trabalhando | entre o prompt e o fim da resposta |
| Livre | a resposta terminou |
| Sem sinal | a sessão não dá sinal há mais de 3 minutos (travou ou fechou sem avisar) |

A ordem é a da atenção: esperando, pergunta, não visto, trabalhando, livre e sem sinal; dentro de cada um, a mais
recente primeiro. Uma sessão sem sinal há mais de 12 horas sai do painel.

## Ajustes

No próprio painel, pelo botão **Ajustes** no rodapé (eles abrem recolhidos):

| Ajuste | Padrão | O que muda |
|---|---|---|
| Na faixa | mostrar | **esconder:** o farol sai da faixa; o `/farol` continua abrindo o painel |
| Contagem na faixa | desligada | Só no app: o número de sessões esperando ao lado da torre. No terminal, o número sempre aparece |
| Movimento | ligado | Só no app: a cena, os barcos e a borda do esperando se mexendo. Desligado, tudo fica parado |
| Intensidade de avisos | padrão | **alta:** no app, o feixe vermelho gira mais rápido, sobem mais sinalizadores e a torre mostra a contagem; nas duas superfícies, o som do esperando se repete (ver [Som](#som)) |
| Som: Esperando por você | ligado | O som quando a sessão passa a esperar você |
| Som: Resposta não vista | ligado | Só no app: o som quando a sessão responde fora da tela |
| Som: Volume | alto | **médio** ou **baixo:** os dois sons mais fracos |

Os ajustes ficam guardados para você e valem nas sessões seguintes.

## Som

| Som | Quando toca | Como soa |
|---|---|---|
| Esperando por você | a sessão passa a esperar você: uma pergunta ou um pedido de permissão (também de um subagente) | dois tons que sobem, duas vezes |
| Resposta não vista | só no app desktop: a sessão termina uma resposta fora da tela | uma gota que sobe |

- **Cada sessão toca só o próprio som.** Com várias sessões abertas, cada aviso toca uma vez, na sessão que
  avisa. O "esperando por você" toca também na sessão que está na sua tela.
- **Uma vez por aviso, na intensidade padrão:** o mesmo som não toca de novo na mesma sessão antes de 10 segundos.
  **Na alta,** o "esperando por você" se repete a cada 2 minutos enquanto a sessão espera, no máximo 3 vezes.
- **A pergunta (o estado coral) não toca o "esperando por você".** Fora da tela do app, toca a "resposta não
  vista", como qualquer resposta que termina fora da tela.
- **Onde toca:** no app desktop e no terminal do macOS. No terminal, só o "esperando por você". Num terminal no
  Linux ou no Windows, nada toca, sem erro.
- **Para desligar ou baixar:** em **Ajustes**, no cartão **Som**, cada som tem o seu ajuste, e o volume vale para
  os dois. O "Movimento" não mexe nos sons.
- **A notificação do app:** o app desktop pode tocar a notificação dele quando uma resposta termina. Se ela soar
  junto com a "resposta não vista", desligue uma das duas: a do farol aqui, ou a do app nos ajustes de notificação
  do app.

Os sons são sintetizados pelo `sons/gerar.mjs`, sem licença de terceiros (`node plugins/farol/sons/gerar.mjs`
regrava os dois arquivos).

## Demonstração

O `/farol demo` mostra, no painel e na faixa, sessões fictícias passando pelas situações do farol, um ciclo só, com o
nome da situação em destaque no topo do painel:

- **no app, 23 situações em cerca de 1 min 52 s,** cada uma pelo seu tempo (de 3 a 15 s): uma abertura com o mar e o
  farol em movimento, vistos do calçadão de Copacabana, de dia; as calmas, com o destaque de "esta sessão"; os
  avisos, com três situações de uma sessão esperando seguidas delas mesmas na intensidade alta, para comparar as
  duas; todas as cenas do topo; os ajustes abertos e recolhidos e o movimento desligado; um "E tem mais", com a
  torre na faixa, os cartões clicáveis, os sons e o terminal; e um encerramento ao pôr do sol, com o farol aceso;
- **no terminal, 5, de 6 s cada:** esperando, trabalhando e livre (com a seção "Esta sessão"), só trabalhando, todas
  livres, duas esperando (`🚨 2`) e pergunta com trabalhando.

A demonstração não grava nada e não toca som. O painel é só exibição: cada situação usa os ajustes no padrão (mais o
que ela muda), o bloco de ajustes abre e fecha sozinho, e nenhuma escolha muda os seus. No fim do ciclo, ou ao fechar
o painel, o farol volta às suas sessões e aos seus ajustes; o `/farol demo` de novo recomeça do início.

## Como funciona

Cada sessão com o farol grava o próprio estado em `~/.claude/farol/<id da sessão>.json` e renova o arquivo a
cada 30 segundos; a cada 5 segundos, ela relê o das outras. O arquivo tem o id da sessão, o nome da pasta, o
título, o estado e os horários; nada sai da máquina. Ao fechar a sessão, o arquivo é apagado.

No macOS, o farol também lê o que o app desktop sabe das sessões: os arquivos de sessão do app
(`~/Library/Application Support/Claude/claude-code-sessions/`), com o nome na barra lateral, o modo de permissão e
a última vez que você abriu cada sessão. No app, ele lê também o log do app (`~/Library/Logs/Claude/main.log`), que
registra cada pedido de permissão que aparece na sua tela e a sua resposta. A troca de sessão abre o link
`claude://` da sessão pelo `open` do macOS.

No terminal, o pedido de permissão acende pelo modo de permissão da sessão, que o Claude Code grava a cada prompt na
transcrição da sessão (`~/.claude/projects/<pasta>/<id da sessão>.jsonl`): no Manual e no plano, o pedido aparece na
sua tela e a sessão fica esperando você até a resposta; no Auto, quem decide é o classificador, e o farol não acende.

## Limites

- **O não visto, a pergunta, o vermelho do pedido de permissão no app e a troca de sessão dependem de arquivos
  internos do app desktop**, que o app pode mudar sem aviso. Se eles faltarem ou mudarem de formato, o farol segue
  sem esses extras e sem erro: sem azul, sem coral, só a pergunta (`AskUserQuestion`) acendendo o vermelho, e o
  título pela primeira mensagem.
- **No terminal, o modo de permissão vem da transcrição da sessão**, que só registra o modo a cada prompt: se você
  trocar de modo no meio de uma resposta (Shift+Tab), o farol só vê a troca no prompt seguinte. Sem a transcrição,
  o pedido de permissão não acende.
- **O não visto conta a sessão aberta por último no app como a que está na tela**, mesmo com o app atrás de outra
  janela: uma resposta dela nesse momento não fica azul.
- **Windows:** não testado. A pasta da casa vem do `USERPROFILE` quando não há `HOME`, mas lá não há `rm`, e o
  arquivo de uma sessão fechada não é apagado: ele fica no painel como sem sinal e sai depois de 12 horas.
- **Sem `HOME` nem `USERPROFILE`**, o farol não grava nem lê nada, e o painel diz isso.

## Compatibilidade

Claude Code 2.1.316 ou mais novo, no app desktop, no terminal e na extensão da IDE. A tabela completa está em
[docs/compatibilidade.md](../../docs/compatibilidade.md).
