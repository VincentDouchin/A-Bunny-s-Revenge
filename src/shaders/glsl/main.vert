varying vec2 vUv;
varying vec3 vNormal;
void main() {
	vUv = uv;
	vNormal = normalMatrix * normal;
	vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
	gl_Position = projectionMatrix * modelViewPosition;
}