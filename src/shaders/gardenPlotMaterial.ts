import { Fn, materialColor, mix, uniform, vec4 } from 'three/tsl'
import type { MeshStandardNodeMaterialParameters, Node } from 'three/webgpu'
import { ToonMaterial } from './toonMaterial'

const gardenColorNode = Fn<[Node<'float'>], Node<'vec4'>>(([water]) => {
	return mix(vec4(materialColor), materialColor.toVec4().mul(0.5), water)
})

export class GardenPlotMaterial extends ToonMaterial {
	water = uniform(0)
	constructor(args: MeshStandardNodeMaterialParameters) {
		super(args)
		this.colorNode = gardenColorNode(this.water)
	}
}
