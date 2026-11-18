// Gera os sons do farol nesta pasta: `node plugins/farol/sons/gerar.mjs`.
//
// São sintetizados aqui, sem gravação nem licença de terceiros: WAV mono, 16 bits, 44,1 kHz, com o pico a 60% do
// máximo. Cada nota tem um ataque curto e um decaimento exponencial.
// - esperando.wav: dois tons que sobem (880 Hz e 1174,7 Hz), duas vezes, ~1,2 s;
// - nao-visto.wav: uma gota que sobe (de 700 Hz), ~0,2 s.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const TAXA = 44100
const PASTA = fileURLToPath(new URL('.', import.meta.url))

// Uma nota senoidal: `glide` sobe a frequência ao longo da nota (0,9 = quase o dobro no fim).
const nota = (freq, dur, { decai = 6, ataque = 0.005, glide = 0 } = {}) => {
  const n = Math.round(dur * TAXA)
  const s = new Float64Array(n)
  let fase = 0
  for (let i = 0; i < n; i++) {
    const t = i / TAXA
    fase += (2 * Math.PI * freq * (1 + glide * (t / dur))) / TAXA
    s[i] = Math.sin(fase) * Math.min(1, t / ataque) * Math.exp(-decai * t)
  }
  return s
}

const silencio = dur => new Float64Array(Math.round(dur * TAXA))

const juntar = (...partes) => {
  const out = new Float64Array(partes.reduce((a, p) => a + p.length, 0))
  let o = 0
  for (const p of partes) {
    out.set(p, o)
    o += p.length
  }
  return out
}

// O WAV de 16 bits, com o pico levado a `volume` do máximo.
const wav = (amostras, volume = 0.6) => {
  const pico = amostras.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1
  const dados = Buffer.alloc(amostras.length * 2)
  amostras.forEach((v, i) => dados.writeInt16LE(Math.round((v / pico) * volume * 32767), i * 2))
  const cab = Buffer.alloc(44)
  cab.write('RIFF', 0)
  cab.writeUInt32LE(36 + dados.length, 4)
  cab.write('WAVE', 8)
  cab.write('fmt ', 12)
  cab.writeUInt32LE(16, 16) // tamanho do bloco fmt
  cab.writeUInt16LE(1, 20) // PCM
  cab.writeUInt16LE(1, 22) // mono
  cab.writeUInt32LE(TAXA, 24)
  cab.writeUInt32LE(TAXA * 2, 28) // bytes por segundo
  cab.writeUInt16LE(2, 32) // bytes por amostra
  cab.writeUInt16LE(16, 34) // bits por amostra
  cab.write('data', 36)
  cab.writeUInt32LE(dados.length, 40)
  return Buffer.concat([cab, dados])
}

const doisTons = () => juntar(nota(880, 0.16, { decai: 10 }), nota(1174.7, 0.4, { decai: 7 }))

const SONS = {
  esperando: juntar(doisTons(), silencio(0.12), doisTons()),
  'nao-visto': nota(700, 0.22, { decai: 14, glide: 0.9 }),
}

for (const [nome, amostras] of Object.entries(SONS)) writeFileSync(`${PASTA}${nome}.wav`, wav(amostras))
console.log(Object.keys(SONS).map(n => `${n}.wav`).join(' '))
