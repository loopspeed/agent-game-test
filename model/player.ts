export enum PlayerShape {
  CUBE = 'cube',
  ORB = 'orb',
  ICOSAHEDRON = 'icosahedron',
  TORUS = 'torus',
  CONE = 'cone',
  TETRAHEDRON = 'tetrahedron',
}

export type ShapeSpec = {
  label: string
  scale: number
  colliderRadius: number
}

export const PLAYER_OBJECTS: Record<PlayerShape, ShapeSpec> = {
  [PlayerShape.CUBE]: { label: 'Cube', scale: 1, colliderRadius: 0.7 },
  [PlayerShape.ORB]: { label: 'Orb', scale: 1.1, colliderRadius: 0.77 },
  [PlayerShape.ICOSAHEDRON]: { label: 'Icosahedron', scale: 1.1, colliderRadius: 0.88 },
  [PlayerShape.TORUS]: { label: 'Torus', scale: 1.2, colliderRadius: 0.72 },
  [PlayerShape.CONE]: { label: 'Cone', scale: 1.1, colliderRadius: 0.77 },
  [PlayerShape.TETRAHEDRON]: { label: 'Tetrahedron', scale: 1.0, colliderRadius: 0.9 },
}

export const getPlayerShapes = (): readonly PlayerShape[] => Object.keys(PLAYER_OBJECTS) as PlayerShape[]

export const getShapeIndexByKey = (shape: PlayerShape): number => {
  return Object.keys(PLAYER_OBJECTS).indexOf(shape)
}

export enum PlayerColour {
  BLUE = '#3b82f6',
  TEAL = '#14b8a6',
  PURPLE = '#a855f7',
  PINK = '#ec4899',
  ORANGE = '#f97316',
  YELLOW = '#eab308',
}

export const getColourPalette = (playerColour: PlayerColour): readonly string[] => {
  switch (playerColour) {
    case PlayerColour.TEAL:
      return COLOUR_PALETTES.TEAL
    case PlayerColour.PINK:
      return COLOUR_PALETTES.PINK
    case PlayerColour.ORANGE:
      return COLOUR_PALETTES.ORANGE
    case PlayerColour.YELLOW:
      return COLOUR_PALETTES.YELLOW
    case PlayerColour.BLUE:
      return COLOUR_PALETTES.BLUE
    case PlayerColour.PURPLE:
      return COLOUR_PALETTES.PURPLE
    default:
      return COLOUR_PALETTES.TEAL
  }
}

