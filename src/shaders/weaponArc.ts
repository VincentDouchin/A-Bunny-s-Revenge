import { DoubleSide, ShaderMaterial } from 'three'

export const WeaponArcMaterial = new ShaderMaterial({
	side: DoubleSide,
	transparent: true,
	depthWrite: false,
	vertexShader: /* glsl */`
	varying vec2 vUv;
	void main() {
		vUv = uv;
		vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
		gl_Position = projectionMatrix * modelViewPosition;
	}
	`,
	fragmentShader: /* glsl */`
	uniform sampler2D tDiffuse;
	varying vec2 vUv;
	void main() {
		vec2 centered_uv = vUv *2.-1.;
		float x = 1. - abs(centered_uv.x);
		float y = 1. - abs(centered_uv.y);
		
		gl_FragColor = vec4(step(0.5,x * y));
	}
	`,
})