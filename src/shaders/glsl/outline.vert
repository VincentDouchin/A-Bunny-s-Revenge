varying vec2 vUv;
uniform float thickness;
void main() {
	vUv = uv;
	vec3 new_position = position* thickness;
	vec4 modelViewPosition = modelViewMatrix * vec4(new_position, 1.0);
	gl_Position = projectionMatrix * modelViewPosition;
}