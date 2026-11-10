import { describe, expect, test } from 'claude-code/testing'

import { semLarguraAmbigua } from './largura'

describe('troca dos símbolos de largura ambígua', () => {
  test('português fica como está: acentos, travessão, reticências e sinais', async () => {
    const titulo = 'Revisar você é… — ação, coração, 30° × 2 ½ «nota» ¿sim?'
    expect(semLarguraAmbigua(titulo)).toBe(titulo)
  })

  test('os símbolos conhecidos viram o equivalente ASCII', async () => {
    expect(semLarguraAmbigua('▶ Revisar ◆ deploy ⚓')).toBe('> Revisar * deploy ~')
    expect(semLarguraAmbigua('◀ voltar → seguir ← antes ●')).toBe('< voltar -> seguir <- antes *')
  })

  test('os outros símbolos de setas, técnicos, formas, diversos e dingbats viram *', async () => {
    expect(semLarguraAmbigua('★ meta ■ fim ✔ ok ⇒ daí ⌘ atalho ☐ tarefa')).toBe('* meta * fim * ok * daí * atalho * tarefa')
  })

  test('o seletor de emoji sai, e o símbolo que ele vestia é trocado', async () => {
    expect(semLarguraAmbigua('⚠️ falhou ❤️')).toBe('* falhou *')
  })

  test('emojis que o terminal já desenha com duas casas ficam', async () => {
    expect(semLarguraAmbigua('🚨 2 ✅ pronto ⌛ espera ❌ erro 🚦')).toBe('🚨 2 ✅ pronto ⌛ espera ❌ erro 🚦')
  })

  test('texto vazio continua vazio', async () => {
    expect(semLarguraAmbigua('')).toBe('')
  })
})
