varying vec2 vUv;
void main() {
	vUv = uv;
	vec3 new_position = position + normal * 0.0002;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(new_position, 1);
}