import { debugOptions, debugState } from './debugState'
import { playerAttack } from '@/states/dungeon/battle'
import type { State } from '@/lib/state'
import { ecs } from '@/global/init'
import { windowEvent } from '@/lib/uiManager'

const enableDebugState = () => windowEvent('keydown', (e) => {
	if (e.key === 'F3') {
		e.preventDefault()
		debugState.enable()
	}
})

const attackInFarm = () => {
	if (debugOptions.attackInFarm) {
		playerAttack()
	}
}
const godMode = () => {
	if (debugOptions.godMode) {
		for (const player of ecs.with('player', 'currentHealth', 'maxHealth')) {
			player.currentHealth = player.maxHealth.value
		}
	}
}

export const debugPlugin = (state: State) => {
	state
		.addSubscriber(enableDebugState)
		.onUpdate(attackInFarm, godMode)
}
