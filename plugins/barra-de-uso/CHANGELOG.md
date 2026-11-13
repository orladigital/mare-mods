# Changelog do barra-de-uso

## 0.1.2 (2026-11-12)

- No terminal, o 📋 e o ≡ da faixa saem sem os colchetes do botão; o foco e o mouse ainda os invertem. No app,
  nada muda.

## 0.1.1 (2026-11-03)

- Corrige a praia do app, que não aparecia: o desenho saía com dois atributos colados e o app recusava
  o SVG. Um teste novo confere que todos os desenhos do app são SVG bem formado.

## 0.1.0 (2026-11-02)

Primeira versão.

- Faixa acima do prompt com o contexto da sessão, a janela de 5h (com o horário do reset, no fuso de São
  Paulo) e a semana.
- No app desktop: o contexto é uma praia (mar com ola, areia molhada e grãos, calçadão com coqueiro e espuma
  na ressaca, a partir de 85%) e a janela de 5h é um pôr do sol que escurece por onde o sol já passou.
- No terminal: barras paradas de 10 casas em degradê, com o rótulo `5h`, e uma linha de espaço acima da faixa.
- 🐚 Explain (só no app, no macOS): explica um pedido de permissão numa conversa lateral, com faixa de risco.
- Painel de ajustes no ⚓ (no terminal, `≡`): Explain, 📋, ola do app e barra da semana.
- `/barra-de-uso`: painel com o uso de cada janela, o reset, o contexto em tokens e o custo da sessão.
