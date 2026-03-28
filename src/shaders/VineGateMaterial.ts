import type { MeshStandardMaterialParameters } from 'three'
import { diffuseColor, float, Fn, min, positionWorld, uniform } from 'three/tsl'
import { ToonMaterial } from './toonMaterial'

export class VineGateMaterial extends ToonMaterial {
	time = uniform(0)
	constructor(args: MeshStandardMaterialParameters) {
		super(args)

		// Custom opacity node based on world position and time
		const customOpacity = Fn(() => {
			// Calculate opacity factor: (worldPos.y + 40. * time) / 30.
			const opacityFactor = positionWorld.y.add(this.time.mul(40.0)).div(30.0)

			// Clamp opacity: min(color.a, 1.0 - opacityFactor)
			const finalOpacity = min(diffuseColor.a, float(1.0).sub(opacityFactor))

			return finalOpacity
		})

		// Apply to material
		this.opacityNode = customOpacity()
		this.transparent = true
	}
}