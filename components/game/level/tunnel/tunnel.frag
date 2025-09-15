// Fragment shader for the tunnel walls with seamless noise and color palette
#pragma glslify: noise = require('glsl-noise/simplex/3d')

uniform float uTime;
uniform float uAspect;
uniform float uRayPositions[16]; // MAX_RAYS * 2 (x, y pairs)
uniform float uRayData[16]; // MAX_RAYS * 2 (spawnTime, isActive pairs)
uniform int uMaxRays;
uniform float uRayLifetime;

varying vec2 vUv;
varying vec3 vPosition;

// Color palette function
vec3 palette(in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

// Function to calculate ray contribution
float calculateRayContribution(vec3 worldPos, float rayStartX, float rayStartY, float spawnTime, float isActive) {
  if (isActive < 0.5) return 0.0;
  
  float rayAge = uTime - spawnTime;
  if (rayAge < 0.0 || rayAge > uRayLifetime) return 0.0; // Use uniform instead of hardcoded value
  
  // Calculate ray center position as it travels towards the player (positive Z direction)
  float raySpeed = 12.0; // RAY_SPEED = 8.0
  float rayCurrentZ = -40.0 + rayAge * raySpeed; // Start from far back, move towards player
  
  // ========== RAY START POSITION EXPLANATION ==========
  // rayStartX and rayStartY define the "anchor point" of the ray on the tunnel circumference
  // These coordinates are generated when a ray spawns in the CPU code:
  //   - A random angle (0 to 2π) is generated: angle = Math.random() * Math.PI * 2
  //   - The X position is calculated as: Math.cos(angle) * radius 
  //   - The Y position is calculated as: Math.sin(angle) * radius
  // This places the ray at a random point around the circular tunnel cross-section
  //
  // Think of rayStartX, rayStartY as the ray's "home position" in the XY plane
  // The ray maintains this XY position as its base, but we add noise distortion to make it wavy
  
  // Add noise distortion to make ray wavy along its length
  float zNormalized = (worldPos.z + 40.0) / 80.0; // Normalize Z position along tunnel
  vec3 noiseInput = vec3(rayStartX * 0.4, rayStartY * 0.4, zNormalized * 16.0 + uTime * 0.24);
  
  // Add multiple octaves of noise for more complex waviness
  vec2 distortion = vec2(
    noise(noiseInput),
    noise(noiseInput  + vec3(100.0, 0.0, 0.0))
  );
  
  // ========== RAY POSITION CALCULATION ==========
  // distortedRayPos = the ray's actual position at this Z depth
  // We start with the base rayStartX, rayStartY position, then add noise-based distortion
  // This creates a wavy line that oscillates around the original spawn point
  // The distortion varies based on Z position, creating the wavy effect along the ray's length
  vec2 distortedRayPos = vec2(rayStartX, rayStartY) + distortion;
  
  // Calculate distance from current fragment to the ray
  vec2 fragmentPos = vec2(worldPos.x, worldPos.y);
  float distanceToRay = length(fragmentPos - distortedRayPos);
  
  // Make rays much longer along Z - they should span the entire visible tunnel length
  float rayLength = 30.0; // Length of ray along Z axis
  float rayFrontZ = rayCurrentZ + rayLength * 0.5;
  float rayBackZ = rayCurrentZ - rayLength * 0.5;
  
  // Check if current fragment Z is within the ray's Z range
  if (worldPos.z < rayBackZ || worldPos.z > rayFrontZ) return 0.0;
  
  // Create multiple layers of varying softness
  float totalIntensity = 0.0;
  
  // Layer 1: Very soft outer glow
  float verysoftThickness = 2.4;
  float verysoftIntensity = 1.0 - smoothstep(0.0, verysoftThickness, distanceToRay);
  totalIntensity += verysoftIntensity * 0.12;
  
  // Layer 2: Soft middle layer
  float softThickness = 1.6;
  float softIntensity = 1.0 - smoothstep(0.0, softThickness, distanceToRay);
  totalIntensity += softIntensity * 0.32;
  
  // Layer 3: Medium layer
  float mediumThickness = 0.8;
  float mediumIntensity = 1.0 - smoothstep(0.0, mediumThickness, distanceToRay);
  totalIntensity += mediumIntensity * 0.4;
  
  // Layer 4: Sharp core
  float sharpThickness = 0.4;
  float sharpIntensity = 1.0 - smoothstep(0.0, sharpThickness, distanceToRay);
  totalIntensity += sharpIntensity * 0.9;
  
  // ========== RAY LIFETIME FADE ==========
  // lifeFade controls how the ray fades out as it approaches the end of its lifetime
  // rayAge ranges from 0 (just spawned) to uRayLifetime (maximum lifetime before despawn)
  // smoothstep creates a smooth transition in the final 1 second of the ray's life
  // When rayAge < (uRayLifetime - 1.0): smoothstep returns 0, so lifeFade = 1.0 - 0 = 1.0 (full intensity)
  // When rayAge = (uRayLifetime - 0.5): smoothstep returns 0.5, so lifeFade = 1.0 - 0.5 = 0.5 (half intensity)
  // When rayAge >= uRayLifetime: smoothstep returns 1, so lifeFade = 1.0 - 1 = 0.0 (completely faded)
  // This creates a graceful fade-out in the final second of the ray's life
  float lifeFade = 1.0 - smoothstep(uRayLifetime - 1.0, uRayLifetime, rayAge);
  
  // ========== RAY LENGTH FADE ==========
  // zFade controls how the ray fades towards its front and back ends along the Z-axis
  // rayCurrentZ is the center position of the ray as it travels down the tunnel
  // zDistanceFromCenter = how far this fragment is from the ray's center along Z
  // rayLength = 30.0, so the ray spans from (center - 15) to (center + 15) in Z
  // 
  // smoothstep(rayLength * 0.3, rayLength * 0.5, zDistanceFromCenter) breakdown:
  // - rayLength * 0.3 = 9.0 units from center (fade starts here)
  // - rayLength * 0.5 = 15.0 units from center (completely faded here)
  // 
  // When zDistanceFromCenter < 9.0: smoothstep returns 0, so zFade = 1.0 - 0 = 1.0 (full intensity)
  // When zDistanceFromCenter = 12.0: smoothstep returns 0.5, so zFade = 1.0 - 0.5 = 0.5 (half intensity)
  // When zDistanceFromCenter >= 15.0: smoothstep returns 1, so zFade = 1.0 - 1 = 0.0 (no contribution)
  // 
  // This creates rays that are brightest at their center and gradually fade towards their ends,
  // preventing hard cutoffs and creating a more natural "energy beam" appearance
  float zDistanceFromCenter = abs(worldPos.z - rayCurrentZ);
  float zFade = 1.0 - smoothstep(rayLength * 0.3, rayLength * 0.5, zDistanceFromCenter);
  
  return totalIntensity * lifeFade * zFade;
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

  // Speed at which the environment (tunnel walls) appears to move
  float zSpeed = uTime * 0.24;
  
  // Combine with Z coordinate for noise
  vec3 colourNoiseInput = vec3(seamlessCoords * 1.6, vPosition.z * 0.06 - zSpeed);
  float colourInput = noise(colourNoiseInput) * 0.5 + 0.5;

  // Getting these values from this site: http://dev.thi.ng/gradients/
  // [[0.000 0.500 0.500] [0.000 0.500 0.500] [0.000 0.500 0.333] [0.000 0.500 0.667]]
  vec3 color = palette(colourInput, vec3(0.0, 0.5, 0.5), vec3(0.0, 0.5, 0.5), vec3(0.0, 0.5, 0.333), vec3(0.0, 0.5, 0.667));
    
  // Apply grainy noise
  vec3 grainNoiseInput = vec3(vUv * 800.0, -uTime * 2.0);
  float grain = noise(grainNoiseInput) * 0.5 + 0.5;
  vec3 grainColor = vec3(grain * 0.08); // Subtle white grain
  color += grainColor;

  // Add aura rays
  float totalRayContribution = 0.0;
  for (int i = 0; i < 8; i++) { // uMaxRays would be better but causes issues in some WebGL implementations
    if (i >= uMaxRays) break;
    
    // ========== RAY DATA EXTRACTION ==========
    // Extract ray parameters from uniform arrays sent from CPU
    // uRayPositions is a flat array storing [x0, y0, x1, y1, x2, y2, ...] for each ray
    // So ray i has its X coordinate at index [i * 2] and Y coordinate at [i * 2 + 1]
    float rayStartX = uRayPositions[i * 2];     // X position on tunnel circumference where ray spawns
    float rayStartY = uRayPositions[i * 2 + 1]; // Y position on tunnel circumference where ray spawns
    
    // uRayData stores [spawnTime0, isActive0, spawnTime1, isActive1, ...] for each ray
    float spawnTime = uRayData[i * 2];     // When this ray was created (in game time)
    float isActive = uRayData[i * 2 + 1];  // Whether this ray slot is currently being used (1.0 = active, 0.0 = inactive)
    
    totalRayContribution += calculateRayContribution(vPosition, rayStartX, rayStartY, spawnTime, isActive);
  }
  // Apply ray glow with cyan/electric color
  vec3 rayColor = vec3(0.2, 0.8, 1.0); // Cyan-ish color
  color += rayColor * totalRayContribution;


    // Fade to black as we go further down the tunnel (based on z position)
  float blackFade = smoothstep(-10.0, -40.0, vPosition.z);
  color *= (1.0 - blackFade);

  color *= 0.5; // Darken overall


  gl_FragColor = vec4(color, 1.0);
}