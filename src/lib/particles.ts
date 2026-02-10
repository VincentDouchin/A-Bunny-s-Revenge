import type { Quaternion, Vector4 } from 'three'
import type { ParticleSystem } from 'three.quarks'
import type { Plugin } from './app'
import type { ComponentsOfType } from '@/global/entity'
import type { app } from '@/global/states'
import { Vector3 } from 'three'
import { BatchedRenderer, Quaternion as QuarksQuaternion, Vector3 as QuarksVector3, Vector4 as QuarksVector4 } from 'three.quarks'
import { ecs, time } from '@/global/init'
import { gameRenderGroupQuery } from '@/global/rendering'
import { runIf } from './app'

export const toQuarks = {
	v3: (vec: Vector3) => new QuarksVector3(vec.x, vec.y, vec.z),
	v4: (vec: Vector4) => new QuarksVector4(vec.x, vec.y, vec.z, vec.w),
	quaternion: (quaternion: Quaternion) => new QuarksQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w),
}

const initBatchRender = () => {
	let initiated = false
	return gameRenderGroupQuery.onEntityAdded.subscribe((e) => {
		if (initiated) return
		const batchRenderer = new BatchedRenderer()
		e.scene.add(batchRenderer)
		ecs.add({ batchRenderer })
		initiated = true
	})
}
export const batchRendererQuery = ecs.with('batchRenderer')
const updateParticles = () => batchRendererQuery.first && batchRendererQuery.first.batchRenderer.update(time.delta * 1000)
const emittersQuery = ecs.with('emitter')
const addParticles = () => emittersQuery.onEntityAdded.subscribe((entity) => {
	const batchRenderer = batchRendererQuery.first?.batchRenderer
	if (batchRenderer) {
		batchRenderer.addSystem(entity.emitter.system)
	}
})

const removeEmitter = () => {
	for (const entity of emittersQuery) {
		// @ts-expect-error wrong interface
		if (entity.emitter.system.emitEnded && entity.emitter.system.particleNum === 0) {
			if (entity.autoDestroy) {
				ecs.removeComponent(entity, 'emitter')
				ecs.remove(entity)
			}
		}
	}
}

const addEmitters = (...components: ComponentsOfType<ParticleSystem>[]) => components.map((component) => {
	const particleSystemQuery = ecs.with(component)
	return () => particleSystemQuery.onEntityAdded.subscribe((e) => {
		e[component].pause()
		const batchRenderer = batchRendererQuery.first?.batchRenderer
		const emitter = e[component].emitter

		ecs.add({ parent: e, position: new Vector3(), emitter })

		if (batchRenderer) {
			batchRenderer.addSystem(e[component])
		}
	})
})

export const particlesPlugin: Plugin<typeof app> = (app) => {
	app
		.addSubscribers('default', initBatchRender, addParticles, ...addEmitters('enemyDefeated', 'enemyImpact', 'dashParticles', 'smokeParticles', 'fireParticles'))
		.onRender('default', runIf(() => app.isDisabled('paused'), updateParticles))
		.onPreUpdate('default', removeEmitter)
}