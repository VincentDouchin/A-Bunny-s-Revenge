import type { QueryEntity } from '@/global/entity'
import { circOut } from 'popmotion'
import { between } from 'randomish'
import { Mesh, Quaternion, Vector3 } from 'three'
import { ecs, gameInputs, time, tweens } from '@/global/init'
import { playSound } from '@/global/sounds'
import { action, condition, createBehaviorTree, enteringState, inState, inverter, parallel, runNodes, selector, sequence, setState, wait } from '@/lib/behaviors'
import { fishParticles } from '@/particles/fishParticles'
import { stopFishing } from '@/states/farm/fishing'

const fishQuery = ecs.with('fish', 'group', 'rotation', 'position', 'targetRotation', 'fishState')
const bobberQueryQuery = ecs.with('bobber')
const fishParameters = (e: QueryEntity<typeof fishQuery>) => {
	const bobber = bobberQueryQuery.first?.bobber ?? null
	const bobberPosition = bobber?.bobbing ? bobber.position : null
	const distance = bobberPosition ? e.position.distanceTo(bobberPosition) : null
	return { bobberPosition, distance, bobber }
}

export const fishBehavior = createBehaviorTree(
	fishQuery,
	e => ({ ctx: fishParameters(e), entity: e, state: e.fishState }),
	selector(
		sequence(
			inverter(inState('wander')),
			condition(({ ctx }) => !ctx.bobber),
			setState('wander'),
		),
		sequence(
			enteringState('going'),
			action(({ entity, ctx }) => {
				if (ctx.bobberPosition) {
					entity.group.lookAt(ctx.bobberPosition.clone().setY(entity.position.y))
					entity.targetRotation.setFromEuler(entity.group.rotation)
				}
			}),
		),
		sequence(
			inState('going'),
			action(({ entity }) => {
				entity.position.add(new Vector3(0, 0, 5).multiplyScalar(time.delta / 1000).applyQuaternion(entity.rotation))
			}),
			condition(({ ctx }) => ctx.distance && ctx.distance < 4),
			setState('hooked'),
		),
		sequence(
			enteringState('hooked'),
			action(({ entity }) => {
				const from = entity.position.clone()
				const dest = new Vector3(0, 0, -2).applyQuaternion(entity.rotation).add(entity.position)
				tweens.add({
					from: 0,
					to: 1,
					repeat: 1,
					duration: between(300, 600),
					ease: circOut,
					repeatType: 'mirror',
					onComplete: () => setState('bounce')({ state: entity.fishState }),
					onUpdate: f => entity.position.lerpVectors(from, dest, f),
				})
			}),
			condition(({ entity }) => !entity.fishingProgress),
			action(({ entity }) => ecs.update(entity, { fishingProgress: { attempts: 0, success: 0, done: false } })),
		),
		sequence(
			inState('wander'),
			action(({ entity }) => {
				entity.position.add(new Vector3(0, 0, 2).multiplyScalar(time.delta / 1000).applyQuaternion(entity.rotation))
				entity.fish.tick(time.delta)
			}),
			runNodes(
				sequence(
					condition(({ entity }) => entity.fish.finished()),
					action(({ entity }) => {
						entity.targetRotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI * 2 * Math.random())
						entity.fish.reset()
					}),
				),
				sequence(
					condition(({ ctx }) => ctx.distance !== null && ctx.distance < 30 && fishQuery.entities.every(e => e.fishState.current === 'wander')),
					setState('going'),
				),
			),
		),
		sequence(
			enteringState('bounce'),
			action(({ entity, ctx: { bobberPosition } }) => {
				if (entity.fishingProgress) {
					entity.fishingProgress.attempts += 1
					entity.fishingProgress.done = false
				}
				playSound(['zapsplat_sport_fishing_sinker_tackle_hit_water_plop_001_13669', 'zapsplat_sport_fishing_sinker_tackle_hit_water_plop_002_13670'])
				ecs.add({ parent: entity, emitter: fishParticles(), position: new Vector3(0, 0, 3), autoDestroy: true })
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
			}),
		),
		sequence(
			inState('bounce'),
			action(({ entity }) => {
				if (entity.fishingProgress && entity.fishingProgress.done === false) {
					if (gameInputs.get('primary').justReleased) {
						entity.fishingProgress.success += 1
						entity.fishingProgress.done = true
					}
				}
			}),
			parallel(
				condition(({ entity }) => entity.fishingProgress && entity.fishingProgress.attempts >= 5),
				setState('runaway'),
			),
			parallel(
				condition(({ entity }) => entity.fishingProgress && entity.fishingProgress.attempts <= 5 && entity.fishingProgress.success === 3),
				action(({ entity }) => ecs.remove(entity)),
				action(() => stopFishing(true)),
			),
			wait(500)('bounce'),
			setState('hooked'),
		),
		sequence(
			enteringState('runaway'),
			action(({ entity }) => {
				entity.targetRotation.setFromAxisAngle(new Vector3(0, 1, 0), Math.PI * 2 * Math.random())
				if (entity.model instanceof Mesh && entity.model.material) {
					const mat = entity.model.material
					tweens.add({
						destroy: entity,
						from: mat.opacity,
						to: 0,
						duration: 2000,
						onUpdate: f => mat.opacity = f,
					})
				}
			}),
		),
		sequence(
			inState('runaway'),
			action(({ entity }) =>	entity.position.add(new Vector3(0, 0, 6).multiplyScalar(time.delta / 1000).applyQuaternion(entity.rotation))),
		),
	),

)
