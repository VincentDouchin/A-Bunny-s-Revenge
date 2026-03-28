import type { UniformNode } from 'three/webgpu'
import { atan, div, float, greaterThanEqual, length, mix, mul, negate, PI, select, step, sub, uniform, uv, vec3, vec4 } from 'three/tsl'
import { Color, DoubleSide, Sprite, SpriteNodeMaterial, Vector3 } from 'three/webgpu'

import { ecs, time } from '@/global/init'

export const dashMaterial = () => {
	const angleUniform = uniform(0)
	const displayUniform = uniform(0)

	const color1 = vec3(...new Color(0x6DEAD6).toArray())
	const color2 = vec3(...new Color(0x36C5F4).toArray())

	const material = new SpriteNodeMaterial()
	material.side = DoubleSide
	material.transparent = true
	material.depthWrite = false

	const vUv = uv()

	const centered_uv = vUv.mul(2).sub(1)

	const color = mix(color1, color2, displayUniform.sub(0.2))

	const angled_color = select(
		centered_uv.x.greaterThanEqual(0),
		atan(centered_uv.x, centered_uv.y),
		sub(PI, atan(centered_uv.x, negate(centered_uv.y))),
	)

	const len = length(centered_uv)
	const circle = sub(
		step(len, 1.0),
		step(len, 0.4),
	)

	const progress = mul(angleUniform, 2.0).sub(angled_color.div(PI).div(2))

	const opacity = select(
		greaterThanEqual(div(displayUniform, 0.5), 1),
		mul(float(1).sub(displayUniform), circle),
		circle.mul(progress),
	)

	material.fragmentNode = vec4(color, opacity)

	return { material, angle: angleUniform, display: displayUniform }
}
export class Dash extends Sprite {
	current = 1
	delay: number
	material: SpriteNodeMaterial
	angle: UniformNode<'float', number>
	display: UniformNode<'float', number>
	displayTimer = 1
	constructor(delay: number) {
		const { angle, display, material } = dashMaterial()
		super(material)
		this.angle = angle
		this.display = display
		this.delay = delay
		this.material = material
		this.scale.setScalar(4)
		this.position.set(6, 4, 0)
		this.renderOrder = 1
	}

	finished() {
		return this.current === 1.0
	}

	tick(delta: number) {
		this.current = Math.min(this.current + delta / this.delay, 1)
		if (this.finished()) {
			this.displayTimer = Math.min(this.displayTimer + delta / 500, 1)
		}
		this.angle.value = this.current
		this.display.value = this.displayTimer
	}

	reset() {
		this.current = 0
		this.displayTimer = 0
	}
}

const dashDisplayQuery = ecs.with('dashIndicator', 'rotation')
export const updateDashDisplay = () => {
	for (const { dashIndicator, rotation } of dashDisplayQuery) {
		dashIndicator.tick(time.delta)
		dashIndicator.position.copy(new Vector3(8, 5, 0).applyQuaternion(rotation.clone().invert()))
	}
}
