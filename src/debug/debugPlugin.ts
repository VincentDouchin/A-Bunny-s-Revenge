import { debugOptions, debugState } from './debugState'
import { getGameRenderGroup } from './debugUi'
import type { State } from '@/lib/state'
import { ecs, world } from '@/global/init'
import { windowEvent } from '@/lib/uiManager'
import { RapierDebugRenderer } from '@/lib/debugRenderer'
import { scene } from '@/global/rendering'

const enableDebugState = () => windowEvent('keydown', (e) => {
	if (e.key === 'F3') {
		e.preventDefault()
		debugState.enable()
	}
})

const attackInFarm = () => {
	if (debugOptions.attackInFarm) {
		// playerAttack()
	}
}
const godMode = () => {
	if (debugOptions.godMode) {
		for (const player of ecs.with('player', 'currentHealth', 'maxHealth')) {
			player.currentHealth = player.maxHealth.value
		}
	}
}
const debugRendererQuery = ecs.with('debugRenderer')
export const debugRendererPlugin = (state: State) => {
	state
		.onEnter(() => {
			const debugRenderer = new RapierDebugRenderer(world)
			scene.add(debugRenderer.mesh)
			ecs.add({ debugRenderer }) })
		.onExit(() => {
			for (const entity of debugRendererQuery) {
				entity.debugRenderer.mesh.removeFromParent()
				ecs.remove(entity)
			}
		})
}

export const debugPlugin = (state: State) => {
	state
		.addSubscriber(enableDebugState)
		.onUpdate(attackInFarm, godMode)
		.onUpdate(() => {
			for (const entity of debugRendererQuery) {
				entity.debugRenderer.update()
			}
		})
}
