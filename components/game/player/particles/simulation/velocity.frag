#pragma glslify: noise = require('glsl-noise/simplex/3d')

uniform bool uIsIdle;
uniform float uTime;
uniform float uDamageAmount;
uniform sampler2D uSeedTexture;
uniform vec2 uPlayerVelocity;
uniform float uTimeMultiplier;

#define delta (1.0 / 60.0)

varying vec2 vUv;

const vec3 flyingForce = vec3(0.0, 0.0, 1.6); // Fast movement toward camera

// Function to generate a random value from UV coordinates and time
float random(vec2 uv, float seed) {
  return fract(sin(dot(uv.xy + seed, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  
  vec4 tmpPos = texture2D(texturePosition, uv);
  vec3 pos = tmpPos.xyz;
  
  vec4 tmpVel = texture2D(textureVelocity, uv);
  vec3 vel = tmpVel.xyz;
  float life = tmpVel.w;
  
  // Sample the seed for this particle
  float seed = texture2D(uSeedTexture, uv).r;

  float speedMultiplier = smoothstep(0.3, 1.0, seed); // 30% of particles are not moving, rest scale up to full speed

  if (uIsIdle) {
    // Return current velocity but apply slight damping to eventually stop
    vel *= 0.96;
    gl_FragColor = vec4(vel, life);
    return;
  }

  // Use seed to vary life decay rate - some particles live longer than others
  // Time multiplier affects decay rate - slower when in slow motion
  float lifeDecayRate = (0.1 + seed * 0.5) * uTimeMultiplier; // Decay rate from 0.1x to 0.6x based on seed, scaled by time
  life -= delta * lifeDecayRate;
  
  // Check if particle should respawn
  if (life <= 0.0) {
    // Always spawn with life = 1.0 for consistent respawn detection
    life = 1.0;
    // Reset velocity for respawned particle with initial momentum
    vel = vec3(
      (random(uv, seed + 20.0) - 0.5) * 0.5 * speedMultiplier, // Small X variation
      (random(uv, seed + 30.0) - 0.5) * 0.5 * speedMultiplier, // Small Y variation
      (2.0 + random(uv, seed + 40.0) * 1.0) * speedMultiplier  // Initial movement toward camera (positive Z)
    );
    
    // Note: Position will be reset in the position shader when it detects life was reset
  } else {    
    // Strong movement toward camera (positive Z) - scaled by speed multiplier and time
    vec3 scaledFlyingForce = flyingForce * speedMultiplier * uTimeMultiplier;

    // When damaged, add explosive force and increase overall movement
    float damageForceMultiplier = uDamageAmount * 3.0 * speedMultiplier;
    vec3 damageExplosion = normalize(pos) * damageForceMultiplier;
    
    // Subtle noise influence for natural movement - also scaled and more chaotic when damaged
    // Use time multiplier for consistent slow motion effect
    float timeScaled = uTime * uTimeMultiplier;
    vec3 noiseForce = vec3(
      noise(pos * 1.5 + timeScaled * 0.2),
      noise(pos * 1.5 + timeScaled * 0.2 + 100.0),
      noise(pos * 0.8 + timeScaled * 0.2 + 200.0)
    );

    float noiseMultiplier = 0.5 * (1.0 + uDamageAmount * 2.0);
    noiseForce *= noiseMultiplier;

    // Slight radial expansion from sphere center - also scaled
    vec3 radialForce = normalize(pos) * 1.4 * speedMultiplier;
    
    // Player movement influence - creates "wave" effect in the particle tail
    // Older particles (lower life) get more influence from player movement - creates tail wave
    float playerInfluence = (1.0 - life) * 6.0;
    vec3 playerForce = vec3(-uPlayerVelocity.x, -uPlayerVelocity.y, 0.0) * playerInfluence * speedMultiplier;
    
    // Combine forces - all scaled by the particle's speed multiplier and damage effects
    vec3 force = scaledFlyingForce + radialForce + noiseForce + damageExplosion + playerForce;
    
    // Update velocity with damping that varies based on speed
    // Slower particles get more damping, faster particles get less
    // When damaged, reduce damping for more energetic movement
    float dampingFactor = mix(0.5, 0.98, seed);
    vel += force * delta;
    vel *= dampingFactor;
  }
  
  gl_FragColor = vec4(vel, life);
}
