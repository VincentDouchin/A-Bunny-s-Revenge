import type { Animations } from '@assets/animations'
import type { Drop } from '@/constants/enemies'
import type { AssetNames, AttackStyle, ComponentsOfType, Entity, stateBundle } from '@/global/entity'
import type { app } from '@/global/states'
import type { SubscriberSystem } from '@/lib/app'
import { ActiveEvents, Cuboid, RigidBodyType } from '@dimforge/rapier3d-compat'
import { BoxGeometry, Mesh, Quaternion, Vector3 } from 'three'
import { generateUUID } from 'three/src/math/MathUtils'
import { Animator } from '@/global/animator'
import { Faction } from '@/global/entity'
import { assets, ecs, save, time } from '@/global/init'
import { modelColliderBundle } from '@/lib/colliders'
import { collisionGroups } from '@/lib/collisionGroups'
import { Stat } from '@/lib/stats'
import { Timer } from '@/lib/timer'
import { dash } from '@/particles/dashParticles'
import { enemyDefeated } from '@/particles/enemyDefeated'
import { impact } from '@/particles/impact'
import { getRandom, opt } from '@/utils/mapFunctions'
import { collectItems } from '../game/items'
import { healthBundle } from './health'
import { spawnChest } from './spawnChest'

type SingleAttackStyle = {
	[K in keyof AttackStyle]: { [P in K]: AttackStyle[K] };
}[keyof AttackStyle]

export interface EnemyDef<M extends keyof Animations & AssetNames['characters'], S extends string> {
	model: M
	name: string
	health: number
	scale: number
	speed?: number
	boss?: boolean
	drops?: Drop[]
	state: ReturnType<typeof stateBundle>
	animator: ComponentsOfType<Animator<S>>
	animationMap: { [key in S]: Animations[M] }
	components?: Partial<Entity>
	size?: Vector3
	defaultAnimation?: NoInfer<S>
	attackStyle: SingleAttackStyle
}

export const enemyBundle = <M extends keyof Animations & AssetNames['characters'], S extends string>(enemy: EnemyDef<M, S>, level: number) => {
	const model = assets.characters[enemy.model]
	enemy.speed ??= 1
	enemy.boss ??= false
	enemy.drops ??= []
	enemy.size ??= new Vector3(5, 6, 5)
	enemy.components ??= {}
	model.scene.scale.setScalar(enemy.scale)
	const bundle = modelColliderBundle(model.scene, RigidBodyType.Dynamic, false, enemy.size, 'ball')
	bundle.bodyDesc
		.setLinearDamping(20)
		.setCcdEnabled(true)
		.setDominanceGroup(1)
	bundle.colliderDesc
		.setMass(100)
		.setCollisionGroups(collisionGroups('enemy', ['obstacle', 'player', 'floor', 'enemy']))
		.setActiveEvents(ActiveEvents.COLLISION_EVENTS)
	// bundle.model.frustumCulled = false
	// bundle.model.traverse(o => o.frustumCulled = false)
	const animator = new Animator<S>(bundle.model, model.animations, enemy.animationMap)
	const entity = {
		enemyId: generateUUID(),
		...enemy.state,
		...bundle,
		...healthBundle(enemy.health * (level + 1)),
		[enemy.animator]: animator,
		targetRotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI * 2 * Math.random()),
		strength: new Stat(1 + level),
		inactive: new Timer(2000, false),
		faction: Faction.Enemy,
		enemyDefeated: enemyDefeated(),
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
		...opt('charging' in enemy.attackStyle, { dashParticles: dash(8) }),
		...opt(enemy.boss, { boss: true, sensor: { distance: bundle.size.z / 2 + 2, shape: new Cuboid(5, 5, 5) } }),
	} as const satisfies Entity

	if (enemy.defaultAnimation) {
		animator.init(enemy.defaultAnimation)
	}

	return entity
}
const enemyQuery = ecs.with('faction', 'enemyId').where(e => e.faction === Faction.Enemy)
export const removeEnemyFromSpawn: SubscriberSystem<typeof app, 'dungeon'> = ({ dungeon, dungeonLevel }) => enemyQuery.onEntityRemoved.subscribe((entity) => {
	dungeon.enemies = dungeon.enemies.filter(e => e.enemyId !== entity.enemyId)
	if (dungeon.enemies.length === 0) {
		if (!dungeon.chest) {
			spawnChest(dungeonLevel)
			dungeon.chest = true
		}
		setTimeout(() => collectItems(true)(), 2000)
	}
})

// debug
export const displaySensors = () => ecs.with('sensor', 'group', 'rotation').onEntityAdded.subscribe((e) => {
	if (e.sensor.shape instanceof Cuboid) {
		const { x, y, z } = e.sensor.shape.halfExtents
		const box = new Mesh(new BoxGeometry(x * 2, y * 2, z * 2))
		box.position.add(new Vector3(0, y, e.sensor.distance).applyQuaternion(e.rotation))
		e.group.add(box)
	}
})

const dungeonQuery = ecs.with('dungeon')

export const spawnEnemies = () => {
	for (const e of dungeonQuery) {
		const possiblePoints = e.dungeon.navgrid.getSpawnPoints()
		for (const enemy of e.dungeon.enemies) {
			ecs.add({
				...enemy,
				position: getRandom([...possiblePoints]),
				parent: e,
			})
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
export const unlockDungeon: SubscriberSystem<typeof app, 'dungeon'> = resources => bossQuery.onEntityRemoved.subscribe(() => {
	save.unlockedPaths = Math.max(save.unlockedPaths, resources.dungeonLevel + 1)
})
