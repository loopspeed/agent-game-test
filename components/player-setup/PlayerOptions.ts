import { PlayerShape } from '@/model/player'

// -------------
// Particle positions based on object shapes
// -------------
type ParticlePosition = {
  x: number
  y: number
  z: number
}

export const getParticlePositions = (shape: PlayerShape): ParticlePosition => {
  switch (shape) {
    case PlayerShape.ORB:
      return generateOrb(0.7)
    case PlayerShape.CUBE:
      return generateCube(1.0)
    case PlayerShape.CONE:
      return generateCone(0.7, 1.2)
    case PlayerShape.TORUS:
      return generateTorus(0.6, 0.2)
    case PlayerShape.TETRAHEDRON:
      return generateTetrahedron(0.9)
    case PlayerShape.ICOSAHEDRON:
      return generateIcosahedron(0.8)
    default:
      return generateOrb(0.7)
  }
}

//-----------
// SPHERE
//-----------
const generateOrb = (radius: number): ParticlePosition => {
  // Generate random position on sphere (radius 0.3, similar to player size)
  const u = Math.random() * 2 - 1 // random value in [-1, 1]
  const phi = Math.random() * 2 * Math.PI // random angle in [0, 2π]

  // Convert spherical coordinates to Cartesian coordinates
  const sqrtOneMinusU2 = Math.sqrt(1 - u * u)

  return {
    x: sqrtOneMinusU2 * Math.cos(phi) * radius,
    y: sqrtOneMinusU2 * Math.sin(phi) * radius,
    z: u * radius,
  }
}

//-----------
// CUBE
//-----------
const generateCube = (size: number): ParticlePosition => {
  const halfSize = size * 0.5
  const face = Math.floor(Math.random() * 6)

  switch (face) {
    case 0: // front face
      return {
        x: (Math.random() - 0.5) * size,
        y: (Math.random() - 0.5) * size,
        z: halfSize,
      }
    case 1: // back face
      return {
        x: (Math.random() - 0.5) * size,
        y: (Math.random() - 0.5) * size,
        z: -halfSize,
      }
    case 2: // right face
      return {
        x: halfSize,
        y: (Math.random() - 0.5) * size,
        z: (Math.random() - 0.5) * size,
      }
    case 3: // left face
      return {
        x: -halfSize,
        y: (Math.random() - 0.5) * size,
        z: (Math.random() - 0.5) * size,
      }
    case 4: // top face
      return {
        x: (Math.random() - 0.5) * size,
        y: halfSize,
        z: (Math.random() - 0.5) * size,
      }
    default: // bottom face
      return {
        x: (Math.random() - 0.5) * size,
        y: -halfSize,
        z: (Math.random() - 0.5) * size,
      }
  }
}

//-----------
// CONE
//-----------
const generateCone = (radius: number, height: number): ParticlePosition => {
  // Generate particles on the surface of the cone
  const normalizedHeight = Math.random() // 0 to 1 from tip to base
  const currentRadius = radius * normalizedHeight // Radius increases from tip to base
  const theta = Math.random() * 2 * Math.PI
  const yPosition = height * 0.5 - normalizedHeight * height // From +height/2 (tip) to -height/2 (base)

  return {
    x: Math.cos(theta) * currentRadius,
    y: yPosition,
    z: Math.sin(theta) * currentRadius,
  }
}

//-----------
// TORUS
//-----------
const generateTorus = (majorRadius: number, minorRadius: number): ParticlePosition => {
  const u = Math.random() * 2 * Math.PI
  const v = Math.random() * 2 * Math.PI

  // Generate standard torus position
  const standardX = (majorRadius + minorRadius * Math.cos(v)) * Math.cos(u)
  const standardY = (majorRadius + minorRadius * Math.cos(v)) * Math.sin(u)
  const standardZ = minorRadius * Math.sin(v)

  // Apply exact rotation from TorusShape: [Math.PI / -150, 0, 0]
  const rotationAngle = Math.PI / -150
  const cosAngle = Math.cos(rotationAngle)
  const sinAngle = Math.sin(rotationAngle)

  return {
    x: standardX,
    y: standardY * cosAngle - standardZ * sinAngle,
    z: standardY * sinAngle + standardZ * cosAngle,
  }
}

//-----------
// TETRAHEDRON
//-----------
const generateTetrahedron = (radius: number): ParticlePosition => {
  const tetrahedronVertices = [
    { x: 1, y: 1, z: 1 },
    { x: -1, y: -1, z: 1 },
    { x: -1, y: 1, z: -1 },
    { x: 1, y: -1, z: -1 },
  ]

  const face = Math.floor(Math.random() * 4)
  const v1 = tetrahedronVertices[face]
  const v2 = tetrahedronVertices[(face + 1) % 4]
  const v3 = tetrahedronVertices[(face + 2) % 4]

  let r1 = Math.random()
  let r2 = Math.random()
  if (r1 + r2 > 1) {
    r1 = 1 - r1
    r2 = 1 - r2
  }
  const r3 = 1 - r1 - r2

  const scaleFactor = radius * 0.577

  return {
    x: (v1.x * r1 + v2.x * r2 + v3.x * r3) * scaleFactor,
    y: (v1.y * r1 + v2.y * r2 + v3.y * r3) * scaleFactor,
    z: (v1.z * r1 + v2.z * r2 + v3.z * r3) * scaleFactor,
  }
}

