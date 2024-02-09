const mat2 myt = mat2(.12121212, .13131313, -.13131313, .12121212);
const vec2 mys = vec2(1e4, 1e6);

vec2 rhash(vec2 uv) {
  uv *= myt;
  uv *= mys;
  return fract(fract(uv / mys) * uv);
}

vec3 hash(vec3 p) {
  return fract(sin(vec3(dot(p, vec3(1.0, 57.0, 113.0)),
                        dot(p, vec3(57.0, 113.0, 1.0)),
                        dot(p, vec3(113.0, 1.0, 57.0)))) *
               43758.5453);
}

float voronoi2d(const in vec2 point) {
  vec2 p = floor(point);
  vec2 f = fract(point);
  float res = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 b = vec2(i, j);
      vec2 r = vec2(b) - f + rhash(p + b);
      res += 1. / pow(dot(r, r), 8.);
    }
  }
  return pow(1. / res, 0.0625);
}

float voronoi(vec2 uv) {
    vec2 p = floor(uv);
    vec2 f = fract(uv);

    float res = 8.0;
    float d = 1.0;

    for (float j = -1.0; j <= 1.0; j++) {
        for (float i = -1.0; i <= 1.0; i++) {
            vec2 g = vec2(i, j);
            vec2 cellCenter = g + p + rhash(g + p);
            float d2 = distance(f, cellCenter);

            d = min(d, d2);
        }
    }

    return d;
}