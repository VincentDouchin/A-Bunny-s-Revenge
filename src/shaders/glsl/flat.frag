varying vec2 vUv;
varying vec3 vNormal;
void main() {
	vec3 steppedNormals = step(vNormal,0.3);
	gl_FragColor = vec4(steppedNormals, 1.0);
}