# barra-de-uso

Uma faixa acima do prompt do Claude Code com o contexto da sessão, a janela de 5h e a semana.

```bash
claude plugin install barra-de-uso --marketplace https://github.com/orladigital/mare-mods.git
```

A instalação pelo app desktop, a atualização e a desinstalação estão no
[README do repositório](../../README.md#instalar).

No terminal:

```
Contexto ▄▄▄▄▄▄▄▄▄▄ 50%  │  5h ▄▄▄▄▄▄▄▄▄▄ 42% - 17:00  │  Sem. 70%   ≡
```

No terminal, cada barra tem 10 casas, as cheias em degradê e as vazias apagadas, sem animação. No app
desktop, as barras são desenhos com curvas, e a faixa ganha o botão **🐚 Explain** ao lado do ⚓ sempre que
um pedido de permissão espera você.

- **Contexto: a praia.** Quanto da janela de contexto da sessão já está ocupado. No app, o mar avança sobre a
  areia, que fica molhada logo depois da água; o fim da barra é o calçadão (de 85% a 100%), com um coqueiro:
  quando o mar passa do meio-fio, vira ressaca e cobre a pedra de espuma, e é hora de pensar num `/compact`.
  No terminal, a barra vai do azul ao turquesa, e as casas depois dos 85% ficam claras, como espuma.
- **5h:** o uso da janela de 5h e o horário em que ela renova. No app, é um pôr do sol: o céu escurece por onde
  o sol já passou e ele desce em direção ao mar conforme a janela é usada; em 100%, chega ao horizonte. No
  terminal, a barra vai do verde-mar ao coral.
- **Sem.:** o uso da janela semanal, só o número. Os ajustes (⚓) mostram uma barra ou a escondem.

No app, as barras têm a mesma largura e acompanham a largura da faixa (de 64 a 96 px); com pouco espaço, cada
uma desce inteira para a linha de baixo, sem quebrar no meio. O mar se mexe no próprio desenho: a beira vai
e volta e uma ola de brilho corre pela água, sem custo para o mod.

Os horários saem no fuso de São Paulo. Os números vêm da conta de quem está usando; a janela de 5h e a
semanal só aparecem em conta de assinatura. O Claude Code só mede o contexto depois da primeira resposta da
sessão (nova ou retomada); até lá, a faixa mostra `Contexto …`.

## Botões

- **🐚 Explain** (só no app desktop, no macOS) aparece quando o Claude pede permissão para uma ferramenta.
  Ele explica o pedido numa conversa lateral, sem executar nada e sem mexer na conversa principal, e começa
  por uma faixa de risco: BAIXO 1, BAIXO 2, MEDIO 3, ALTO 4 ou ALTISSIMO 5. O pedido continua esperando a sua
  resposta. No modo Auto, ele só aparece nos pedidos que o classificador manda para você; no Manual, em todos.
- **📋** copia o comando que reabre a sessão no app a partir de um terminal
  (`cd <pasta> && claude --desktop --resume <id>`). Vem desligado.
- **⚓** (no terminal, **≡**) abre o painel de ajustes ao lado da conversa; clicar de novo, ou em **Fechar**,
  fecha.

## Ajustes (⚓)

| Ajuste | Padrão | O que muda |
|---|---|---|
| Explain | ligado | Mostra ou esconde o botão Explain (só no app; no terminal, o ajuste não aparece) |
| Copiar comando | desligado | Mostra ou esconde o botão 📋 |
| Semana | só número (padrão) | **só número:** `Sem. 70%`. **com barra:** acrescenta a barra fina. **escondida:** a semana sai da faixa |
| Ola | ligada (padrão) | Só no app: o mar se mexendo no desenho. **desligada:** mar parado. No terminal as barras não se mexem, e o ajuste não aparece |

Os ajustes ficam guardados para você e valem nas sessões seguintes.

## Painel

`/barra-de-uso` abre um painel com o uso de cada janela, a data e a hora do reset e quanto falta, o contexto
em tokens e o custo equivalente da sessão.

## Limites

- **🐚 Explain só existe no app desktop, e só no macOS.**
  - No terminal, a faixa some enquanto o pedido de permissão está na tela, então não haveria onde clicar; e o
    aviso do pedido pode nem chegar aos mods, quando outro plugin o responde antes.
  - No app, o mod descobre o pedido lendo o log e os arquivos de sessão do app em `~/Library`, que só existem
    no macOS. Esses arquivos não são documentados e podem mudar numa atualização do app; se isso acontecer, o
    botão para de aparecer e o resto da faixa segue normal.
- **📋** usa a área de transferência do Claude Code e, se ela falhar no app, o `pbcopy` do macOS.

## Compatibilidade

Claude Code 2.1.316 ou mais novo. O Explain só existe no app desktop no macOS; o resto funciona no app e no
terminal. A tabela completa está em [docs/compatibilidade.md](../../docs/compatibilidade.md).
