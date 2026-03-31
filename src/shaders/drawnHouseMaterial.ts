import { assets } from '@/global/init'
import { finalTarget } from '@/global/rendering'
import { abs, float, Fn, length, mix, screenUV, smoothstep, step, texture, uniform, uv, vec3 } from 'three/tsl'
import { MeshBasicNodeMaterial, Vector2 } from 'three/webgpu'
import { cnoise } from './lib/cnoise'
import { kuwahara } from './lib/kuwahara'

export class DrawnHouseMaterial extends MeshBasicNodeMaterial {
	house = texture(finalTarget.texture)
	parchment = texture(assets.textures.parchment)
	time = uniform(0)
	parchmentMix = uniform(0.7)
	windowSize = uniform(0)
	resolution = uniform(new Vector2(window.innerWidth, window.innerHeight))
	kSize = uniform(5)
	constructor() {
		super({ transparent: true })
		this.colorNode = Fn(() => {
			// screenUV is the TSL equivalent of the original NDC→UV conversion:
			//   vCoords = vPos.xy / vPos.w * 0.5 + 0.5
			const vCoords = screenUV

			// Kuwahara filter on the house render target
			const houseColor = kuwahara(this.house, this.resolution, vCoords, this.kSize.toInt())

			// Parchment sampled at mesh UVs
			const parchmentColor = texture(this.parchment, uv())

			// Radial mask centred on the mesh
			const centeredUv = abs(uv().mul(0.5).sub(0.25)).mul(5.0)
			const dist = length(centeredUv)
			const mask = smoothstep(float(2.0), float(0.0), dist)

			// Animated noise drives the reveal
			const noiseVal = step(float(0.5).sub(mask).sub(this.windowSize), cnoise(vec3(uv().mul(15.0), this.time.div(10.0))).mul(mask.div(2.0)))

			const houseColor2 = mix(parchmentColor, houseColor, this.parchmentMix)
			return mix(parchmentColor, houseColor2, noiseVal)
		})()
	}
}
