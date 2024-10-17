import { ecs, time } from '@/global/init'
import { gameRenderGroupQuery } from '@/global/rendering'
import { pausedState } from '@/global/states'
import { BatchedRenderer } from 'three.quarks'
import { runIf, type State } from './state'

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

export const particlesPlugin = (state: State) => {
	state
		.addSubscriber(initBatchRender)
		.onPreUpdate(runIf(() => !pausedState.enabled, updateParticles), removeEmitter)
		.addSubscriber(addParticles)
}