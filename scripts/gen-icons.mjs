// Generates PWA PNG icons from public/app-icon.svg using sharp.
// Run: node scripts/gen-icons.mjs
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const src = readFileSync(resolve(root, 'public/app-icon.svg'))

const outputs = [
  { file: 'pwa-192x192.png', size: 192 },
  { file: 'pwa-512x512.png', size: 512 },
  { file: 'pwa-maskable-512x512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
]

for (const { file, size } of outputs) {
  await sharp(src, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(resolve(root, 'public', file))
  console.log(`generated public/${file} (${size}x${size})`)
}
