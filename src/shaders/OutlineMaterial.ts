import type { Color } from 'three'
import { BackSide, ShaderMaterial, Uniform } from 'three'
import vertexShader from '@/shaders/glsl/outline.vert?raw'
import fragmentShader from '@/shaders/glsl/color_simple.frag?raw'

export class OutlineMaterial extends ShaderMaterial {
	constructor(color: Color, thickness: number) {
		super({
			side: BackSide,
			vertexShader,
			fragmentShader,
			uniforms: {
				color: new Uniform(color),
				thickness: new Uniform(thickness),
			},
		})
	}
}