export const COLOUR_PALETTES = {
  TEAL: [
    '#00fcdf', // 0
    '#00f0d0', // 1
    '#00ffff', // 2
    '#00ffff', // 3
    '#00ecdc', // 4
    '#00ffe2', // 5
    '#00fff5', // 6
    '#00ffff', // 7
    '#00fff1', // 8
    '#00ffff', // 9
    '#00ffff', // 10
    '#00fffa', // 11
    '#00f2d5', // 12
    '#00fff1', // 13
    '#00ffff', // 14
    '#00fff9', // 15
    '#00eec7', // 16
    '#00ffdd', // 17
    '#00fffd', // 18
    '#00fffb', // 19
    '#caeae6', // 20
    '#d6f1f2', // 21
    '#e8f6f5', // 22
    '#d8fcf9', // 23
    '#d9fef4', // 24
    '#d7e6e7', // 25
    '#e4fffc', // 26
    '#d0e8e4', // 27
    '#c1efeb', // 28
    '#d7ffff', // 29
    '#3f918d', // 30
    '#3f8985', // 31
    '#52b1a8', // 32
    '#5ca598', // 33
    '#005b4e', // 34
    '#005449', // 35
    '#5aa39a', // 36
    '#56aaa3', // 37
    '#46978e', // 38
    '#42a99f', // 39
  ],
  PINK: [
    '#ff9fcf', // 0
    '#ffa6d3', // 1
    '#ffadd7', // 2
    '#ffb3db', // 3
    '#ffb9de', // 4
    '#ffc0e2', // 5
    '#ffc6e5', // 6
    '#ffccea', // 7
    '#ffd2ed', // 8
    '#ffd7f0', // 9
    '#ffdcf2', // 10
    '#ffe1f4', // 11
    '#ffe5f6', // 12
    '#ffe9f8', // 13
    '#ffecf9', // 14
    '#fff0fb', // 15
    '#fff3fc', // 16
    '#fff6fd', // 17
    '#fff8fe', // 18
    '#fffbff', // 19
    '#fbd3e8', // 20
    '#f7c6e1', // 21
    '#f3b8da', // 22
    '#efabd3', // 23
    '#eca0ce', // 24
    '#f2b5d7', // 25
    '#f6c3df', // 26
    '#f9d1e7', // 27
    '#fcdfee', // 28
    '#ffe7f4', // 29
    '#ffd1e8', // 30
    '#ffcae4', // 31
    '#ffc3df', // 32
    '#ffbcdb', // 33
    '#ffb5d6', // 34
    '#ffafd2', // 35
    '#ffa9ce', // 36
    '#ffa3ca', // 37
    '#ff9dc6', // 38
    '#ff97c2', // 39
  ],
  ORANGE: [
    '#ffbb8a', // 0
    '#ffc091', // 1
    '#ffc598', // 2
    '#ffca9f', // 3
    '#ffcea6', // 4
    '#ffd3ad', // 5
    '#ffd7b4', // 6
    '#ffdbbb', // 7
    '#ffe0c2', // 8
    '#ffe4c9', // 9
    '#ffe8cf', // 10
    '#ffecd6', // 11
    '#fff0dc', // 12
    '#fff3e2', // 13
    '#fff6e7', // 14
    '#fff8eb', // 15
    '#fffaf0', // 16
    '#fffbf4', // 17
    '#fffdf8', // 18
    '#fffefd', // 19
    '#ffd4ad', // 20
    '#ffcda3', // 21
    '#ffc699', // 22
    '#ffbf8f', // 23
    '#ffb885', // 24
    '#ffcdab', // 25
    '#ffd4b6', // 26
    '#ffdbc1', // 27
    '#ffe2cc', // 28
    '#ffe9d7', // 29
    '#ffe1c7', // 30
    '#ffdbbd', // 31
    '#ffd5b3', // 32
    '#ffcfaa', // 33
    '#ffc9a0', // 34
    '#ffc396', // 35
    '#ffbd8d', // 36
    '#ffb783', // 37
    '#ffb179', // 38
    '#ffab70', // 39
  ],
  YELLOW: [
    '#ffe88a', // 0
    '#ffea92', // 1
    '#ffed99', // 2
    '#fff0a1', // 3
    '#fff2a8', // 4
    '#fff5b0', // 5
    '#fff7b7', // 6
    '#fff9be', // 7
    '#fffbc6', // 8
    '#fffccd', // 9
    '#fffed4', // 10
    '#fffedb', // 11
    '#fffde1', // 12
    '#fffde6', // 13
    '#fffdeb', // 14
    '#fffef0', // 15
    '#fffef4', // 16
    '#fffff7', // 17
    '#fffffa', // 18
    '#ffffff', // 19
    '#ffeaa1', // 20
    '#ffe698', // 21
    '#ffe28f', // 22
    '#ffde86', // 23
    '#ffda7e', // 24
    '#ffefb3', // 25
    '#fff2be', // 26
    '#fff5c8', // 27
    '#fff8d3', // 28
    '#fffadc', // 29
    '#fff0b6', // 30
    '#ffedae', // 31
    '#ffeaa6', // 32
    '#ffe79e', // 33
    '#ffe496', // 34
    '#ffe18e', // 35
    '#ffde86', // 36
    '#ffdb7e', // 37
    '#ffd876', // 38
    '#ffd56f', // 39
  ],
  BLUE: [
    '#8ecbff', // 0
    '#96cfff', // 1
    '#9ed3ff', // 2
    '#a6d7ff', // 3
    '#aedbff', // 4
    '#b6dfff', // 5
    '#bee3ff', // 6
    '#c6e7ff', // 7
    '#ceebff', // 8
    '#d6efff', // 9
    '#def3ff', // 10
    '#e6f7ff', // 11
    '#eefaff', // 12
    '#f2fbff', // 13
    '#f6fcff', // 14
    '#f9fdff', // 15
    '#fbfeff', // 16
    '#ffffff', // 17
    '#f5fbff', // 18
    '#eaf6ff', // 19
    '#dbefff', // 20
    '#d2ebff', // 21
    '#cae7ff', // 22
    '#c1e3ff', // 23
    '#b9dfff', // 24
    '#e0f2ff', // 25
    '#e6f5ff', // 26
    '#ecf8ff', // 27
    '#f1faff', // 28
    '#f7fdff', // 29
    '#a9d4ff', // 30
    '#a1d0ff', // 31
    '#99ccff', // 32
    '#91c8ff', // 33
    '#89c4ff', // 34
    '#81c0ff', // 35
    '#79bcff', // 36
    '#71b8ff', // 37
    '#69b4ff', // 38
    '#61b0ff', // 39
  ],
  PURPLE: [
    '#b347d9', // 0
    '#b84ddc', // 1
    '#bc53df', // 2
    '#c059e2', // 3
    '#c35fe5', // 4
    '#c765e8', // 5
    '#ca6beb', // 6
    '#ce71ee', // 7
    '#d177f1', // 8
    '#d57df4', // 9
    '#d883f7', // 10
    '#db89fa', // 11
    '#df8ffd', // 12
    '#e295ff', // 13
    '#e59bff', // 14
    '#e8a1ff', // 15
    '#eba7ff', // 16
    '#eeadff', // 17
    '#f1b3ff', // 18
    '#f4b9ff', // 19
    '#e5a3f5', // 20
    '#e0a0f2', // 21
    '#db9def', // 22
    '#d69aec', // 23
    '#d197e9', // 24
    '#e2a8f3', // 25
    '#e6aef6', // 26
    '#eab4f9', // 27
    '#eebafc', // 28
    '#f2c0ff', // 29
    '#dfa5f0', // 30
    '#dca2ed', // 31
    '#d99fea', // 32
    '#d69ce7', // 33
    '#d399e4', // 34
    '#d096e1', // 35
    '#cd93de', // 36
    '#ca90db', // 37
    '#c78dd8', // 38
    '#c48ad5', // 39
  ],
}
