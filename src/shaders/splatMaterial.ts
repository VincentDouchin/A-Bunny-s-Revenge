import { ecs } from '@/global/init'
import { abs, clamp, color, float, Fn, length, Loop, max, min, mix, positionWorld, step, uniform, uniformArray, vec4, smoothstep } from 'three/tsl'
import { Color, MeshBasicNodeMaterial, Node, Vector2 } from 'three/webgpu'

const MAX_SPLATS = 64 // compile-time constant — size the shader is compiled with

const smin = Fn<[Node<'float'>, Node<'float'>, Node<'float'>], Node<'float'>>(([a, b, k]) => {
	const h = max(k.sub(abs(a.sub(b))), float(0.0)).div(k)
	return min(a, b).sub(h.mul(h).mul(k).mul(0.25))
})

const EMPTY_POSITIONS = Array.from({ length: MAX_SPLATS }, () => new Vector2(99999, 99999))
const EMPTY_INTENSITIES = Array.from({ length: MAX_SPLATS }, () => 0)

export class SplatMaterial extends MeshBasicNodeMaterial {
	positions = uniformArray<'vec2'>(EMPTY_POSITIONS, 'vec2')
	intensities = uniformArray<'float'>([...EMPTY_INTENSITIES], 'float')
	uMode = uniform(0)
	constructor() {
		super({ transparent: true })
		this.transparent = true
		this.depthWrite = false

		this.colorNode = Fn<[], Node<'vec4'>>(() => {
			const sdf = float(1000.0).toVar()
			const fragXZ = positionWorld.xz

			Loop(MAX_SPLATS, ({ i }) => {
				const radius = this.intensities.element(i)
				const d = length(fragXZ.sub(this.positions.element(i))).sub(radius)
				sdf.assign(smin(sdf, d, float(1.5)))
			})
			const inside = step(sdf, 0)
			const edge = smoothstep(0, sdf.mul(0.7), sdf).sub(inside)

			const cEdge = color(new Color('#9de64e'))
			const cInner = color(new Color('#62a477'))

			const finalColor = mix(cInner, cEdge, clamp(edge, 0, 1))
			const alpha = step(sdf, 1)

			return vec4(finalColor, alpha)
		})()
	}
}

const splatQuery = ecs.with('splatDisplay')
const poisonTrailQuery = ecs.with('trail', 'position')

export const updateSplatDisplay = () => {
	for (const { splatDisplay } of splatQuery) {
		const posX = splatDisplay.positions.array
		const intensities = splatDisplay.intensities.array

		let i = 0
		for (const { position, trail } of poisonTrailQuery) {
			if (i >= MAX_SPLATS) break
			posX[i] = new Vector2(position.x, position.z)
			intensities[i] = (1 - trail.timer.percent()) * trail.intensity
			i++
		}

		for (; i < MAX_SPLATS; i++) {
			posX[i] = new Vector2(9999, 9999)
			intensities[i] = 0
		}

		splatDisplay.positions.needsUpdate = true
		splatDisplay.intensities.needsUpdate = true
	}
}
