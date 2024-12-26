import type { enemy } from '@/constants/enemies'
import type { app } from '@/global/states'
import type { SubscriberSystem, UpdateSystem } from '@/lib/app'
import { enemyData } from '@/constants/enemies'
import { EnemySizes, Sizes } from '@/constants/sizes'
import { Animator } from '@/global/animator'
import { EnemyAttackStyle, type Entity, Faction } from '@/global/entity'
import { assets, ecs, levelsData, save, time } from '@/global/init'
import { collisionGroups } from '@/lib/collisionGroups'
import { inMap } from '@/lib/hierarchy'
import { modelColliderBundle } from '@/lib/models'
import { NavGrid } from '@/lib/navGrid'
import { Stat } from '@/lib/stats'
import { Timer } from '@/lib/timer'
import { enemyDefeated } from '@/particles/enemyDefeated'
import { impact } from '@/particles/impact'
import { getRandom } from '@/utils/mapFunctions'
import { ActiveEvents, Cuboid, RigidBodyType } from '@dimforge/rapier3d-compat'
import { Quaternion, Vector3 } from 'three'
import { behaviorBundle } from '../../lib/behaviors'
import { healthBundle } from './health'

export const enemyBundle = (name: enemy, level: number) => {
	const enemy = enemyData[name]
	const model = assets.characters[name]
	const scale = typeof enemy.scale === 'function' ? enemy.scale() : enemy.scale
	model.scene.scale.setScalar(scale)
	const bundle = modelColliderBundle(model.scene, RigidBodyType.Dynamic, false, EnemySizes[name] ?? Sizes.character, 'ball')
	bundle.bodyDesc.setLinearDamping(20)
	bundle.bodyDesc.setCcdEnabled(true)
	bundle.colliderDesc.setMass(100).setCollisionGroups(collisionGroups('enemy', ['obstacle', 'player', 'floor', 'enemy'])).setActiveEvents(ActiveEvents.COLLISION_EVENTS)
	const entity = {
		...behaviorBundle(enemy.behavior, 'idle'),
		...bundle,
		enemyAnimator: new Animator(bundle.model, model.animations, enemy.animationMap),
		...healthBundle(enemy.health * (level + 1)),
		targetRotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI * 2 * Math.random()),
		strength: new Stat(1 + level),
		...inMap(),
		inactive: new Timer(2000, false),
		faction: Faction.Enemy,
		enemyName: name,
		enemyDefeated: enemyDefeated(),
		enemyImpact: impact(),
		movementForce: new Vector3(),
		speed: new Stat(50 * enemy.speed),
		hitTimer: new Timer(500, false),
		sensor: { distance: bundle.size.z / 2 + 2, shape: new Cuboid(3, 2, 2) },
		healthBar: true,
		attackStyle: enemy.attackStyle,
		...(enemy.components ? enemy.components() : {}),
		...([EnemyAttackStyle.ChargingTwice, EnemyAttackStyle.RangeThrice].includes(enemy.attackStyle) ? { charges: 0 } : {}),
	} as const satisfies Entity

	if (enemy.boss) {
		Object.assign(entity, {
			boss: true,
			sensor: { distance: bundle.size.z / 2 + 2, shape: new Cuboid(5, 2, 5) },
		} as const satisfies Entity)
	}
	return entity
}
const enemyQuery = ecs.with('enemyName')
export const removeEnemyFromSpawn: SubscriberSystem<typeof app, 'dungeon'> = ({ dungeon }) => enemyQuery.onEntityRemoved.subscribe((entity) => {
	dungeon.enemies.splice(dungeon.enemies.indexOf(entity.enemyName), 1)
})
const mapQuery = ecs.with('map')
export const spawnEnemies: UpdateSystem<typeof app, 'dungeon'> = ({ dungeon, dungeonLevel }) => {
	const map = mapQuery.first
	const mapData = levelsData.levels.find(level => level.id === map?.map)
	if (!mapData?.navgrid) throw new Error('map not found')
	const navGrid = new NavGrid(mapData.navgrid, mapData.size)
	ecs.add({ navGrid, ...inMap() })
	if (!navGrid) throw new Error('navGrid not generated')
	const possiblePoints = navGrid.getSpawnPoints()
	for (const enemy of dungeon.enemies) {
		ecs.add({
			...enemyBundle(enemy, dungeonLevel),
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