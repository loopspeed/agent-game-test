precision highp float;

uniform float uTime;
uniform float uHexSize;
uniform float uLineThickness;
uniform vec3  uGridColor;
uniform float uGlow;

varying vec2 vXZ;

// Convert world coordinates to hex grid coordinates (pointy-top hexagons)
vec2 worldPositionToHexCoordinates(vec2 worldPosition, float hexagonSize) {
    // For pointy-top hexagons matching the SVG honeycomb pattern
    float q = (worldPosition.x * sqrt(3.0)/3.0 - worldPosition.y/3.0) / hexagonSize;
    float r = worldPosition.y * 2.0/3.0 / hexagonSize;
    return vec2(q, r);
}

// Round hex coordinates to nearest hex center
vec2 roundHexCoordinates(vec2 hexCoordinates) {
    float q = hexCoordinates.x;
    float r = hexCoordinates.y;
    float s = -q - r;
    
    float roundedQ = round(q);
    float roundedR = round(r);
    float roundedS = round(s);
    
    float qDifference = abs(roundedQ - q);
    float rDifference = abs(roundedR - r);
    float sDifference = abs(roundedS - s);
    
    if (qDifference > rDifference && qDifference > sDifference) {
        roundedQ = -roundedR - roundedS;
    } else if (rDifference > sDifference) {
        roundedR = -roundedQ - roundedS;
    }
    
    return vec2(roundedQ, roundedR);
}

// Convert hex coordinates back to world position
vec2 hexCoordinatesToWorldPosition(vec2 hexCoordinates, float hexagonSize) {
    float q = hexCoordinates.x;
    float r = hexCoordinates.y;
    
    float worldX = hexagonSize * (sqrt(3.0) * q + sqrt(3.0)/2.0 * r);
    float worldY = hexagonSize * (3.0/2.0 * r);
    
    return vec2(worldX, worldY);
}

// Calculate distance to hexagon edge (pointy-top orientation)
float distanceToHexagonEdge(vec2 worldPosition, float hexagonSize) {
    vec2 hexCoordinates = worldPositionToHexCoordinates(worldPosition, hexagonSize);
    vec2 nearestHexCenter = roundHexCoordinates(hexCoordinates);
    vec2 hexCenterWorldPosition = hexCoordinatesToWorldPosition(nearestHexCenter, hexagonSize);
    
    // Get position relative to hex center
    vec2 relativePosition = worldPosition - hexCenterWorldPosition;
    vec2 absolutePosition = abs(relativePosition);
    
    // Distance to hexagon edge using pointy-top hex geometry
    // For pointy-top: flat sides on left/right, points at top/bottom
    float hexRadius = hexagonSize;
    float distanceToEdge = max(
        absolutePosition.x * sqrt(3.0)/2.0 + absolutePosition.y * 0.5,  // Angled top/bottom edges
        absolutePosition.x                                                // Left/right flat edges
    ) - hexRadius;
    
    return distanceToEdge;
}

void main() {
    float edgeDistance = distanceToHexagonEdge(vXZ, uHexSize);
    
    // Always visible grid lines - thicker for better visibility
    float gridLineThickness = uLineThickness * uHexSize * 0.15;
    float gridLine = 1.0 - smoothstep(-gridLineThickness, 0.0, edgeDistance);
    
    // Grid color with subtle pulsing
    float pulseAnimation = 0.8 + 0.2 * sin(uTime * 1.2);
    
    vec3 hexagonColor = uGridColor * gridLine * uGlow * pulseAnimation;
    float hexagonAlpha = gridLine * 0.6;
    
    gl_FragColor = vec4(hexagonColor, hexagonAlpha);
}