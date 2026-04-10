import type { WebGPURenderer } from 'three/webgpu'
import type { VFXParticlesOptions } from 'vanilla-vfx'
import type { Plugin } from './app'
import type { Pool } from './pool'
import type { app } from '@/global/states'
import { Object3D, Vector3 } from 'three/webgpu'
import { VFXParticles } from 'vanilla-vfx'
import { getGameRenderGroup } from '@/debug/debugUi'
import { ecs, renderer, time } from '@/global/init'
import { chestAppearingParticles } from '@/particles/chestAppearing'
import { dashParticles } from '@/particles/dashParticles'
import { enemyDefeatedParticles } from '@/particles/enemyDefeated'
import { wateringCanParticles } from '@/states/farm/wateringCan'
import { objectKeys } from '@/utils/mapFunctions'
import { runIf } from './app'

export type Particles = 'dashParticles' | 'wateringCanParticles' | 'chestAppearingParticles' | 'enemyDefeatedParticles'

export type ParticlesPool = Record<Particles, Pool<Vfx>>
export const spawnVfx = async (vfxOptions: CustomVFXParticlesOptions) => {
	const { scene } = getGameRenderGroup()
	const vfx = new Vfx(renderer, vfxOptions)
	scene.add(vfx.group)
	await vfx.init()
	return vfx
}

const particlePoolQuery = ecs.with('particlePool')
export const getParticleFromPool = (particle: Particles, target?: Object3D) => {
	const entity = particlePoolQuery.entities.filter((e) => e[particle])[0]
	if (!entity) {
		throw new Error(`particle pool not initiated for ${particle}`)
	}
	const vfx = entity[particle]
	ecs.remove(entity)

	if (!vfx) {
		throw new Error('Particle not instanciated')
	}
	if (target) {
		vfx.target = target
	}
	return vfx
}

export interface CustomVFXParticlesOptions extends VFXParticlesOptions {
	world?: boolean
	target?: Object3D
}

export class Vfx extends VFXParticles {
	duration?: number
	target = new Object3D()
	world = false
	accumulator = 0
	constructor(renderer: WebGPURenderer, options: CustomVFXParticlesOptions) {
		super(renderer, options)
		if (options.target) {
			this.target = options.target
		}
		if (options.world) {
			this.world = options.world
		} else {
			this.group.add(this.target)
		}
		this.isEmitting = options.autoStart ?? true
	}

	resetTarget() {
		this.target = new Object3D()
		this.group.add(this.target)
	}

	update(delta: number): void {
		if (!this.system || !this.system.initialized) return
		this.system.update(delta)

		if (this.isEmitting) {
			const delay = this.system.normalizedProps.delay
			const emitCount = this.system.normalizedProps.emitCount
			const pos = this.position()
			if (!delay) {
				this.spawn(pos.x, pos.y, pos.z, emitCount)
			} else {
				this.accumulator += delta
				if (this.accumulator >= delay) {
					this.accumulator -= delay
					this.spawn(pos.x, pos.y, pos.z, emitCount)
				}
			}
		}
	}

	position() {
		const pos = new Vector3()
		if (this.world) {
			this.target.getWorldPosition(pos)
		}
		return pos
	}
}

const particleDefinitions: Record<Particles, CustomVFXParticlesOptions> = {
	chestAppearingParticles,
	dashParticles,
	wateringCanParticles,
	enemyDefeatedParticles,
}

export const particlesPlugin =
	(components: Record<Particles, number>): Plugin<typeof app> =>
	(app) => {
		for (const component of objectKeys(components)) {
			const query = ecs.with(component).without('particlePool')
			const updateParticles = () => {
				for (const entity of query) {
					entity[component].update(time.delta / 1000)
				}
			}
			const spawnPool = async () => {
				console.log('ok', component, components[component])
				for (let i = 0; i < components[component]; i++) {
					const vfx = await spawnVfx(particleDefinitions[component])
					ecs.add({ [component]: vfx, particlePool: true })
				}
			}

			app.onRender(
				'default',
				runIf(() => app.isDisabled('paused'), updateParticles),
			)
			app.onEnter('default', spawnPool)
			app.addSubscribers('default', () =>
				query.onEntityRemoved.subscribe((e) => {
					const vfx = e[component]
					vfx.clear()
					ecs.add({ [component]: vfx, particlePool: true })
				}),
			)
		}
	}
