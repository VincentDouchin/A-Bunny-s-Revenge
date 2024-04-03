import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { Easing, Tween } from '@tweenjs/tween.js'
import { between } from 'randomish'
import { Vector3 } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils'
import { itemBundle } from '../game/items'
import { enableBasketUi } from '../game/spawnBasket'
import type { Drop } from '@/constants/enemies'
import { lootPool } from '@/constants/enemies'
import { itemsData } from '@/constants/items'
import { Animator } from '@/global/animator'
import { Faction } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import type { DungeonRessources } from '@/global/states'
import { inMap } from '@/lib/hierarchy'
import type { Subscriber } from '@/lib/state'
import { chestAppearing } from '@/particles/chestAppearing'
import { entries, getRandom, range } from '@/utils/mapFunctions'
import { sleep } from '@/utils/sleep'

export const lootPlayerQuery = ecs.with('player', 'lootQuantity', 'lootChance')

export const spawnChest = (dungeonLevel: number) => {
	for (const player of lootPlayerQuery) {
		const chest = clone(assets.models.Chest.scene)
		chest.scale.setScalar(0)
		chest.rotateY(Math.PI)
		const chestEntity = ecs.add({
			...inMap(),
			model: chest,
			bodyDesc: RigidBodyDesc.fixed().lockRotations(),
			colliderDesc: ColliderDesc.cuboid(6, 4, 6).setTranslation(0, 2, 0),
			position: new Vector3(),
			chestAnimator: new Animator(chest, assets.models.Chest.animations),
			tween: new Tween(chest.scale).to(new Vector3(8, 8, 8)).onComplete(async () => {
				chestEntity.chestAnimator.playClamped('chest_open')

				const possibleDrops: Drop[] = []
				for (const [name, data] of entries(itemsData)) {
					if (data.drop && data.drop.level <= dungeonLevel) {
						possibleDrops.push({ name, rarity: data.drop.rarity, quantity: 1 })
					}
				}
				const drops = range(0, between(3, 5), () => getRandom(possibleDrops))
				const items = lootPool(player.lootQuantity.value, player.lootChance.value, drops)
				await sleep(200)
				for (let i = 0; i < items.length; i++) {
					const seed = items[i]
					await sleep(100)
					const angle = Math.PI * i / (items.length - 1)
					ecs.add({
						...itemBundle(seed.name),
						position: new Vector3(0, 5, 0),
						popDirection: new Vector3(Math.cos(angle), 1, -Math.sin(angle)).multiplyScalar(2),
					})
				}
			}).easing(Easing.Exponential.Out),
			emitter: chestAppearing(),
		})
	}
}

const enemiesQuery = ecs.with('faction').where(({ faction }) => faction === Faction.Enemy)
export const endBattleSpawnChest: Subscriber<DungeonRessources> = ressources => enemiesQuery.onEntityRemoved.subscribe(() => {
	setTimeout(() => {
		if (enemiesQuery.size === 0) {
			spawnChest(ressources.dungeonLevel)
			enableBasketUi()
		}
	}, 100)
})