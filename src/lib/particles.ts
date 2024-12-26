import type { ComponentsOfType } from '@/global/entity'
import type { app } from '@/global/states'
import type { ParticleSystem } from 'three.quarks'
import { ecs, time } from '@/global/init'
import { gameRenderGroupQuery } from '@/global/rendering'
import { Vector3 } from 'three'
import { BatchedRenderer } from 'three.quarks'
import { type Plugin, runIf } from './app'

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
		.addSubscribers('default', initBatchRender, addParticles, ...addEmitters('enemyDefeated', 'enemyImpact', 'dashParticles'))
		.onPreUpdate('default', runIf(() => app.isDisabled('paused'), updateParticles))
}