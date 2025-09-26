import { PlayerShape } from '@/model/player'

export type RNG = () => number
export type ParticleBuffer = {
  data: Float32Array
  capacity: number
  fill: (shape: PlayerShape, count: number, rng?: RNG) => Float32Array
}

// Create a particle buffer and a `fill` function (→ direct replacement for getParticlePositions).
export const createParticleBuffer = (maxParticles: number): ParticleBuffer => {
  const data = new Float32Array(maxParticles * 3)
  const capacity = maxParticles

  const fill = (shape: PlayerShape, count: number, rng: RNG = mulberry32(0xc0ffee)) => {
    if (count > capacity) throw new Error(`count (${count}) > capacity (${capacity})`)
    const writer = writers[shape] ?? writeOrbDefault
    for (let i = 0; i < count; i++) writer(data, i, rng)
    return data.subarray(0, count * 3)
  }

  return { data, capacity, fill }
}

// Tiny and very fast PRNG. Good for effects & reproducibility.
export const mulberry32 = (seed: number): RNG => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), a | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// =======================
// Writers
// =======================
type Writer = (buf: Float32Array, i: number, rng: RNG) => void

const writeOrbDefault: Writer = (buf, i, rng) => writeOrb(buf, i, 0.7, rng)

const writers: Record<PlayerShape, Writer> = {
  [PlayerShape.ORB]: (b, i, r) => writeOrb(b, i, 0.7, r),
  [PlayerShape.CUBE]: (b, i, r) => writeCube(b, i, 1.0, r),
  [PlayerShape.CONE]: (b, i, r) => writeCone(b, i, 0.7, 1.2, r),
  [PlayerShape.TORUS]: (b, i, r) => writeTorus(b, i, 0.6, 0.2, r),
  [PlayerShape.TETRAHEDRON]: (b, i, r) => writeTetrahedron(b, i, 0.9, r),
  [PlayerShape.ICOSAHEDRON]: (b, i, r) => writeIcosahedron(b, i, 0.8, r),
} as const

//-----------
// SPHERE (orb)
//-----------
export const writeOrb = (buf: Float32Array, i: number, radius: number, rand: RNG): void => {
  const u = rand() * 2 - 1
  const phi = rand() * 2 * Math.PI
  const r = Math.sqrt(1 - u * u) * radius
  const o = i * 3
  const c = Math.cos(phi),
    s = Math.sin(phi)
  buf[o + 0] = r * c
  buf[o + 1] = r * s
  buf[o + 2] = u * radius
}
// Explanation: uniform sphere param (~8 floats of math), no object creation.

//-----------
// CUBE (surface)
//-----------
export const writeCube = (buf: Float32Array, i: number, size: number, rand: RNG): void => {
  const half = size * 0.5
  const face = (rand() * 6) | 0
  const o = i * 3
  const rx = (rand() - 0.5) * size
  const ry = (rand() - 0.5) * size
  const rz = (rand() - 0.5) * size
  switch (face) {
    case 0:
      buf[o + 0] = rx
      buf[o + 1] = ry
      buf[o + 2] = half
      break
    case 1:
      buf[o + 0] = rx
      buf[o + 1] = ry
      buf[o + 2] = -half
      break
    case 2:
      buf[o + 0] = half
      buf[o + 1] = ry
      buf[o + 2] = rz
      break
    case 3:
      buf[o + 0] = -half
      buf[o + 1] = ry
      buf[o + 2] = rz
      break
    case 4:
      buf[o + 0] = rx
      buf[o + 1] = half
      buf[o + 2] = rz
      break
    default:
      buf[o + 0] = rx
      buf[o + 1] = -half
      buf[o + 2] = rz
      break
  }
}
// Explanation: branch once per particle (can’t avoid if randomizing face), but we hoist and reuse randoms.

//-----------
// CONE (surface)
//-----------
export const writeCone = (buf: Float32Array, i: number, radius: number, height: number, rand: RNG): void => {
  const t = rand()
  const r = radius * t
  const theta = rand() * 2 * Math.PI
  const c = Math.cos(theta),
    s = Math.sin(theta)
  const y = height * 0.5 - t * height
  const o = i * 3
  buf[o + 0] = r * c
  buf[o + 1] = y
  buf[o + 2] = r * s
}
// Explanation: uniform along height parameter t; radial grows with t.

//-----------
// TORUS
//-----------
const TORUS_ROT_A = Math.PI / -30
const TORUS_COS = Math.cos(TORUS_ROT_A)
const TORUS_SIN = Math.sin(TORUS_ROT_A)

export const writeTorus = (buf: Float32Array, i: number, R: number, r: number, rand: RNG): void => {
  const u = rand() * 2 * Math.PI
  const v = rand() * 2 * Math.PI
  const cu = Math.cos(u),
    su = Math.sin(u)
  const cv = Math.cos(v),
    sv = Math.sin(v)

  const x = (R + r * cv) * cu
  const y0 = (R + r * cv) * su
  const z0 = r * sv

  const y = y0 * TORUS_COS - z0 * TORUS_SIN
  const z = y0 * TORUS_SIN + z0 * TORUS_COS

  const o = i * 3
  buf[o + 0] = x
  buf[o + 1] = y
  buf[o + 2] = z
}
// Explanation: hoist rotation cos/sin once; compute trig per angle once and reuse.

