/**
 * 生成应用图标：build/icon.png (256x256) 与 build/icon.ico（内嵌 PNG）。
 * 纯 Node 实现（zlib + 手写 PNG/ICO 编码），无第三方依赖。
 * 设计：Element 蓝(#409EFF)圆角方块 + 白色天平（横梁/立柱/底座/两侧秤盘）。
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const S = 256
const px = new Uint8Array(S * S * 4)

function setPx(x, y, [r, g, b, a = 255]) {
  if (x < 0 || y < 0 || x >= S || y >= S) return
  const i = (y * S + x) * 4
  // 简单 alpha 混合
  const srcA = a / 255
  const dstA = px[i + 3] / 255
  const outA = srcA + dstA * (1 - srcA)
  if (outA <= 0) return
  px[i] = Math.round((r * srcA + px[i] * dstA * (1 - srcA)) / outA)
  px[i + 1] = Math.round((g * srcA + px[i + 1] * dstA * (1 - srcA)) / outA)
  px[i + 2] = Math.round((b * srcA + px[i + 2] * dstA * (1 - srcA)) / outA)
  px[i + 3] = Math.round(outA * 255)
}

function fillRect(x0, y0, w, h, color) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) setPx(x, y, color)
}

function fillCircle(cx, cy, r, color) {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) {
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy <= r * r) setPx(x, y, color)
    }
  }
}

function roundedRect(x0, y0, w, h, r, color) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const dx = Math.max(x0 + r - x, x - (x0 + w - 1 - r), 0)
      const dy = Math.max(y0 + r - y, y - (y0 + h - 1 - r), 0)
      if (dx * dx + dy * dy <= r * r) setPx(x, y, color)
    }
  }
}

/** 粗线段（逐步采样） */
function thickLine(x1, y1, x2, y2, width, color) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 2
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = x1 + (x2 - x1) * t
    const y = y1 + (y2 - y1) * t
    fillCircle(x, y, width / 2, color)
  }
}

const BLUE = [64, 158, 255, 255]
const BLUE_DARK = [53, 137, 220, 255]
const WHITE = [255, 255, 255, 255]

// 背景
roundedRect(8, 8, 240, 240, 52, BLUE)
// 底部微阴影
roundedRect(8, 16, 240, 232, 52, BLUE_DARK)
roundedRect(8, 8, 240, 232, 52, BLUE)

// 天平：横梁
fillRect(52, 92, 152, 10, WHITE)
// 立柱
fillRect(123, 92, 10, 76, WHITE)
// 底座
fillRect(92, 168, 72, 10, WHITE)
fillRect(102, 178, 52, 8, WHITE)
// 顶部提钮
fillCircle(128, 92, 8, WHITE)
// 吊绳
thickLine(72, 102, 60, 134, 4, WHITE)
thickLine(184, 102, 196, 134, 4, WHITE)
// 秤盘
fillCircle(60, 146, 17, WHITE)
fillCircle(196, 146, 17, WHITE)
fillCircle(60, 146, 9, BLUE)
fillCircle(196, 146, 9, BLUE)
// 横梁两端小圆点
fillCircle(57, 97, 5, WHITE)
fillCircle(199, 97, 5, WHITE)

/* ---------- PNG 编码 ---------- */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(pixels, size) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter: none
    Buffer.from(pixels.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1)
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

/* ---------- ICO 封装（内嵌 PNG，Vista+ 支持） ---------- */

function wrapIco(png) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2) // icon
  header.writeUInt16LE(1, 4) // count
  const entry = Buffer.alloc(16)
  entry[0] = 0 // width 256
  entry[1] = 0 // height 256
  entry[2] = 0
  entry[3] = 0
  entry.writeUInt16LE(1, 4) // planes
  entry.writeUInt16LE(32, 6) // bpp
  entry.writeUInt32LE(png.length, 8)
  entry.writeUInt32LE(22, 12) // offset
  return Buffer.concat([header, entry, png])
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'build')
mkdirSync(outDir, { recursive: true })
const png = encodePng(px, S)
writeFileSync(join(outDir, 'icon.png'), png)
writeFileSync(join(outDir, 'icon.ico'), wrapIco(png))
console.log(`icons written: ${join(outDir, 'icon.png')} (${png.length} bytes) + icon.ico`)
