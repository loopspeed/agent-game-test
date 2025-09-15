// Fragment shader for the tunnel walls with seamless noise and color palette
#pragma glslify: noise = require('glsl-noise/simplex/3d')

uniform float uTime;
uniform float uAspect;
varying vec2 vUv;
varying vec3 vPosition;

// Color palette function
vec3 palette(in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  // Use trigonometric approach to avoid atan discontinuity
  // Since the cylinder is rotated 90 degrees, Y and X are the radial components
  float radius = length(vec2(vPosition.x, vPosition.y));
  
  // Use sin/cos to create seamless coordinates
  float angle = atan(vPosition.y, vPosition.x);
  vec2 seamlessCoords = vec2(
    sin(angle) * 0.5 + 0.5, // Maps to 0-1 seamlessly
    cos(angle) * 0.5 + 0.5  // Maps to 0-1 seamlessly
  );
  
  // Combine with Z coordinate for noise
  vec3 noiseCoords = vec3(seamlessCoords * 1.6, vPosition.z * 0.08 - uTime * 0.24);
  
  float colourInput = noise(noiseCoords) * 0.5 + 0.5;

  // Getting these values from this site: http://dev.thi.ng/gradients/
  // [[0.000 0.500 0.500] [0.000 0.500 0.500] [0.000 0.500 0.333] [0.000 0.500 0.667]]
  vec3 color = palette(colourInput, vec3(0.0, 0.5, 0.5), vec3(0.0, 0.5, 0.5), vec3(0.0, 0.5, 0.333), vec3(0.0, 0.5, 0.667));
    
  // Apply grainy noise
  vec3 grainNoiseInput = vec3(vUv * 800.0, -uTime * 2.0);
  float grain = noise(grainNoiseInput) * 0.5 + 0.5;
  vec3 grainColor = vec3(grain * 0.08); // Subtle white grain
  color += grainColor;

  // Fade to black as we go further down the tunnel (based on z position)
  float blackFade = smoothstep(-10.0, -40.0, vPosition.z);
  color *= (1.0 - blackFade);

  color *= 0.5; // Darken overall

  gl_FragColor = vec4(color, 1.0);
}