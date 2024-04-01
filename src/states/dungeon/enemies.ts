import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { Vector3 } from 'three'
import { healthBundle } from './health'
import type { enemy } from '@/constants/enemies'
import { enemyData } from '@/constants/enemies'
import { Sizes } from '@/constants/sizes'
import { Animator } from '@/global/animator'
import { type Entity, Faction } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import { modelColliderBundle } from '@/lib/models'
import { stateBundle } from '@/lib/stateMachine'
import type { Subscriber } from '@/lib/state'
import type { DungeonRessources } from '@/global/states'
import { Stat } from '@/lib/stats'

export const enemyBundle = (name: enemy, level: number) => {
	const enemy = enemyData[name]
	const model = assets.characters[name]
	model.scene.scale.setScalar(enemy.scale)
	const bundle = modelColliderBundle(model.scene, RigidBodyType.Dynamic, false, Sizes.character)
	bundle.bodyDesc.setLinearDamping(20)
	const boss = enemy.boss ? { boss: true } as const : {}
	return {
		...bundle,
		[enemy.animator]: new Animator(bundle.model, model.animations),
		...healthBundle(enemy.health * (level + 1)),
		...boss,
		strength: new Stat(1 + level),
		inMap: true,
		faction: Faction.Enemy,
		enemyName: name,
		movementForce: new Vector3(),
		speed: 100,
		drops: enemy.drops,
		sensor: true,
		healthBar: true,
		...stateBundle<'dying' | 'idle' | 'running' | 'hit' | 'dead' | 'waitingAttack' | 'attacking' | 'attackCooldown'>('idle', {
			idle: ['running', 'hit', 'waitingAttack'],
			running: ['idle', 'hit', 'waitingAttack'],
			dying: ['dead'],
			hit: ['dying', 'idle'],
			dead: [],
			waitingAttack: ['idle', 'attacking', 'hit'],
			attacking: ['attackCooldown', 'hit'],
			attackCooldown: ['idle', 'hit'],
		}),
	} as const satisfies Entity
}
const enemyQuery = ecs.with('enemyName')
export const removeEnemyFromSpawn: Subscriber<DungeonRessources> = ({ dungeon }) => enemyQuery.onEntityRemoved.subscribe((entity) => {
	dungeon.enemies.splice(dungeon.enemies.indexOf(entity.enemyName), 1)
})
