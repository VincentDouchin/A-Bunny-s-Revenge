// import type { NodeBuilder } from 'three/webgpu'
// import { Vector2 } from 'three.quarks'
// import { cos, float, modelViewMatrix, positionLocal, select, sin, uniform, vec3, vec4 } from 'three/tsl'
import { MeshToonMaterial } from 'three/webgpu'
// import { cnoise } from './lib/cnoise'

export class VegetationMaterial extends MeshToonMaterial {
	// timeUniform = uniform(234)
	// heightUniform = uniform(15)
	// shakeUniform = uniform(1)
	// posUniform = uniform(new Vector2(1, 2))

	// setupPosition(_builder: NodeBuilder) {
	// 	// Capture uniforms
	// 	const timeUniform = this.timeUniform
	// 	const heightUniform = this.heightUniform
	// 	const shakeUniform = this.shakeUniform
	// 	const posUniform = this.posUniform

	// 	// Apply displacement
	// 	const transformed = positionLocal

	// 	// Convert to model-view space
	// 	const mvPosition = modelViewMatrix.mul(vec4(transformed, 1.0))

	// 	const noise = cnoise(vec3(
	// 		posUniform.x,
	// 		posUniform.y,
	// 		timeUniform.add(shakeUniform),
	// 	))

	// 	const height_factor = mvPosition.y.div(heightUniform)

	// 	const shakeX = select(
	// 		shakeUniform.greaterThan(0.0),
	// 		sin(shakeUniform).mul(3.0),
	// 		float(0.0),
	// 	)

	// 	const shakeY = select(
	// 		shakeUniform.greaterThan(0.0),
	// 		cos(shakeUniform).mul(3.0),
	// 		float(0.0),
	// 	)

	// 	const displacement = vec4(
	// 		sin(noise).add(shakeX).mul(height_factor),
	// 		0.0,
	// 		cos(noise).add(shakeY).mul(height_factor),
	// 		0.0,
	// 	)

	// 	const displacedPosition = mvPosition.add(displacement)

	// 	return displacedPosition.xyz
	// }
}