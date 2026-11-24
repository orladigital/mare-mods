# As fontes da página

As fontes ficam aqui, na própria pasta, para a página não carregar nada de outro endereço. São as mesmas de
orla.tech. Este arquivo não vai ao ar.

| Arquivo | Família | Pesos | Tamanho | De onde veio |
|---|---|---|---|---|
| `inter-tight-latin.woff2` | Inter Tight (títulos) | variável, 100 a 900 | 44 916 bytes | `fonts.gstatic.com/s/intertight/v9/` |
| `inter-latin.woff2` | Inter (texto) | variável, 100 a 900 | 48 432 bytes | `fonts.gstatic.com/s/inter/v20/` |
| `space-mono-400-latin.woff2` | Space Mono (código) | 400 | 9 464 bytes | `fonts.gstatic.com/s/spacemono/v17/` |

O Space Mono em negrito (700) não entra: nenhum texto da página o usa.

- **Baixadas em 23/11/2026** do Google Fonts, no formato `woff2` e só no subconjunto latino, que cobre o português.
- **A impressão digital (SHA-256) de cada arquivo** está em `scripts/site.test.mjs`: um arquivo trocado, mesmo com
  o mesmo nome, falha no teste.
- **Licença:** as três famílias são distribuídas pela SIL Open Font License 1.1 (OFL), que permite usar, hospedar
  e redistribuir, desde que o aviso de direitos autorais e o texto da licença acompanhem as fontes. Eles estão
  aqui, um por família, como vieram do repositório do Google Fonts (`github.com/google/fonts`, pasta `ofl/`):
  [OFL-inter.txt](OFL-inter.txt), [OFL-inter-tight.txt](OFL-inter-tight.txt) e
  [OFL-space-mono.txt](OFL-space-mono.txt). Não edite esses três arquivos.

## Trocar ou atualizar uma fonte

1. Baixe o arquivo novo do Google Fonts (o `woff2` do subconjunto `latin`) e confira que é mesmo uma fonte
   (`file <arquivo>` responde "Web Open Font Format (Version 2)").
2. Troque o arquivo aqui e a impressão digital dele em `scripts/site.test.mjs` (`shasum -a 256 <arquivo>`).
3. Se o nome mudar, acerte também o `estilo.css`, o `index.html` (o `preload`) e a lista do `pages.yml`.
