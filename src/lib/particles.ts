import type { app } from '@/global/states'
import { ecs, time } from '@/global/init'
import { gameRenderGroupQuery } from '@/global/rendering'
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

const removeEmitter = () => {
	for (const entity of emittersQuery) {
		// @ts-expect-error wrong interface
		if (entity.emitter.system.emitEnded && entity.emitter.system.particleNum === 0) {
			ecs.removeComponent(entity, 'emitter')
			if (entity.autoDestroy) {
				ecs.remove(entity)
			}
		}
	}
}

export const particlesPlugin: Plugin<typeof app> = (app) => {
	app
		.addSubscribers('default', initBatchRender, addParticles)
		.onPreUpdate('default', runIf(() => app.isDisabled('paused'), updateParticles), removeEmitter)
}