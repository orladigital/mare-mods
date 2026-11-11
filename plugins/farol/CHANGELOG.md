# Changelog do farol

## 0.2.0 (2026-11-11)

O painel no app desktop ganha desenho.

- No topo, a cena do farol à noite: a lanterna diz o estado de todas as sessões (vermelha com sessão esperando,
  âmbar com sessão trabalhando, verde com todas livres, apagada sem sessões), com os feixes vermelhos girando e o
  halo quando alguma espera você. A boia azul, para resposta não vista, já está desenhada e acende numa versão
  seguinte.
- Cada sessão vira um cartão na cor do estado, com um barco: a bandeira e o casco piscam no esperando, a bandeira
  fica parada e o barco deixa esteira no trabalhando. Os tons servem nos temas claro e escuro do app.
- O ajuste "Movimento" para a cena e os barcos.
- Os ajustes abrem recolhidos, pelo botão "Ajustes" no rodapé do painel, nas duas superfícies.
- Na faixa do app, a torre ocupa uma área maior, mais perto da dos outros botões.
- O título de uma sessão não é mais o aviso de interrupção ("[Request interrupted by user]") nem o aviso de uma
  sessão começada por outra.
- No terminal, o painel continua em texto.

## 0.1.0 (2026-11-10)

Primeira versão: o núcleo, que funciona em qualquer máquina.

- Cada sessão grava o próprio estado em `~/.claude/farol/`, renova a cada 30 s e relê as outras a cada 5 s;
  sem sinal depois de 3 min, fora do painel depois de 12 h, apagada ao fechar.
- Estados: esperando (uma pergunta `AskUserQuestion`, também de subagente), trabalhando, livre e sem sinal.
- Na faixa: a torre em SVG no app, com o feixe vermelho quando alguma sessão espera você; `🚦` / `🚨 N` no
  terminal. Um clique abre o painel.
- `/farol`: o painel com as sessões em texto, os ajustes (na faixa, contagem no app, movimento) e o Fechar.
