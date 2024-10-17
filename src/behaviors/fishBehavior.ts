import type { Entity } from '@/global/entity'
import type { With } from 'miniplex'
import { ecs, time, tweens } from '@/global/init'
import { playSound } from '@/global/sounds'
import { behaviorPlugin } from '@/lib/behaviors'
import { fishParticles } from '@/particles/fishParticles'
import { stopFishing } from '@/states/farm/fishing'
import { sleep } from '@/utils/sleep'
import { circOut } from 'popmotion'
import { between } from 'randomish'
import { Mesh, Quaternion, Vector3 } from 'three'

const fishComponents = ['fish', 'group', 'rotation', 'position', 'targetRotation'] as const satisfies readonly (keyof Entity)[]
const fishQuery = ecs.with(...fishComponents)
const playerQuery = ecs.with('playerControls', 'player')
const bobberQueryQuery = ecs.with('bobber')
const fishParameters = (e: With<Entity, (typeof fishComponents)[number]>) => {
	const bobber = bobberQueryQuery.first?.bobber ?? null
	const bobberPosition = bobber?.bobbing ? bobber.position : null

	const distance = bobberPosition ? e.position.distanceTo(bobberPosition) : null
	return { bobberPosition, distance, bobber }
}

export const fishBehaviorPlugin = behaviorPlugin(fishQuery, 'fish', fishParameters)({
	going: () => ({
		enter(e, _setState, { bobberPosition }) {
			if (bobberPosition) {
				e.group.lookAt(bobberPosition.clone().setY(e.position.y))
				e.targetRotation.setFromEuler(e.group.rotation)
			}
		},
		update(e, setState, { distance, bobber }) {
			if (!bobber) setState('wander')
			e.position.add(new Vector3(0, 0, 5).multiplyScalar(time.delta / 1000).applyQuaternion(e.rotation))
			if (distance && distance < 4) {
				setState('hooked')
			}
		},
	}),
	hooked: () => ({
		enter(e, setState) {
			if (!e.fishingProgress) {
				ecs.update(e, { fishingProgress: { attempts: 0, sucess: 0, done: false } })
			}
			const from = e.position.clone()
			const dest = new Vector3(0, 0, -2).applyQuaternion(e.rotation).add(e.position)
			tweens.add({
				from: 0,
				to: 1,
				repeat: 1,
				duration: between(300, 600),
				ease: circOut,
				repeatType: 'mirror',
				onComplete: () => setState('bounce'),
				onUpdate: f => e.position.lerpVectors(from, dest, f),
			})
		},
		update(_e, setState, { bobber }) {
			if (!bobber) setState('wander')
		},

	}),
	wander: () => ({
		update(e, setState, { distance }) {
			e.position.add(new Vector3(0, 0, 2).multiplyScalar(time.delta / 1000).applyQuaternion(e.rotation))
			e.fish.tick(time.delta)
			if (e.fish.finished()) {
				e.targetRotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI * 2 * Math.random())
				e.fish.reset()
			}
			if (distance !== null && distance < 30 && !fishQuery.entities.some(e => e.state !== 'wander')) {
				setState('going')
			}
		},
	}),
	bounce: () => ({
		async enter(e, setState, { bobber, bobberPosition }) {
			if (e.fishingProgress) {
				e.fishingProgress.attempts += 1
				e.fishingProgress.done = false
			}
			playSound(['zapsplat_sport_fishing_sinker_tackle_hit_water_plop_001_13669', 'zapsplat_sport_fishing_sinker_tackle_hit_water_plop_002_13670'])
			ecs.add({ parent: e, emitter: fishParticles(), position: new Vector3(0, 0, 3), autoDestroy: true })
			if (bobberPosition) {
				const originalPosition = bobberPosition.clone()
				const targetPosition = new Vector3(0, -2, 0).add(originalPosition)
				tweens.add({
					from: 0,
					to: 1,
					duration: 250,
					repeat: 1,
					repeatType: 'mirror',
					ease: circOut,
					onUpdate: f => bobberPosition.lerpVectors(originalPosition, targetPosition, f),

				})
			}
			await sleep(500)
			if (bobber) {
				setState('hooked')
			}
		},
		update(e, setState, { bobber }) {
			if (!bobber) setState('wander')
			for (const player of playerQuery) {
				if (e.fishingProgress && e.fishingProgress.done === false) {
					if (player.playerControls.get('primary').justReleased) {
						e.fishingProgress.sucess += 1
						e.fishingProgress.done = true
						if (e.fishingProgress.attempts <= 5 && e.fishingProgress.sucess === 3) {
							ecs.remove(e)
							stopFishing(true)()
							return
						}
					}
					if (e.fishingProgress.attempts >= 5) {
						setState('runaway')
					}
				}
			}
		},

	}),
	runaway: () => ({
		enter(e) {
			e.targetRotation.setFromAxisAngle(new Vector3(0, 1, 0), Math.PI * 2 * Math.random())
			if (e.model instanceof Mesh && e.model.material) {
				const mat = e.model.material
				tweens.add({
					destroy: e,
					from: mat.opacity,
					to: 0,
					duration: 2000,
					onUpdate: f => mat.opacity = f,
				})
			}
		},
		update(e) {
			e.position.add(new Vector3(0, 0, 6).multiplyScalar(time.delta / 1000).applyQuaternion(e.rotation))
		},
	}),
})