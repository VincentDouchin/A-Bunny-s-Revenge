import type { With } from 'miniplex'
import type { Animator } from '@/global/animator'
import type { ComponentsOfType, Entity, states } from '@/global/entity'
import { ecs } from '@/global/init'
import { entries } from '@/utils/mapFunctions'

const setupAnimations = <A extends ComponentsOfType<Animator<any>>>(key: A, transitions: Partial<Record<states, (e: With<With<Entity, A>, | 'stateMachine'>) => void>>) => {
	const query = ecs.with(key).with('stateMachine').with('state')
	const subscribers = []
	for (const [state, fn] of entries(transitions)) {
		if (fn) {
			subscribers.push(() => query.where(e => e.state === state).onEntityAdded.subscribe(fn))
		}
	}
	return subscribers
}

export const playerFSM = setupAnimations('playerAnimator', {
	idle: e => e.playerAnimator.playAnimation('idle'),
	picking: e => e.playerAnimator.playOnce('picking_vegetables').then(() => e.stateMachine.enter('idle', e)),
	running: e => e.playerAnimator.playAnimation('run'),
	hit: e => setTimeout(() => e.stateMachine.enter('idle', e), 200),
	dying: e => setTimeout(() => e.stateMachine.enter('dead', e), 1000),

})
export const pandaFSM = setupAnimations('pandaAnimator', {
	idle: e => e.pandaAnimator.playAnimation('Idle'),
	hello: e => e.pandaAnimator.playOnce('Wave').then(() => e.stateMachine.enter('idle', e)),
})

export const beeFSM = setupAnimations('beeAnimator', {
	idle: e => e.beeAnimator.playAnimation('Flying_Idle'),
	running: e => e.beeAnimator.playAnimation('Fast_Flying'),
	hit: e => e.beeAnimator.playOnce('HitReact').then(() => e.stateMachine.enter('idle', e)),
	dying: e => e.beeAnimator.playClamped('Death').then(() => e.stateMachine.enter('dead', e)),
	attacking: e => e.beeAnimator.playClamped('Headbutt').then(() => e.stateMachine.enter('attackCooldown', e)),
	waitingAttack: e => setTimeout(() => e.stateMachine.enter('attacking', e), 400),
	attackCooldown: e => setTimeout(() => e.stateMachine.enter('idle', e), 1000)
	,
})
export const shagaFSM = setupAnimations('shagaAnimator', {
	idle: e => e.shagaAnimator.playAnimation('Idle'),
	running: e => e.shagaAnimator.playAnimation('Move'),
	hit: e => e.shagaAnimator.playOnce('Damage').then(() => e.stateMachine.enter('idle', e)),
	dying: e => e.shagaAnimator.playClamped('Die').then(() => e.stateMachine.enter('dead', e)),
	attacking: e => e.shagaAnimator.playClamped('Attack').then(() => e.stateMachine.enter('attackCooldown', e)),
	waitingAttack: e => setTimeout(() => e.stateMachine.enter('attacking', e), 400),
	attackCooldown: e => setTimeout(() => e.stateMachine.enter('idle', e), 1000),

})
export const ovenFSM = setupAnimations('ovenAnimator', {
	// idle: e => e.ovenAnimator.playClamped('Static'),
	// doorOpening: e => e.ovenAnimator.playClamped('Body|OvenOpening'),
	// idle: e => e.ovenAnimator.playAnimation('OvenOpening'),
})