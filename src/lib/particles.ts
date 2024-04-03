import { BatchedRenderer } from 'three.quarks'
import { type State, runIf } from './state'
import { ecs, time } from '@/global/init'
import { pausedState } from '@/global/states'
import { gameRenderGroupQuery } from '@/global/rendering'

const initBatchRender = () => {
	const batchRenderer = new BatchedRenderer()
	const gameRenderGroup = gameRenderGroupQuery.first
	if (gameRenderGroup) {
		gameRenderGroup.scene.add(batchRenderer)
		ecs.add({ batchRenderer })
	}
}
const batchRendererQuery = ecs.with('batchRenderer')
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
		.onEnter(initBatchRender)
		.onPreUpdate(runIf(() => !pausedState.enabled, updateParticles), removeEmitter)
		.addSubscriber(addParticles)
}