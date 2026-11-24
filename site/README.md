# A página do Maré Mods

A página que apresenta os mods: o que cada um faz, uma demonstração para mexer e como instalar. É publicada no
GitHub Pages a partir desta pasta.

| Arquivo | O que é | Vai ao ar |
|---|---|---|
| `index.html` | O conteúdo, em português, e a política de segurança | sim |
| `estilo.css` | O visual, com a identidade da Orla (orla.tech) e as cores dos mods | sim |
| `app.js` | As demonstrações (a praia, o pôr do sol, o farol), o botão de copiar e a escolha em "Instalar" | sim |
| `favicon.svg` | O ícone da aba | sim |
| `fontes/*.woff2` | As três fontes da página (Inter Tight, Inter e Space Mono) | sim |
| `fontes/LEIA-ME.md` | De onde veio cada fonte, a licença e como trocar | não |
| `fontes/OFL-*.txt` | O texto da licença de cada fonte, como veio do Google Fonts | não |
| `README.md` | Este arquivo | não |

## Como é feita

- **HTML, CSS e JavaScript puros.** Sem framework, sem dependência, sem `package.json` e sem build: o que está
  na pasta é o que vai ao ar. Não há o que atualizar nem o que auditar além destes arquivos.
- **Nada vem de fora.** Nenhum script, estilo, imagem ou fonte de outro endereço. As fontes ficam em `fontes/`, e
  o teste confere a impressão digital de cada arquivo.
- **Os desenhos são os dos mods.** A praia e o pôr do sol seguem `plugins/barra-de-uso/hooks/praia.ts` e
  `sol.ts`; a cena do farol segue `plugins/farol/hooks/cena.ts`, com as mesmas cores e a mesma regra para juntar
  as situações marcadas (o esperando ganha, depois a pergunta; o não visto acende a boia junto). São cópias feitas
  à mão: se o desenho ou a regra de um mod mudar, a demonstração daqui precisa da mesma mudança.
- **A página é a orla de Copacabana vista de cima,** na ordem em que ela existe: a avenida (a barra de cima), o
  calçadão com a ciclovia, a areia, o mar (os mods), a ponta do farol e, de volta, a pedra e a areia. Os enfeites
  (coqueiros, cocos, guarda-sóis, quem passa na ciclovia e no calçadão, os bichos do mar, o farol) são desenhos do
  próprio `index.html`.
- **Todo movimento pode ser parado.** O botão de pausa da barra de cima para as ondas, quem passa e as
  demonstrações; a preferência de menos movimento do sistema faz o mesmo sozinha.
- **Mod novo:** entra na seção dos mods, no índice da barra de cima, no índice da abertura e na escolha de
  "Instalar" (o "Todos" passa a incluí-lo sozinho).
- **Sem dado de quem visita.** A página não usa cookie, analytics nem formulário, e o script não fala com a rede.

## Ver na sua máquina

Na raiz do repositório:

```bash
python3 -m http.server 4173 --directory site
```

Abra `http://localhost:4173`. A política de segurança está no próprio `index.html`, então já vale aqui: um erro
dela aparece no console do navegador.

## Conferir

Na raiz do repositório, depois de cada mudança:

```bash
node --test scripts/site.test.mjs scripts/dados-pessoais.test.mjs
```

O primeiro confere o conteúdo (os mods do `marketplace.json` e a versão mínima do `ci.yml`), a segurança da página
e a do workflow de publicação. O segundo procura dado pessoal e segredo nos arquivos desta pasta. O CI roda os dois
em cada PR, e o workflow de publicação roda os dois de novo antes de publicar.

## Segurança

O que protege a página, e o que cada coisa barra:

| Proteção | Onde | O que barra |
|---|---|---|
| Política de segurança (`Content-Security-Policy`) | `index.html` | Script, estilo, imagem ou fonte de outro endereço; script escrito dentro do HTML; qualquer pedido à rede feito pelo script; envio de formulário |
| Nada de script nem de estilo dentro do HTML | teste | Um trecho colado no HTML que a política teria de liberar com `unsafe-inline` |
| Script sem rede e sem armazenamento | teste | `fetch`, cookie, `localStorage` e montar HTML a partir de texto |
| Links para fora só para o repositório e orla.tech | teste | Link para endereço desconhecido; os links não dizem de onde a pessoa veio (`noreferrer`) |
| Aberta dentro de outra página, não mostra nada | `app.js` | A página servir de isca dentro de uma moldura de outro site |
| Ações fixadas pelo commit | `pages.yml`, teste | Uma versão de ação trocada por outro código sem ninguém ver |
| Permissão mínima e só da `main` | `pages.yml`, teste | Um PR publicar, ou a publicação escrever no repositório |
| Lista fechada do que vai ao ar | `pages.yml`, teste | Um arquivo posto na pasta por engano ir a público |
| Varredura de segredo e de dado pessoal | CI | Chave, token, e-mail e caminho pessoal em qualquer arquivo |

Limites, para ninguém contar com o que não existe:

- **O GitHub Pages não deixa definir cabeçalho HTTP.** Por isso a política fica numa etiqueta do HTML, e a
  proteção contra moldura é feita pelo script (com o JavaScript desligado, ela não vale). A página não tem login
  nem formulário: dentro de uma moldura, não há o que roubar.
- **HTTPS:** quem administra o repositório liga o "Enforce HTTPS" em Settings → Pages.
- **Não há segredo aqui e não deve haver.** A página não precisa de chave, token nem variável de ambiente.

## Publicar

Quem publica é o workflow `.github/workflows/pages.yml`:

1. Um merge na `main` que mexe em `site/` dispara o workflow (também dá para rodar à mão, em Actions → pages).
2. Ele roda os dois testes; se um falhar, nada vai ao ar.
3. Ele copia para uma pasta limpa só os arquivos da lista (os marcados com "sim" na tabela do começo) e publica.

Um PR não publica nada. Para ver a mudança de um PR, rode a página na sua máquina.

**Arquivo novo na pasta:** entra na lista do passo "Separa" do `pages.yml` (ou, se for só do repositório, na lista
`SO_NO_REPO` do teste). O teste falha enquanto ele não estiver numa das duas.

**Versão nova de uma ação:** troque o commit e o comentário da versão juntos. O commit de uma versão sai de
`gh api repos/actions/<ação>/commits/<versão> --jq .sha`.

### O que quem administra o repositório faz, uma vez

1. **Settings → Pages → Build and deployment → Source:** `GitHub Actions`.
2. **Settings → Pages:** marcar **Enforce HTTPS**.
3. **Settings → Environments → github-pages → Deployment branches and tags:** só a `main`.
