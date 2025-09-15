// Fragment shader for the tunnel walls with seamless noise and color palette
#pragma glslify: noise = require('glsl-noise/simplex/3d')

uniform float uTime;
uniform float uAspect;
uniform float uRayPositions[24]; // MAX_RAYS * 2 (x, y pairs)
uniform float uRayTimes[36]; // MAX_RAYS * 3 (spawnTime, lifetime, isActive triplets)
uniform float uRayColors[36]; // MAX_RAYS * 3 (RGB values)
uniform int uMaxRays;

varying vec2 vUv;
varying vec3 vPosition;

// Color palette function
vec3 palette(in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

// Function to calculate ray contribution
float calculateRayContribution(vec3 worldPos, float rayStartX, float rayStartY, float spawnTime, float rayLifetime, float isActive) {
  if (isActive < 0.5) return 0.0;
  
  float rayAge = uTime - spawnTime;
  if (rayAge < 0.0 || rayAge > rayLifetime) return 0.0; // Use individual ray lifetime
  
  // Calculate ray center position as it travels towards the player (positive Z direction)
  float raySpeed = 12.0; // RAY_SPEED = 12.0
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
  vec3 noiseInput = vec3(rayStartX * 4.0, rayStartY * 1.8, zNormalized * 8.0 + uTime * 0.24);
  
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
  float rayLength = 32.0; // Length of ray along Z axis
  float rayFrontZ = rayCurrentZ + rayLength * 0.5;
  float rayBackZ = rayCurrentZ - rayLength * 0.5;
  
  // Check if current fragment Z is within the ray's Z range
  if (worldPos.z < rayBackZ || worldPos.z > rayFrontZ) return 0.0;
  
  // Create multiple layers of varying softness with slight positional variations
  float totalIntensity = 0.0;
  
  // Layer 1: Very soft outer glow with slight offset
  float layer1Noise = noise(noiseInput + vec3(10.0, 0.0, 0.0));
  vec2 layer1Offset = vec2(layer1Noise, layer1Noise * 0.7) * 0.15; // Use same noise, slight variation for Y
  vec2 layer1RayPos = distortedRayPos + layer1Offset;
  float layer1Distance = length(fragmentPos - layer1RayPos);
  float verysoftThickness = 3.0;
  float verysoftIntensity = 1.0 - smoothstep(0.0, verysoftThickness, layer1Distance);
  totalIntensity += verysoftIntensity * 0.24;
  
  // Layer 2: Soft middle layer with different offset
  float layer2Noise = noise(noiseInput + vec3(20.0, 0.0, 0.0));
  vec2 layer2Offset = vec2(layer2Noise, layer2Noise * 0.5) * 0.1; // Use same noise, different Y multiplier
  vec2 layer2RayPos = distortedRayPos + layer2Offset;
  float layer2Distance = length(fragmentPos - layer2RayPos);
  float softThickness = 1.4;
  float softIntensity = 1.0 - smoothstep(0.0, softThickness, layer2Distance);
  totalIntensity += softIntensity * 0.3;
  
  // Layer 3: Medium layer with smaller offset
  float layer3Noise = noise(noiseInput + vec3(30.0, 0.0, 0.0));
  vec2 layer3Offset = vec2(layer3Noise, layer3Noise * 0.3) * 0.06; // Use same noise, even smaller Y variation
  vec2 layer3RayPos = distortedRayPos + layer3Offset;
  float layer3Distance = length(fragmentPos - layer3RayPos);
  float mediumThickness = 0.6;
  float mediumIntensity = 1.0 - smoothstep(0.0, mediumThickness, layer3Distance);
  totalIntensity += mediumIntensity * 0.6;
  
  // Layer 4: Sharp core (uses original distortedRayPos, no additional offset)
  float coreDistance = length(fragmentPos - distortedRayPos);
  float sharpThickness = 0.2;
  float sharpIntensity = 1.0 - smoothstep(0.0, sharpThickness, coreDistance);
  totalIntensity += sharpIntensity * 0.8;
  
  // ========== RAY LIFETIME FADE ==========
  // lifeFade controls how the ray fades out as it approaches the end of its lifetime
  // rayAge ranges from 0 (just spawned) to rayLifetime (individual ray's maximum lifetime)
  // smoothstep creates a smooth transition in the final 1 second of the ray's life
  // When rayAge < (rayLifetime - 1.0): smoothstep returns 0, so lifeFade = 1.0 - 0 = 1.0 (full intensity)
  // When rayAge = (rayLifetime - 0.5): smoothstep returns 0.5, so lifeFade = 1.0 - 0.5 = 0.5 (half intensity)
  // When rayAge >= rayLifetime: smoothstep returns 1, so lifeFade = 1.0 - 1 = 0.0 (completely faded)
  // This creates a graceful fade-out in the final second of the ray's life
  float lifeFade = 1.0 - smoothstep(rayLifetime - 1.0, rayLifetime, rayAge);
  
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

  // Add aura rays with individual colors
  vec3 totalRayColor = vec3(0.0);
  for (int i = 0; i < MAX_RAYS; i++) { // Now using the define from React component
    if (i >= uMaxRays) break;
    
    // ========== RAY DATA EXTRACTION ==========
    // Extract ray parameters from uniform arrays sent from CPU
    // uRayPositions is a flat array storing [x0, y0, x1, y1, x2, y2, ...] for each ray
    // So ray i has its X coordinate at index [i * 2] and Y coordinate at [i * 2 + 1]
    float rayStartX = uRayPositions[i * 2];     // X position on tunnel circumference where ray spawns
    float rayStartY = uRayPositions[i * 2 + 1]; // Y position on tunnel circumference where ray spawns
    
    // uRayTimes stores [spawnTime0, lifetime0, isActive0, spawnTime1, lifetime1, isActive1, ...] for each ray
    float spawnTime = uRayTimes[i * 3];     // When this ray was created (in game time)
    float rayLifetime = uRayTimes[i * 3 + 1]; // How long this specific ray should live (4-12 seconds)
    float isActive = uRayTimes[i * 3 + 2];  // Whether this ray slot is currently being used (1.0 = active, 0.0 = inactive)
    
    // Extract ray color from uniform array
    // uRayColors stores [r0, g0, b0, r1, g1, b1, ...] for each ray
    vec3 rayColor = vec3(
      uRayColors[i * 3],     // Red component
      uRayColors[i * 3 + 1], // Green component
      uRayColors[i * 3 + 2]  // Blue component
    );
    
    float rayContribution = calculateRayContribution(vPosition, rayStartX, rayStartY, spawnTime, rayLifetime, isActive);
    totalRayColor += rayColor * rayContribution;
  }
  
  // Apply the colored ray contributions to the base color
  color += totalRayColor;


  // Fade to black as we go further down the tunnel (based on z position)
  float blackFade = 1.0 - smoothstep(-10.0, -40.0, vPosition.z);
  color *= blackFade;

  color *= 0.5; // Darken overall


  gl_FragColor = vec4(color, 1.0);
}