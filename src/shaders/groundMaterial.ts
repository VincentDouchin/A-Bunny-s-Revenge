import { abs, add, color, div, dot, Fn, mix, mul, normalWorld, positionWorld, smoothstep, step, sub, texture, uniform, uniformTexture, uv, vec2, vec3, vec4 } from 'three/tsl'
import type { Texture, TextureNode, UniformNode, Vector2 } from 'three/webgpu'
import { DataTexture } from 'three/webgpu'

import { cnoise } from './lib/cnoise'
import { ToonMaterial } from './toonMaterial'

const defaultTexture = new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1)
defaultTexture.needsUpdate = true
export class GroundMaterial extends ToonMaterial {
	groundTexture: TextureNode
	rockTexture: TextureNode
	level: TextureNode
	grassNoiseTexture: TextureNode
	sizeUniform: UniformNode<'vec2', Vector2>
	topColor = color('#5AB552')
	grassColor = color('#26854C')
	pathColor = color('#856342')
	pathColor2 = color('#A26D3F')
	constructor(parameters: { groundTexture: Texture; rockTexture: Texture; level?: Texture; levelSize: Vector2; grassNoiseTexture: Texture }) {
		super({})
		this.sizeUniform = uniform(parameters.levelSize)
		this.groundTexture = texture(parameters.groundTexture)
		this.rockTexture = texture(parameters.rockTexture)
		this.level = uniformTexture(parameters.level ?? defaultTexture)
		this.grassNoiseTexture = texture(parameters.grassNoiseTexture)
		this.setupColorNode()
	}

	setupColorNode() {
		this.colorNode = Fn(() => {
			const vUv = uv()
			const vWorldPosition = positionWorld
			const worldNormal = normalWorld
			const scaled_uv = div(mul(vUv, this.sizeUniform), 10.0)

			const levelSample = this.level.sample(vUv)

			const pathNoise = add(cnoise(vec3(scaled_uv.y, scaled_uv.y, scaled_uv.y)), div(cnoise(vec3(scaled_uv.x, scaled_uv.y, scaled_uv.y)), 2.0))
			const pathColorNoise = step(pathNoise, 0.2)
			const darkPathColor = mix(this.pathColor, this.pathColor2, 0.1).toColor()
			const path = mix(this.pathColor, darkPathColor, pathColorNoise)

			const noiseTexture = this.grassNoiseTexture.sample(vUv)
			const grass = mix(this.grassColor, this.topColor, noiseTexture.x)

			const blending = abs(worldNormal)

			const b = add(add(blending.x, blending.y), blending.z)
			const blendingNorm = div(blending, vec3(b, b, b))

			const xaxis = this.groundTexture.sample(div(vec2(vWorldPosition.y, vWorldPosition.z), 64.0))

			const zaxis = this.groundTexture.sample(div(vec2(vWorldPosition.x, vWorldPosition.y), 64.0))

			const tex = add(mul(xaxis, blendingNorm.x), mul(zaxis, blendingNorm.z))

			const dotNormal = sub(1.0, smoothstep(0.7, 1.0, add(0.3, dot(worldNormal, vec3(0.0, 1.0, 0.0)))))

			const world_noise = cnoise(mul(vWorldPosition, 300.0))

			const normal_noised = step(dotNormal, mul(dotNormal, world_noise))

			const path_amount = levelSample.a

			const path_noised = step(sub(0.5, path_amount), mul(cnoise(vec3(scaled_uv.x, scaled_uv.y, 1.0)), div(path_amount, 3.0)))

			const grass_and_path = mix(grass, path, path_noised)

			return vec4(mix(tex.rgb, grass_and_path, normal_noised), 1.0)
		})()
	}
}