//-----------
// ISOCAHEDRON
//-----------
const generateIcosahedron = (radius: number): ParticlePosition => {
  // Weighted distribution: 70% edges, 30% faces for prominent shape definition
  const distributionType = Math.random()

  if (distributionType < 0.7) {
    // Generate on edges (70% of particles)
    return generateIcosahedronEdge(radius)
  } else {
    // Generate on faces (30% of particles)
    return generateIcosahedronFlatFace(radius)
  }
}

const generateIcosahedronFlatFace = (radius: number): ParticlePosition => {
  const faceIndex = Math.floor(Math.random() * ICOSAHEDRON_FACE_COUNT)
  const face = ICOSAHEDRON_FACES[faceIndex]

  // Get the three vertices of this triangular face
  const v1 = ICOSAHEDRON_VERTICES[face[0]]
  const v2 = ICOSAHEDRON_VERTICES[face[1]]
  const v3 = ICOSAHEDRON_VERTICES[face[2]]

  // Generate random barycentric coordinates for uniform distribution on triangle
  let u = Math.random()
  let v = Math.random()

  // Ensure the point lies within the triangle
  if (u + v > 1) {
    u = 1 - u
    v = 1 - v
  }

  const w = 1 - u - v

  // Calculate the exact position on the flat triangle face
  const facePosition = {
    x: v1.x * u + v2.x * v + v3.x * w,
    y: v1.y * u + v2.y * v + v3.y * w,
    z: v1.z * u + v2.z * v + v3.z * w,
  }

  // Scale the entire icosahedron to the desired radius
  const scaleFactor = radius / ICOSAHEDRON_CIRCUMRADIUS

  return {
    x: facePosition.x * scaleFactor,
    y: facePosition.y * scaleFactor,
    z: facePosition.z * scaleFactor,
  }
}

const generateIcosahedronEdge = (radius: number): ParticlePosition => {
  // Choose a random edge from all icosahedron edges
  const edgeIndex = Math.floor(Math.random() * ICOSAHEDRON_EDGES.length)
  const edge = ICOSAHEDRON_EDGES[edgeIndex]

  // Get the two vertices that define this edge
  const v1 = ICOSAHEDRON_VERTICES[edge[0]]
  const v2 = ICOSAHEDRON_VERTICES[edge[1]]

  // Generate a random point along the edge
  const t = Math.random()

  const edgePosition = {
    x: v1.x + (v2.x - v1.x) * t,
    y: v1.y + (v2.y - v1.y) * t,
    z: v1.z + (v2.z - v1.z) * t,
  }

  // Scale to desired radius while maintaining flat faces
  const scaleFactor = radius / ICOSAHEDRON_CIRCUMRADIUS

  return {
    x: edgePosition.x * scaleFactor,
    y: edgePosition.y * scaleFactor,
    z: edgePosition.z * scaleFactor,
  }
}

// Golden ratio constant
const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2
const ICOSAHEDRON_CIRCUMRADIUS = Math.sqrt(GOLDEN_RATIO * Math.sqrt(5)) // ≈ 1.902

// Icosahedron vertices based on Three.js IcosahedronGeometry
const ICOSAHEDRON_VERTICES = [
  { x: -1, y: GOLDEN_RATIO, z: 0 },
  { x: 1, y: GOLDEN_RATIO, z: 0 },
  { x: -1, y: -GOLDEN_RATIO, z: 0 },
  { x: 1, y: -GOLDEN_RATIO, z: 0 },
  { x: 0, y: -1, z: GOLDEN_RATIO },
  { x: 0, y: 1, z: GOLDEN_RATIO },
  { x: 0, y: -1, z: -GOLDEN_RATIO },
  { x: 0, y: 1, z: -GOLDEN_RATIO },
  { x: GOLDEN_RATIO, y: 0, z: -1 },
  { x: GOLDEN_RATIO, y: 0, z: 1 },
  { x: -GOLDEN_RATIO, y: 0, z: -1 },
  { x: -GOLDEN_RATIO, y: 0, z: 1 },
] as const

const ICOSAHEDRON_FACE_COUNT = 20

// 20 triangular faces of the icosahedron
const ICOSAHEDRON_FACES = [
  [0, 11, 5],
  [0, 5, 1],
  [0, 1, 7],
  [0, 7, 10],
  [0, 10, 11],
  [1, 5, 9],
  [5, 11, 4],
  [11, 10, 2],
  [10, 7, 6],
  [7, 1, 8],
  [3, 9, 4],
  [3, 4, 2],
  [3, 2, 6],
  [3, 6, 8],
  [3, 8, 9],
  [4, 9, 5],
  [2, 4, 11],
  [6, 2, 10],
  [8, 6, 7],
  [9, 8, 1],
] as const

const ICOSAHEDRON_EDGES = [
  // Edges from vertex 0
  [0, 1],
  [0, 5],
  [0, 7],
  [0, 10],
  [0, 11],
  // Edges from vertex 1 (not already listed)
  [1, 5],
  [1, 7],
  [1, 8],
  [1, 9],
  // Edges from vertex 2
  [2, 3],
  [2, 4],
  [2, 6],
  [2, 10],
  [2, 11],
  // Edges from vertex 3 (not already listed)
  [3, 4],
  [3, 6],
  [3, 8],
  [3, 9],
  // Edges from vertex 4 (not already listed)
  [4, 5],
  [4, 9],
  [4, 11],
  // Edges from vertex 5 (not already listed)
  [5, 9],
  [5, 11],
  // Edges from vertex 6 (not already listed)
  [6, 7],
  [6, 8],
  [6, 10],
  // Edges from vertex 7 (not already listed)
  [7, 8],
  [7, 10],
  // Edges from vertex 8 (not already listed)
  [8, 9],
] as const
