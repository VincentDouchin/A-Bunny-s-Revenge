import type { NodeBuilder } from 'three/webgpu'
import { color, diffuseColor, mix, uniform } from 'three/tsl'
import { ToonMaterial } from './toonMaterial'

export class CharacterMaterial extends ToonMaterial {
	flash = uniform(0)
	flashColor = uniform(color(0xFFFFFF))

	setupDiffuseColor(builder: NodeBuilder) {
		super.setupDiffuseColor(builder)
		diffuseColor.rgb.assign(mix(diffuseColor.rgb, this.flashColor, this.flash.div(2)))
	}
}