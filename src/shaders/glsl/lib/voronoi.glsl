vec2 hash(vec2 p) {
	p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
	return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float voronoi( in vec2 x) {
    vec2 p = floor(x);
    vec2 f = fract(x);

    float res = 8.0;
	for (float j = -1.0; j <= 1.0; j++ )
	for (float i = -1.0; i <= 1.0; i++ ) {
        vec2 b = vec2(i, j);
        vec2 r = b - f + hash(p + b);
        float d = dot(r, r);

		res = min(res, d);
	}

	return res;
}