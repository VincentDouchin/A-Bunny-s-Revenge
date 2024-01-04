import { BatchedRenderer } from 'three.quarks'
import type { State } from './state'
import { ecs, time } from '@/global/init'
import { scene } from '@/global/rendering'

const initBatchRender = () => {
	const batchRenderer = new BatchedRenderer()
	scene.add(batchRenderer)
	ecs.add({ batchRenderer })
}
const batchRendererQuery = ecs.with('batchRenderer')
export const updateParticles = () => batchRendererQuery.first && batchRendererQuery.first.batchRenderer.update(time.delta)
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
		if (entity.emitter.system.emitEnded) {
			ecs.removeComponent(entity, 'emitter')
		}
	}
}
export const particlesPlugin = (state: State) => {
	state
		.onEnter(initBatchRender)
		.onUpdate(updateParticles, removeEmitter)
		.addSubscriber(addParticles)
}