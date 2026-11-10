# Changelog do farol

## 0.1.0 (2026-11-10)

Primeira versão: o núcleo, que funciona em qualquer máquina.

- Cada sessão grava o próprio estado em `~/.claude/farol/`, renova a cada 30 s e relê as outras a cada 5 s;
  sem sinal depois de 3 min, fora do painel depois de 12 h, apagada ao fechar.
- Estados: esperando (uma pergunta `AskUserQuestion`, também de subagente), trabalhando, livre e sem sinal.
- Na faixa: a torre em SVG no app, com o feixe vermelho quando alguma sessão espera você; `🚦` / `🚨 N` no
  terminal. Um clique abre o painel.
- `/farol`: o painel com as sessões em texto, os ajustes (na faixa, contagem no app, movimento) e o Fechar.
