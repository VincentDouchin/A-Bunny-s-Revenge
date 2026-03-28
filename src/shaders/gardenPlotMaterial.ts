import type { MeshStandardNodeMaterialParameters, Node, NodeBuilder } from 'three/webgpu'
import { color, diffuseColor, Fn, materialColor, mix, uniform } from 'three/tsl'
import { ToonMaterial } from './toonMaterial'

const gardenColorNode = Fn<[Node<'float'>], Node<'vec4'>>(([water]) => {
	return mix(materialColor as Node<'vec4'>, (materialColor as Node<'vec4'>).mul(0.5), water)
})

export class GardenPlotMaterial extends ToonMaterial {
	water = uniform(0)
	constructor(args: MeshStandardNodeMaterialParameters) {
		super(args)
		this.colorNode = gardenColorNode(this.water)
	}
}