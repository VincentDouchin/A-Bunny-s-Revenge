import { diffuseColor, floor, normalView } from 'three/tsl'
import { MeshStandardNodeMaterial, PhysicalLightingModel } from 'three/webgpu'

class CelShadingLightingModel extends PhysicalLightingModel {
	direct({ lightDirection, lightColor, reflectedLight }: any) {
		const dotNL = normalView.dot(lightDirection).clamp()
		const irradiance = dotNL.mul(lightColor)
		const steppedIrradiance = floor(irradiance.mul(3.0)).div(3.0)
		reflectedLight.directDiffuse.addAssign(steppedIrradiance.mul(diffuseColor.rgb))
	}

	indirect(builder: any) {
		const { ambientOcclusion, irradiance, reflectedLight } = builder.context
		reflectedLight.indirectDiffuse.addAssign(irradiance.mul(diffuseColor.rgb))
		reflectedLight.indirectDiffuse.mulAssign(ambientOcclusion)
	}
}
export const cellShadingLightingModel = new CelShadingLightingModel()
export class ToonMaterial extends MeshStandardNodeMaterial {
	setupLightingModel() {
		return cellShadingLightingModel
	}
}
