import type { Plugin } from '@/lib/app'
import { ecs } from '@/global/init'
import { app } from '@/global/states'
import { windowEvent } from '@/lib/uiManager'
import { debugOptions } from './debugState'

const enableDebugState = () => windowEvent('keydown', (e) => {
	if (e.key === 'F3') {
		e.preventDefault()
		app.enable('debug')
	}
})

const attackInFarm = () => {
	if (debugOptions.attackInFarm()) {
		// playerAttack()
	}
}
const godMode = () => {
	if (debugOptions.godMode()) {
		for (const player of ecs.with('player', 'currentHealth', 'maxHealth')) {
			player.currentHealth = player.maxHealth.value
		}
	}
}

export const debugPlugin: Plugin<typeof app> = (state) => {
	state
		.addSubscribers('default', enableDebugState)
		.onUpdate('default', attackInFarm, godMode)
}
