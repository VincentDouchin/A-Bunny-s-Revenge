import type { Texture, TextureNode, Vector2Like } from 'three/webgpu'
import { color, mix, positionLocal, texture, uv, vec2, vec4 } from 'three/tsl'
import { SpriteNodeMaterial, Vector2 } from 'three/webgpu'
import { cellShadingLightingModel } from './toonMaterial'

export class GrassMaterial extends SpriteNodeMaterial {
	bladeTex: TextureNode
	noiseTex: TextureNode
	constructor(grassTexture: Texture, grassNoiseTexture: Texture, size: Vector2Like) {
		super({ transparent: true, map: grassTexture, depthWrite: false })
		this.bladeTex = texture(grassTexture)
		this.noiseTex = texture(grassNoiseTexture)

		const grassSample = texture(this.bladeTex, uv())
		const noiseUV = positionLocal.xz.div(vec2(new Vector2(size.x, -size.y))).add(0.5)
		const topColor = color('#5AB552')
		const grassColor = color('#26854C')
		const noiseTint = this.noiseTex.sample(noiseUV).x
		const grassC = mix(grassColor, topColor, noiseTint)
		this.colorNode = vec4(grassC.rgb, grassSample.a)
	}

	setupLightingModel() {
		return cellShadingLightingModel
	}
}