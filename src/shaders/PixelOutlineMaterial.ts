import type { ColorRepresentation, Texture, Vector2 } from 'three'
import vertexShader from '@/shaders/glsl/main.vert?raw'
import { Color, ShaderMaterial, Uniform } from 'three'

export const outlinePass = (texture: Texture, size: Vector2, color: ColorRepresentation = 0x000000) => new ShaderMaterial({
	uniforms: {
		tDiffuse: new Uniform(texture),
		size: new Uniform(size),
		color: new Uniform(new Color(color)),
	},
	vertexShader,
	fragmentShader: /* glsl */`
	uniform sampler2D tDiffuse;
	uniform vec3 color;
	uniform vec2 size;
	varying vec2 vUv;
	void main() {
		vec2 texelSize = 1. / size;
		float weight = 1. - (length(texture2D(tDiffuse, vec2(vUv.x + texelSize.x, vUv.y))) +
			length(texture2D(tDiffuse, vec2(vUv.x, vUv.y - texelSize.y))) +
			length(texture2D(tDiffuse, vec2(vUv.x - texelSize.x, vUv.y))) +
			length(texture2D(tDiffuse, vec2(vUv.x, vUv.y + texelSize.y))));
		vec4 c = texture2D(tDiffuse, vUv);
		gl_FragColor = (c.w+c.x+c.y) > 0. ? c : ((weight < 0.) ? vec4(color,1.) : c);
	}
`,
})