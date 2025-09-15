
// Player Particle Position Simulation Fragment Shader
#pragma glslify: rotation3dZ = require(glsl-rotate/rotation-3d-z)

#define delta (1.0 / 60.0)

uniform bool uIsIdle;
uniform float uTime;
uniform float uDamageAmount;
uniform float uTimeMultiplier;

varying vec2 vUv;

// Function to generate a random value from UV coordinates and time
float random(in vec2 uv, in float seed) {
  return fract(sin(dot(uv.xy + seed, vec2(12.9898, 78.233))) * 43758.5453);
}

// Function to generate sphere position
vec3 randomSpherePosition(in vec2 uv, in float seed) {
  float u = random(uv, seed) * 2.0 - 1.0; // random value in [-1, 1]
  float phi = random(uv, seed + 1.0) * 2.0 * 3.14159; // random angle in [0, 2π]
  float radius = 0.25; // const ORB_RADIUS = 0.25 as const
  
  // Convert spherical coordinates to Cartesian coordinates
  float sqrtOneMinusU2 = sqrt(1.0 - u * u);
  float x = sqrtOneMinusU2 * cos(phi) * radius;
  float y = sqrtOneMinusU2 * sin(phi) * radius;
  float z = u * radius;
  
  return vec3(x, y, z);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  
  vec4 tmpPos = texture2D(texturePosition, uv);
  vec3 pos = tmpPos.xyz;
  
  vec4 tmpVel = texture2D(textureVelocity, uv);
  vec3 vel = tmpVel.xyz;
  float life = tmpVel.w;

  if (uIsIdle) {
    // Return current position without changes
    gl_FragColor = vec4(pos, 1.0);
    return;
  }
  
  // Check if this particle was just respawned (life = 1.0 indicates fresh spawn)
  if (life >= 0.999) {
    // Respawn at new random position on sphere
    float seed = random(uv, uTime);
    pos = randomSpherePosition(uv, seed);
  } else {
    // Normal position update with velocity, scaled by time multiplier for slow motion
    pos += vel * delta * uTimeMultiplier;
    // Apply rotation around Z axis for swirling effect, scaled by time multiplier
    // Z rotation
    pos *= rotation3dZ(0.016 * uTimeMultiplier);
  }

  gl_FragColor = vec4(pos, 1.0);
}
