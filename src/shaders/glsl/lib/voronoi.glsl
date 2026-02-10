// Improved hash function - returns vec3 for color
vec3 hash3(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xxy + p3.yzz) * p3.zyx);
}

// 2D Voronoi with cell ID
vec3 voronoi(vec2 uv) {
    vec2 i = floor(uv);
    vec2 f = fract(uv);
    
    vec3 minData = vec3(1.0); // x: distance, yz: cell id
    
    // Check 3x3 neighboring cells
    for (int x = -1; x <= 1; x++) {
        for (int y = -1; y <= 1; y++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 cell = i + neighbor;
            vec2 point = neighbor + hash3(cell).xy; // Random point in cell
            
            float dist = length(point - f);
            if (dist < minData.x) {
                minData = vec3(dist, hash3(cell).xy);
            }
        }
    }
    
    return minData;
}
float triangle2D(vec2 p){
    p *= 0.01;
    const float k = sqrt(3.0);
    p.x = abs(p.x) - 1.0;
    p.y = p.y + 1.0/k;
    if( p.x+k*p.y>0.0 ) p = vec2(p.x-k*p.y,-k*p.x-p.y)/2.0;
    p.x -= clamp( p.x, -2.0, 0.0 );
    return -length(p)*sign(p.y) * 100.;
}
