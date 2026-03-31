import { color, diffuseColor, mix, uniform } from 'three/tsl'
import type { NodeBuilder } from 'three/webgpu'
import { ToonMaterial } from './toonMaterial'

export class CharacterMaterial extends ToonMaterial {
	flash = uniform(0)
	// @ts-ignore TS2590: union too complex — TSL generic depth, safe to ignore
	flashColor = uniform(color(0xffffff))

	setupDiffuseColor(builder: NodeBuilder) {
		super.setupDiffuseColor(builder)
		diffuseColor.rgb.assign(mix(diffuseColor.rgb, this.flashColor, this.flash.div(2)))
	}
}
