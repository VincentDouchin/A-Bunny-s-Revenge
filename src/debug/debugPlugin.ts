import { debugOptions, debugState } from './debugState'
import { playerAttack } from '@/states/dungeon/battle'
import type { State } from '@/lib/state'
import { ecs } from '@/global/init'

const enableDebugState = () => {
	const listener = (e: KeyboardEvent) => {
		if (e.key === 'F3') {
			e.preventDefault()
			debugState.enable()
		}
	}
	window.addEventListener('keydown', listener)
	return () => {
		window.removeEventListener('keydown', listener)
	}
}

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
