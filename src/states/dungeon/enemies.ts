import type { Drop } from '@/constants/enemies'
import type { AttackStyle, ComponentsOfType, Entity, States } from '@/global/entity'
import type { app } from '@/global/states'
import type { SubscriberSystem, UpdateSystem } from '@/lib/app'
import type { characters } from '@assets/assets'
import { Animator } from '@/global/animator'
import { Faction } from '@/global/entity'

import { assets, ecs, levelsData, save, time } from '@/global/init'
import { collisionGroups } from '@/lib/collisionGroups'
import { inMap } from '@/lib/hierarchy'
import { modelColliderBundle } from '@/lib/models'
import { NavGrid } from '@/lib/navGrid'
import { Stat } from '@/lib/stats'
import { Timer } from '@/lib/timer'
import { dash } from '@/particles/dashParticles'
import { enemyDefeated } from '@/particles/enemyDefeated'
import { impact } from '@/particles/impact'
import { getRandom } from '@/utils/mapFunctions'
import { ActiveEvents, Cuboid, RigidBodyType } from '@dimforge/rapier3d-compat'
import { Quaternion, Vector3 } from 'three'
import { behaviorBundle } from '../../lib/behaviors'
import { healthBundle } from './health'

type SingleAttackStyle = {
	[K in keyof AttackStyle]: { [P in K]: AttackStyle[K] };
}[keyof AttackStyle]

export interface EnemyDef<M extends keyof Animations & characters, S extends string> {
	model: M
	name: string
	health: number
	scale: number
	speed?: number
	boss?: boolean
	drops?: Drop[]
	behavior?: keyof States
	animator: ComponentsOfType<Animator<S>>
	animationMap: { [key in S]: Animations[M] }
	components?: Partial<Entity>
	size?: Vector3
	attackStyle: SingleAttackStyle
}

export const enemyBundle = <M extends keyof Animations & characters, S extends string>(enemy: EnemyDef<M, S>, level: number) => {
	const model = assets.characters[enemy.model]
	enemy.speed ??= 1
	enemy.boss ??= false
	enemy.drops ??= []
	enemy.behavior ??= 'enemy'
	enemy.size ??= new Vector3(5, 6, 5)
	enemy.components ??= {}
	model.scene.scale.setScalar(enemy.scale)
	const bundle = modelColliderBundle(model.scene, RigidBodyType.Dynamic, false, enemy.size, 'ball')
	bundle.bodyDesc.setLinearDamping(20)
	bundle.bodyDesc.setCcdEnabled(true)
	bundle.colliderDesc.setMass(100).setCollisionGroups(collisionGroups('enemy', ['obstacle', 'player', 'floor', 'enemy'])).setActiveEvents(ActiveEvents.COLLISION_EVENTS)
	const entity = {
		...behaviorBundle(enemy.behavior, 'idle'),
		...bundle,
		...inMap(),
		...healthBundle(enemy.health * (level + 1)),
		[enemy.animator]: new Animator(bundle.model, model.animations, enemy.animationMap),
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
	} as const satisfies Entity

	if (enemy.components.charging) {
		Object.assign(entity, {
			dashParticles: dash(4),
		})
	}
	if (enemy.boss) {
		Object.assign(entity, {
			boss: true,
			sensor: { distance: bundle.size.z / 2 + 2, shape: new Cuboid(5, 2, 5) },
		} as const satisfies Entity)
	}
	return entity
}
const enemyQuery = ecs.with('faction').where(e => e.faction === Faction.Enemy)
export const removeEnemyFromSpawn: SubscriberSystem<typeof app, 'dungeon'> = ({ dungeon }) => enemyQuery.onEntityRemoved.subscribe((entity) => {
	dungeon.enemies.splice(dungeon.enemies.indexOf(entity), 1)
})
const mapQuery = ecs.with('map')

export const spawnEnemies: UpdateSystem<typeof app, 'dungeon'> = ({ dungeon }) => {
	const map = mapQuery.first
	const mapData = levelsData.levels.find(level => level.id === map?.map)
	if (!mapData?.navgrid) throw new Error('map not found')
	const navGrid = new NavGrid(mapData.navgrid, mapData.size)
	ecs.add({ navGrid, ...inMap() })
	if (!navGrid) throw new Error('navGrid not generated')
	const possiblePoints = navGrid.getSpawnPoints()
	for (const enemy of dungeon.enemies) {
		ecs.add({
			...enemy,
			position: getRandom([...possiblePoints]),
		})
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
export const unlockDungeon: SubscriberSystem<typeof app, 'dungeon'> = ressources => bossQuery.onEntityRemoved.subscribe(() => {
	save.unlockedPaths = Math.max(save.unlockedPaths, ressources.dungeonLevel + 1)
})