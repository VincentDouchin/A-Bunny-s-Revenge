import type { WebGLRenderer } from 'three'
import { ShaderMaterial, Uniform, WebGLRenderTarget } from 'three'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass'

export const copyShader = (source: WebGLRenderTarget) => {
	const copy = new ShaderMaterial({
		uniforms: {
			target: new Uniform(source.texture),
		},
		vertexShader: /* glsl */`
	varying vec2 vUv;
	void main() {
		vUv = uv;
		vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
		gl_Position = projectionMatrix * modelViewPosition;
	}`,
		fragmentShader: /* glsl */`
	varying vec2 vUv;
	uniform sampler2D target;
	void main(){
		vec4 house_color = texture2D(target, vUv);
		gl_FragColor = house_color;
	}
	`,
	})
	const quad = new FullScreenQuad(copy)
	const target = new WebGLRenderTarget(window.innerWidth, window.innerHeight)
	return {
		target,
		render: (renderer: WebGLRenderer) => {
			renderer.setRenderTarget(target)
			quad.render(renderer)
		},
	}
}