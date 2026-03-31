import type { Animations } from '@assets/animations'
import type { Drop } from '@/constants/enemies'
import type { AssetNames, AttackStyle, ComponentsOfType, Entity } from '@/global/entity'
import type { app } from '@/global/states'
import type { SubscriberSystem, UpdateSystem } from '@/lib/app'
import { ActiveEvents, Cuboid, RigidBodyType } from '@dimforge/rapier3d-compat'
import { DEFAULT_QUERY_FILTER, findRandomPoint } from 'navcat'
import { generateUUID } from 'three/src/math/MathUtils.js'
import { BoxGeometry, Mesh, Quaternion, Vector3 } from 'three/webgpu'
import { State } from '@/behaviors/state'
import { Animator } from '@/global/animator'
import { Faction } from '@/global/entity'
import { assets, ecs, save, time } from '@/global/init'
import { modelColliderBundle } from '@/lib/colliders'
import { collisionGroups } from '@/lib/collisionGroups'
import { inMap } from '@/lib/hierarchy'
import { getParticleFromPool } from '@/lib/particles'
import { Stat } from '@/lib/stats'
import { Timer } from '@/lib/timer'
import { impact } from '@/particles/impact'
import { opt } from '@/utils/mapFunctions'
import { collectItems } from '../game/items'
import { healthBundle } from './health'
import { spawnChest } from './spawnChest'

type SingleAttackStyle = {
	[K in keyof AttackStyle]: { [P in K]: AttackStyle[K] }
}[keyof AttackStyle]

export interface EnemyDef<M extends keyof Animations & AssetNames['characters'], A extends string, S extends ComponentsOfType<State<any>>> {
	model: M
	name: string
	health: number
	scale: number
	speed?: number
	boss?: boolean
	drops?: Drop[]
	state: S
	defaultState: Required<Entity>[S] extends State<infer U> ? U : never
	animator: ComponentsOfType<Animator<A>>
	animationMap: { [key in A]: Animations[M] }
	components?: Partial<Entity>
	size?: Vector3
	defaultAnimation?: NoInfer<A>
	attackStyle: SingleAttackStyle
}

export const enemyBundle = <M extends keyof Animations & AssetNames['characters'], A extends string, S extends ComponentsOfType<State<any>>>(enemy: EnemyDef<M, A, S>, level: number) => {
	const model = assets.characters[enemy.model]
	enemy.speed ??= 1
	enemy.boss ??= false
	enemy.drops ??= []
	enemy.size ??= new Vector3(5, 6, 5)
	enemy.components ??= {}
	model.scene.scale.setScalar(enemy.scale)
	const bundle = modelColliderBundle(model.scene, RigidBodyType.Dynamic, false, enemy.size, 'ball')
	bundle.bodyDesc.setLinearDamping(20).setCcdEnabled(true).setDominanceGroup(1)
	bundle.colliderDesc
		.setMass(100)
		.setCollisionGroups(collisionGroups('enemy', ['obstacle', 'player', 'floor', 'enemy']))
		.setActiveEvents(ActiveEvents.COLLISION_EVENTS)
	const animator = new Animator<A>(bundle.model, model.animations, enemy.animationMap)
	const entity = {
		enemyId: generateUUID(),
		[enemy.state]: new State(enemy.defaultState),
		[enemy.animator]: animator,
		...bundle,
		...healthBundle(enemy.health * (level + 1)),
		targetRotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI * 2 * Math.random()),
		strength: new Stat(1 + level),
		inactive: new Timer(2000, false),
		faction: Faction.Enemy,
		enemyImpact: impact(),
		enemyName: enemy.name,
		movementForce: new Vector3(),
		speed: new Stat(50 * enemy.speed),
		hitTimer: new Timer(500, false),
		sensor: { distance: bundle.size.z / 2 + 2, shape: new Cuboid(3, 2, 2) },
		healthBar: true,
		drops: enemy.drops,
		...enemy.attackStyle,
		...enemy.components,
		withChildren(parent) {
			if ('charging' in enemy.attackStyle) {
				ecs.update(parent, {
					dashParticles: getParticleFromPool('dashParticles', bundle.model),
				})
			}
			ecs.update(parent, {
				enemyDefeatedParticles: getParticleFromPool('enemyDefeatedParticles', bundle.model),
			})
		},
		...opt(enemy.boss, { boss: true, sensor: { distance: bundle.size.z / 2 + 2, shape: new Cuboid(5, 5, 5) } }),
	} as const satisfies Entity

	if (enemy.defaultAnimation) {
		animator.init(enemy.defaultAnimation)
	}

	return entity
}
const enemyQuery = ecs.with('faction', 'enemyId').where((e) => e.faction === Faction.Enemy)
const chestLocation = ecs.with('dungeonChest', 'position', 'rotation')
export const removeEnemyFromSpawn: SubscriberSystem<typeof app, 'dungeon'> = ({ dungeon, dungeonLevel }) =>
	enemyQuery.onEntityRemoved.subscribe((entity) => {
		dungeon.enemies = dungeon.enemies.filter((e) => e.enemyId !== entity.enemyId)
		if (dungeon.enemies.length === 0) {
			if (!dungeon.chest) {
				for (const parent of chestLocation) {
					ecs.add({
						...spawnChest(dungeonLevel),
						parent,
					})
				}
				dungeon.chest = true
			}
			setTimeout(() => collectItems(true)(), 2000)
		}
	})

// debug
export const displaySensors = () =>
	ecs.with('sensor', 'group', 'rotation').onEntityAdded.subscribe((e) => {
		if (e.sensor.shape instanceof Cuboid) {
			const { x, y, z } = e.sensor.shape.halfExtents
			const box = new Mesh(new BoxGeometry(x * 2, y * 2, z * 2))
			box.position.add(new Vector3(0, y, e.sensor.distance).applyQuaternion(e.rotation))
			e.group.add(box)
		}
	})

export const spawnEnemies: UpdateSystem<typeof app, 'dungeon'> = ({ dungeon }) => {
	for (const enemy of dungeon.enemies) {
		const point = findRandomPoint(dungeon.plan.navMesh!, DEFAULT_QUERY_FILTER, Math.random)
		if (point.success) {
			ecs.add(
				inMap({
					...enemy,
					position: new Vector3(...point.position),
				}),
			)
		}
	}
}

const inactiveQuery = ecs.with('inactive')
export const tickInactiveTimer = () => {
	for (const entity of inactiveQuery) {
		entity.inactive.tick(time.delta)
		if (entity.inactive.finished()) {
			ecs.removeComponent(entity, 'inactive')
		}
	}
}

const bossQuery = ecs.with('boss')
export const unlockDungeon: SubscriberSystem<typeof app, 'dungeon'> = (resources) =>
	bossQuery.onEntityRemoved.subscribe(() => {
		save.unlockedPaths = Math.max(save.unlockedPaths, resources.dungeonLevel + 1)
	})
