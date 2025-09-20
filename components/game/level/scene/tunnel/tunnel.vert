// Basic vertex shader for tunnel geometry
#pragma glslify: noise = require('glsl-noise/simplex/3d')

uniform float uTime;
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vPosition = worldPosition.xyz;
  vec4 viewPosition = viewMatrix * worldPosition;

  vec4 projectionPosition = projectionMatrix * viewPosition;
  // Add some noise to the vertex position for a non-uniform effect
  float displacement = noise(vPosition * 0.5 + vec3(0.0, 0.0, uTime * 0.25));
  projectionPosition.y += displacement;

  gl_Position = projectionPosition;
}
