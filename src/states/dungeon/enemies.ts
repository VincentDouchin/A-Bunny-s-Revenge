import { ActiveCollisionTypes, ColliderDesc, RigidBodyType } from '@dimforge/rapier3d-compat'
import { Quaternion, Vector3 } from 'three'
import { behaviorBundle } from '../../lib/behaviors'
import { healthBundle } from './health'
import type { enemy } from '@/constants/enemies'
import { enemyData } from '@/constants/enemies'
import { EnemySizes, Sizes } from '@/constants/sizes'
import { Animator } from '@/global/animator'
import { type Entity, Faction } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import type { DungeonRessources } from '@/global/states'
import { inMap } from '@/lib/hierarchy'
import { modelColliderBundle } from '@/lib/models'
import type { Subscriber, System } from '@/lib/state'
import { Stat } from '@/lib/stats'
import { Timer } from '@/lib/timer'
import { getRandom } from '@/utils/mapFunctions'

export const enemyBundle = (name: enemy, level: number) => {
	const enemy = enemyData[name]
	const model = assets.characters[name]
	model.scene.scale.setScalar(enemy.scale)
	const bundle = modelColliderBundle(model.scene, RigidBodyType.Dynamic, false, EnemySizes[name] ?? Sizes.character)
	bundle.bodyDesc.setLinearDamping(20)

	bundle.colliderDesc.setMass(100)
	const entity = {
		...behaviorBundle(enemy.behavior, 'idle'),
		...bundle,
		enemyAnimator: new Animator(bundle.model, model.animations, enemy.animationMap),
		...healthBundle(enemy.health * (level + 1)),
		targetRotation: new Quaternion(),
		strength: new Stat(1 + level),
		...inMap(),
		faction: Faction.Enemy,
		enemyName: name,
		movementForce: new Vector3(),
		speed: new Stat(50 * enemy.speed),
		hitTimer: new Timer(500, false),
		drops: enemy.drops,
		sensorDesc: ColliderDesc.cuboid(3, 2, 2).setTranslation(0, 1, bundle.size.z / 2 + 2).setSensor(true).setMass(0).setActiveCollisionTypes(ActiveCollisionTypes.ALL),
		healthBar: true,
		attackStyle: enemy.attackStyle,
		...(enemy.components ? enemy.components() : {}),
	} as const satisfies Entity
	if (enemy.boss) {
		Object.assign(entity, {
			boss: true,
			sensorDesc: ColliderDesc.cuboid(5, 2, 5).setTranslation(0, 1, bundle.size.z / 2 + 2).setSensor(true).setMass(0).setActiveCollisionTypes(ActiveCollisionTypes.ALL),
		} as const satisfies Entity)
	}
	return entity
}
const enemyQuery = ecs.with('enemyName')
export const removeEnemyFromSpawn: Subscriber<DungeonRessources> = ({ dungeon }) => enemyQuery.onEntityRemoved.subscribe((entity) => {
	dungeon.enemies.splice(dungeon.enemies.indexOf(entity.enemyName), 1)
})
const navGridQuery = ecs.with('navGrid')
export const spawnEnemies: System<DungeonRessources> = ({ dungeon, dungeonLevel }) => {
	const navGrid = navGridQuery.first?.navGrid
	if (!navGrid) throw new Error('navGrid not generated')
	const possiblePoints = navGrid.spawnPoints
	for (const enemy of dungeon.enemies) {
		ecs.add({
			...enemyBundle(enemy, dungeonLevel),
			position: getRandom([...possiblePoints]),
		})
	}
}