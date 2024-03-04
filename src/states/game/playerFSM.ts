import type { With } from 'miniplex'
import { Vector3 } from 'three'
import type { Animator } from '@/global/animator'
import { params } from '@/global/context'
import type { ComponentsOfType, Entity, states } from '@/global/entity'
import { ecs, time } from '@/global/init'
import { entries } from '@/utils/mapFunctions'

const setupAnimations = <A extends ComponentsOfType<Animator<any>>, K extends keyof Entity>(key: A, transitions: Partial<Record<states, (e: With<With<With<Entity, A>, | 'stateMachine' | 'state'>, K>) => void>>, additionalComponents: K[] = []) => {
	const query = ecs.with(key).with('stateMachine', 'state').with(...additionalComponents)
	const subscribers = []
	for (const [state, fn] of entries(transitions)) {
		if (fn) {
			subscribers.push(() => query.where(e => e.state === state).onEntityAdded.subscribe(fn))
		}
	}
	return subscribers
}

export const playerFSM = setupAnimations('playerAnimator', {
	idle: e => e.playerAnimator.playAnimation('IDLE_NEW'),
	picking: e => setTimeout(() => e.stateMachine.enter('idle', e), 300),
	running: e => e.playerAnimator.playAnimation('RUN_ALT'),
	hit: e => setTimeout(() => e.stateMachine.enter('idle', e), 200),
	dying: e => setTimeout(() => e.stateMachine.enter('dead', e), 1000),
	attacking: async (e) => {
		const applyforce = (multiplier: number) => {
			const force = new Vector3(0, 0, e.speed * params.speedUp * time.delta * 10 * multiplier).applyQuaternion(e.rotation)
			e.body.addForce(force, true)
			setTimeout(() => e.body.resetForces(true), 500)
		}

		if (e.combo.lastAttack === 0) {
			applyforce(1)
			await e.playerAnimator.playOnce('FIGHT_ACTION1', undefined, 0.2)
		}
		if (e.combo.lastAttack === 1) {
			applyforce(2)
			await e.playerAnimator.playOnce('SLASH')
		}
		if (e.combo.lastAttack === 2) {
			applyforce(3)
			await e.playerAnimator.playClamped('HEAVYATTACK', { timeScale: 2 })
		}
		e.combo.lastAttack = 0
		e.stateMachine.enter('idle', e)
	},
}, ['combo', 'body', 'speed', 'rotation'])
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