// Gerado de comum/largura.ts por scripts/copiar-comum.mjs; não edite aqui.

// Troca os símbolos que o terminal desenha com uma largura e o layout conta com outra (▶, ◆, ⚓…), para a
// borda de um Box não entortar com o título de uma sessão. Letras, acentos e pontuação ficam: a tabela East
// Asian Width "A" inteira incluiria á, é, ê, — e …, e mutilaria o português.

const EQUIVALENTES: Record<string, string> = {
  '▶': '>',
  '◀': '<',
  '◆': '*',
  '●': '*',
  '→': '->',
  '←': '<-',
  '⚓': '~',
}

// Os blocos de símbolos trocados: setas, técnicos, formas geométricas, símbolos diversos e dingbats.
const BLOCOS: ReadonlyArray<readonly [number, number]> = [
  [0x2190, 0x21ff],
  [0x2300, 0x23ff],
  [0x25a0, 0x25ff],
  [0x2600, 0x26ff],
  [0x2700, 0x27bf],
]

// Dentro desses blocos, os emojis de largura "W" na tabela East Asian Width (Unicode 15): o terminal os desenha
// com duas casas e o layout conta duas, então ficam (✅, ❌, ⌛…).
const LARGOS: ReadonlyArray<readonly [number, number]> = [
  [0x231a, 0x231b], [0x2329, 0x232a], [0x23e9, 0x23ec], [0x23f0, 0x23f0], [0x23f3, 0x23f3],
  [0x25fd, 0x25fe],
  [0x2614, 0x2615], [0x2648, 0x2653], [0x267f, 0x267f], [0x2693, 0x2693], [0x26a1, 0x26a1], [0x26aa, 0x26ab],
  [0x26bd, 0x26be], [0x26c4, 0x26c5], [0x26ce, 0x26ce], [0x26d4, 0x26d4], [0x26ea, 0x26ea], [0x26f2, 0x26f3],
  [0x26f5, 0x26f5], [0x26fa, 0x26fa], [0x26fd, 0x26fd],
  [0x2705, 0x2705], [0x270a, 0x270b], [0x2728, 0x2728], [0x274c, 0x274c], [0x274e, 0x274e], [0x2753, 0x2755],
  [0x2757, 0x2757], [0x2795, 0x2797], [0x27b0, 0x27b0], [0x27bf, 0x27bf],
]

// O seletor que pede o desenho de emoji (duas casas) a um símbolo que o layout conta com uma.
const SELETOR_EMOJI = 0xfe0f

const dentro = (faixas: ReadonlyArray<readonly [number, number]>, cp: number): boolean =>
  faixas.some(([de, ate]) => cp >= de && cp <= ate)

// O texto com os símbolos de largura ambígua trocados: os conhecidos pelo equivalente ASCII, os outros por *.
export const semLarguraAmbigua = (texto: string): string => {
  let saida = ''
  for (const c of texto) {
    const cp = c.codePointAt(0) ?? 0
    if (cp === SELETOR_EMOJI) continue
    saida += EQUIVALENTES[c] ?? (dentro(BLOCOS, cp) && !dentro(LARGOS, cp) ? '*' : c)
  }
  return saida
}
