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
  float circleAlpha = 1.0 - step(0.25, distance(gl_PointCoord, vec2(0.25)));

  // Life-based alpha fading - full opacity until life < 0.3, then fade to 0
  float lifeFade = smoothstep(0.0, 0.7, vLife);
  
  // Mix color to red based on damage amount
  vec3 damageColor = vec3(1.0, 0.2, 0.1); // Bright red-orange for damage
  vec3 finalColor = mix(vColor, damageColor, uDamageAmount);
  
  float alpha = circleAlpha * MAX_ALPHA * lifeFade;

  gl_FragColor = vec4(finalColor, alpha);
}