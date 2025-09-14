// Player Point fragment shader
uniform float uTime;
uniform float uDamageAmount;

varying float vSeed;
varying vec3 vColor;
varying float vLife;

const float MAX_ALPHA = 0.5;

float random(in float x) {
  return fract(sin(x) * 43758.5453123);
}

void main() {
  // gl_PointCoord is a vec2 containing the coordinates of the fragment within the point being rendered
  float dist = distance(gl_PointCoord, vec2(0.5));
  
  // Create sharp and soft circle variants
  float sharpCircle = 1.0 - step(0.25, dist);
  float softCircle = 1.0 - smoothstep(0.05, 0.5, dist);
  
  // Blend between sharp and soft based on life - more soft as life decreases
  float softness = smoothstep(0.0, 0.8, vLife); // When life is low, softness is high
  float circleAlpha = mix(sharpCircle, softCircle, softness);

  // Life-based alpha fading - full opacity until life < 0.3, then fade to 0
  float lifeFade = smoothstep(0.0, 0.7, vLife);
  
  // Mix color to red based on damage amount
  vec3 damageColor = vec3(1.0, 0.2, 0.1); // Bright red-orange for damage
  vec3 finalColor = mix(vColor, damageColor, uDamageAmount);
  
  float alpha = circleAlpha * MAX_ALPHA * lifeFade;

  gl_FragColor = vec4(finalColor, alpha);
}