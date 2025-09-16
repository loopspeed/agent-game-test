// Basic vertex shader for tunnel geometry
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vPosition = worldPosition.xyz;
  vec4 viewPosition = viewMatrix * worldPosition;
  gl_Position = projectionMatrix * viewPosition;
}
