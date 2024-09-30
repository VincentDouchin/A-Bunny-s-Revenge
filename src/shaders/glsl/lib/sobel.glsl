float sobel(sampler2D tDepth, vec2 vUv, vec2 resolution){
   vec2 texel = vec2(1.0 / resolution.x, 1.0 / resolution.y);

    // 2x2 kernel definition
    const mat2 Gx = mat2(
        1, 0,
        0, -1
    ); // x direction kernel
    const mat2 Gy = mat2(
        0, 1,
        -1, 0
    ); // y direction kernel

    // fetch the 2x2 neighbourhood of a fragment
    float tx0y0 = texture2D(tDepth, vUv).r;
    float tx1y0 = texture2D(tDepth, vUv + texel * vec2(1, 0)).r;
    float tx0y1 = texture2D(tDepth, vUv + texel * vec2(0, 1)).r;
    float tx1y1 = texture2D(tDepth, vUv + texel * vec2(1, 1)).r;

    // gradient value in x direction
    float valueGx = Gx[0][0] * tx0y0 + Gx[1][0] * tx1y0 +
                    Gx[0][1] * tx0y1 + Gx[1][1] * tx1y1;

    // gradient value in y direction
    float valueGy = Gy[0][0] * tx0y0 + Gy[1][0] * tx1y0 +
                    Gy[0][1] * tx0y1 + Gy[1][1] * tx1y1;

    // magnitude of the total gradient
    float G = sqrt((valueGx * valueGx) + (valueGy * valueGy));
    return G;
}