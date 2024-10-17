import type { DungeonRessources } from '@/global/states'
import type { System } from '@/lib/state'
import { chestLoot } from '@/constants/chestLoot'
import { Animator } from '@/global/animator'
import { Faction } from '@/global/entity'
import { assets, ecs, tweens } from '@/global/init'
import { playSound } from '@/global/sounds'
import { inMap } from '@/lib/hierarchy'
import { chestAppearing } from '@/particles/chestAppearing'
import { sleep } from '@/utils/sleep'
import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { createBackIn, reverseEasing } from 'popmotion'
import { Vector3 } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils'
import { collectItems } from '../game/items'
import { RoomType } from './generateDungeon'
import { dropBundle, lootPool } from './lootPool'

export const lootPlayerQuery = ecs.with('player', 'lootQuantity', 'lootChance')

export const spawnChest = (dungeonLevel: number) => {
	for (const player of lootPlayerQuery) {
		const pool = chestLoot.find(lootPool => lootPool.level === dungeonLevel)
		if (!pool) throw new Error(`lootpool not found for level ${dungeonLevel}`)
		const items = lootPool(pool.items, player, pool.quantity)
		if (items.length === 0) return
		const chest = clone(assets.models.Chest.scene)
		chest.scale.setScalar(0)
		chest.rotateY(Math.PI)
		playSound('085_save_game_02', { playbackRate: 1.5 })
		playSound('202092__spookymodem__chest-opening')
		const chestEntity = ecs.add({
			...inMap(),
			model: chest,
			bodyDesc: RigidBodyDesc.fixed().lockRotations(),
			colliderDesc: ColliderDesc.cuboid(6, 4, 6).setTranslation(0, 2, 0),
			position: new Vector3(),
			chestAnimator: new Animator(chest, assets.models.Chest.animations),
			emitter: chestAppearing(),
		})
		tweens.add({
			from: 0,
			to: 8,
			ease: reverseEasing(createBackIn(4)),
			onUpdate: f => chest.scale.setScalar(f),
			onComplete: async () => {
				chestEntity.chestAnimator.playClamped('chest_open')
				await sleep(200)
				for (let i = 0; i < items.length; i++) {
					const item = items[i]
					await sleep(100)
					const angle = Math.PI / 2 + ((0.5 * Math.random()) * (Math.random() < 0.5 ? 1 : -1))
					ecs.add({
						...dropBundle(item),
						position: new Vector3(0, 5, 0),
						popDirection: new Vector3(Math.cos(angle), 1, -Math.sin(angle)).multiplyScalar(2),
					})
				}
			},
		})
	}
}

const enemiesQuery = ecs.with('faction').where(({ faction }) => faction === Faction.Enemy)

const chestQuery = ecs.with('chestAnimator')
export const endBattleSpawnChest: System<DungeonRessources> = (ressources) => {
	if (enemiesQuery.size === 0 && chestQuery.size === 0 && [RoomType.Battle, RoomType.Boss, RoomType.Entrance].includes(ressources.dungeon.type)) {
		if (!ressources.dungeon.chest) {
			spawnChest(ressources.dungeonLevel)
			ressources.dungeon.chest = true
		}
		setTimeout(() =>	collectItems(true)(), 2000)
	}
}