import { ShaderMaterial, UniformsLib } from 'three'
import vertexShader from './glsl/main.vert?raw'
import fragmentShader from './glsl/flat.frag?raw'

export class FlatShadedMaterial extends ShaderMaterial {
	constructor() {
		super({ vertexShader, fragmentShader, lights: true })
		this.uniforms = UniformsLib.lights
	}
}