//-----------
// TETRAHEDRON (faces)
//-----------
const TETR_VERTS = new Float32Array([1, 1, 1, -1, -1, 1, -1, 1, -1, 1, -1, -1])
export const writeTetrahedron = (buf: Float32Array, i: number, radius: number, rand: RNG): void => {
  const face = (rand() * 4) | 0
  const i1 = face * 3,
    i2 = ((face + 1) & 3) * 3,
    i3 = ((face + 2) & 3) * 3
  let r1 = rand(),
    r2 = rand()
  if (r1 + r2 > 1) {
    r1 = 1 - r1
    r2 = 1 - r2
  }
  const r3 = 1 - r1 - r2
  const s = radius * 0.577
  const o = i * 3
  buf[o + 0] = (TETR_VERTS[i1] * r1 + TETR_VERTS[i2] * r2 + TETR_VERTS[i3] * r3) * s
  buf[o + 1] = (TETR_VERTS[i1 + 1] * r1 + TETR_VERTS[i2 + 1] * r2 + TETR_VERTS[i3 + 1] * r3) * s
  buf[o + 2] = (TETR_VERTS[i1 + 2] * r1 + TETR_VERTS[i2 + 2] * r2 + TETR_VERTS[i3 + 2] * r3) * s
}
// Explanation: vertices in typed array; barycentric inside randomly selected face.

//-----------
// ICOSAHEDRON (edges 70% / faces 30%)
//-----------
const PHI = (1 + Math.sqrt(5)) / 2
const ICO_VERTS = new Float32Array([
  -1,
  PHI,
  0,
  1,
  PHI,
  0,
  -1,
  -PHI,
  0,
  1,
  -PHI,
  0,
  0,
  -1,
  PHI,
  0,
  1,
  PHI,
  0,
  -1,
  -PHI,
  0,
  1,
  -PHI,
  PHI,
  0,
  -1,
  PHI,
  0,
  1,
  -PHI,
  0,
  -1,
  -PHI,
  0,
  1,
])
const ICO_FACES = new Uint8Array([
  0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3,
  2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1,
])
const ICO_EDGES = new Uint8Array([
  0, 1, 0, 5, 0, 7, 0, 10, 0, 11, 1, 5, 1, 7, 1, 8, 1, 9, 2, 3, 2, 4, 2, 6, 2, 10, 2, 11, 3, 4, 3, 6, 3, 8, 3, 9, 4, 5,
  4, 9, 4, 11, 5, 9, 5, 11, 6, 7, 6, 8, 6, 10, 7, 8, 7, 10, 8, 9,
])
const ICO_CIRCUM = Math.sqrt(PHI * Math.sqrt(5)) // ≈ 1.902

export const writeIcosahedron = (buf: Float32Array, i: number, radius: number, rand: RNG): void => {
  if (rand() < 0.7) {
    writeIcosahedronEdge(buf, i, radius, rand)
  } else {
    writeIcosahedronFace(buf, i, radius, rand)
  }
}

export const writeIcosahedronFace = (buf: Float32Array, i: number, radius: number, rand: RNG): void => {
  const faceIndex = ((rand() * 20) | 0) * 3
  const a = ICO_FACES[faceIndex] * 3
  const b = ICO_FACES[faceIndex + 1] * 3
  const c = ICO_FACES[faceIndex + 2] * 3
  let u = rand(),
    v = rand()
  if (u + v > 1) {
    u = 1 - u
    v = 1 - v
  }
  const w = 1 - u - v
  const s = radius / ICO_CIRCUM
  const o = i * 3
  buf[o + 0] = (ICO_VERTS[a] * u + ICO_VERTS[b] * v + ICO_VERTS[c] * w) * s
  buf[o + 1] = (ICO_VERTS[a + 1] * u + ICO_VERTS[b + 1] * v + ICO_VERTS[c + 1] * w) * s
  buf[o + 2] = (ICO_VERTS[a + 2] * u + ICO_VERTS[b + 2] * v + ICO_VERTS[c + 2] * w) * s
}

export const writeIcosahedronEdge = (buf: Float32Array, i: number, radius: number, rand: RNG): void => {
  const ei = ((rand() * (ICO_EDGES.length / 2)) | 0) * 2
  const a = ICO_EDGES[ei] * 3
  const b = ICO_EDGES[ei + 1] * 3
  const t = rand()
  const s = radius / ICO_CIRCUM
  const o = i * 3
  buf[o + 0] = (ICO_VERTS[a] + (ICO_VERTS[b] - ICO_VERTS[a]) * t) * s
  buf[o + 1] = (ICO_VERTS[a + 1] + (ICO_VERTS[b + 1] - ICO_VERTS[a + 1]) * t) * s
  buf[o + 2] = (ICO_VERTS[a + 2] + (ICO_VERTS[b + 2] - ICO_VERTS[a + 2]) * t) * s
}
