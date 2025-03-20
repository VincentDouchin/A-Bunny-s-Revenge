import { type QueryEntity, States, states } from '@/global/entity'
import { ecs, time, tweens } from '@/global/init'
import { playSound } from '@/global/sounds'
import { action, condition, createBehaviorTree, enteringState, inState, inverter, parallel, runNodes, selector, sequence, setState, wait, withContext } from '@/lib/behaviors'
import { fishParticles } from '@/particles/fishParticles'
import { stopFishing } from '@/states/farm/fishing'
import { circOut } from 'popmotion'
import { between } from 'randomish'
import { Mesh, Quaternion, Vector3 } from 'three'

const fishQuery = ecs.with('fish', 'group', 'rotation', 'position', 'targetRotation', ...states(States.fish), 'state')
const playerQuery = ecs.with('playerControls', 'player')
const bobberQueryQuery = ecs.with('bobber')
const fishParameters = (e: QueryEntity<typeof fishQuery>) => {
	const bobber = bobberQueryQuery.first?.bobber ?? null
	const bobberPosition = bobber?.bobbing ? bobber.position : null
	const distance = bobberPosition ? e.position.distanceTo(bobberPosition) : null
	return { bobberPosition, distance, bobber }
}

export const fishBehavior = createBehaviorTree(
	fishQuery,
	withContext(
		fishParameters,
		selector(
			sequence(
				inverter(inState('wander')),
				condition((_e, c) => !c.bobber),
				setState('wander'),
			),
			sequence(
				enteringState('going'),
				action((e, c) => {
					if (c.bobberPosition) {
						e.group.lookAt(c.bobberPosition.clone().setY(e.position.y))
						e.targetRotation.setFromEuler(e.group.rotation)
					}
				}),
			),
			sequence(
				inState('going'),
				action((e) => {
					e.position.add(new Vector3(0, 0, 5).multiplyScalar(time.delta / 1000).applyQuaternion(e.rotation))
				}),
				condition((_e, c) => c.distance && c.distance < 4),
				setState('hooked'),
			),
			sequence(
				enteringState('hooked'),
				action((e) => {
					const from = e.position.clone()
					const dest = new Vector3(0, 0, -2).applyQuaternion(e.rotation).add(e.position)
					tweens.add({
						from: 0,
						to: 1,
						repeat: 1,
						duration: between(300, 600),
						ease: circOut,
						repeatType: 'mirror',
						onComplete: () => setState('bounce')(e),
						onUpdate: f => e.position.lerpVectors(from, dest, f),
					})
				}),
				condition(e => !e.fishingProgress),
				action(e => ecs.update(e, { fishingProgress: { attempts: 0, success: 0, done: false } })),
			),
			sequence(
				inState('wander'),
				action((e) => {
					e.position.add(new Vector3(0, 0, 2).multiplyScalar(time.delta / 1000).applyQuaternion(e.rotation))
					e.fish.tick(time.delta)
				}),
				runNodes(
					sequence(
						condition((...[e]) => e.fish.finished()),
						action((...[e]) => {
							e.targetRotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI * 2 * Math.random())
							e.fish.reset()
						}),
					),
					sequence(
						condition((_e, c) => c.distance !== null && c.distance < 30 && fishQuery.entities.every(e => e.state.current === 'wander')),
						setState('going'),
					),
				),
			),
			sequence(
				enteringState('bounce'),
				action((e, { bobberPosition }) => {
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
				}),
			),
			sequence(
				inState('bounce'),
				action((e) => {
					for (const player of playerQuery) {
						if (e.fishingProgress && e.fishingProgress.done === false) {
							if (player.playerControls.get('primary').justReleased) {
								e.fishingProgress.success += 1
								e.fishingProgress.done = true
							}
						}
					}
				}),
				parallel(
					condition(e => e.fishingProgress && e.fishingProgress.attempts >= 5),
					setState('runaway'),
				),
				parallel(
					condition(e => e.fishingProgress && e.fishingProgress.attempts <= 5 && e.fishingProgress.success === 3),
					action(e => ecs.remove(e)),
					action(() => stopFishing(true)),
				),
				wait('bounce', 500),
				setState('hooked'),
			),
			sequence(
				enteringState('runaway'),
				action((e) => {
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
				}),
			),
			sequence(
				inState('runaway'),
				action(e =>	e.position.add(new Vector3(0, 0, 6).multiplyScalar(time.delta / 1000).applyQuaternion(e.rotation))),
			),
		),
	),
)
