precision highp float;

uniform float uTime;
uniform float uNoiseScale;
uniform float uNoiseAmp;

varying vec2 vXZ;

void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vXZ = worldPosition.xz;
    
    // Keep terrain flat for hex grid alignment
    vec3 finalPosition = position;
    
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(finalPosition, 1.0);
}