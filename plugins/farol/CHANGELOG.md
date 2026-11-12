# Changelog do farol

## 0.3.0 (2026-11-11)

Os extras do app desktop no macOS. Fora dele (terminal, Linux, Windows), nada muda.

- **Não visto:** a sessão que respondeu fora da tela, depois da última vez que você a abriu no app, fica com o
  cartão azul e acende a boia da cena e o feixe azul da torre na faixa. Abrir a sessão apaga.
- **Pedido de permissão:** acende o vermelho, também o de um subagente. No Manual e no plano, na hora; no Auto,
  quando o pedido aparece na sua tela, pelo log do app. Com vários pedidos abertos, a sessão volta a trabalhando
  depois do último.
- **Troca de sessão:** um clique no cartão de outra sessão leva o app para ela. Se o app não abrir, um aviso diz
  isso.
- **Título:** o nome da sessão na barra lateral do app, também depois de renomear; fora do app, a primeira
  mensagem, como antes.
- **As sessões pré-abertas do app** (spares) não aparecem mais no farol até o app usá-las, e a pasta de cada sessão
  é a que o app mostra.
- Se os arquivos do app faltarem ou mudarem de formato, o farol segue no núcleo, sem erro.
- **A cena chama mais o olho:** com sessão esperando, a lanterna pisca em vermelho, com feixes largos girando a cada
  2 s, halo, reflexo no mar e dois sinalizadores que avermelham o céu; com resposta não vista, a boia azul maior
  pisca e, sem sessão esperando, a lanterna e os feixes ficam azuis; com sessão trabalhando, o halo âmbar pulsa
  forte; com todas livres, a luz é branca. No tema escuro, uma borda clara separa a cena do painel.
- **Os barcos** piscam mais longo e mais vezes (a cada 2,5 s).
- **Na faixa,** a torre vermelha pisca (parada com o "Movimento" desligado), e o "…" que aparecia ao lado da
  torre com a contagem ligada sumiu.

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
