import { Sprite, Vector3 } from 'three'
import { ecs, time } from '@/global/init'
import { DashMaterial } from '@/shaders/dashShader'

export class Dash {
	current = 1
	delay: number
	material = new DashMaterial({ depthWrite: false })
	displayTimer = 1
	constructor(delay: number) {
		this.delay = delay
	}

	finished() {
		return this.current === 1.0
	}

	tick(delta: number) {
		this.current = Math.min(this.current + delta / this.delay, 1)
		if (this.finished()) {
			this.displayTimer = Math.min(this.displayTimer + delta / 500, 1)
		}
		this.material.uniforms.angle.value = this.current
		this.material.uniforms.display.value = this.displayTimer
	}

	reset() {
		this.current = 0
		this.displayTimer = 0
	}
}

const dashQuery = ecs.with('dash')
export const addDashDisplay = () => dashQuery.onEntityAdded.subscribe((e) => {
	const dashDisplay = new Sprite(e.dash.material)
	dashDisplay.position.set(6, 4, 0)
	dashDisplay.scale.setScalar(4)
	ecs.update(e, { dashDisplay })
})
const dashDisplayQuery = dashQuery.with('dashDisplay', 'rotation')
export const updateDashDisplay = () => {
	for (const { dash, dashDisplay, rotation } of dashDisplayQuery) {
		dash.tick(time.delta)
		dashDisplay.position.copy(new Vector3(8, 5, 0).applyQuaternion(rotation.clone().invert()))
	}
}
