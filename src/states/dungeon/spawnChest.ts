import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { Easing, Tween } from '@tweenjs/tween.js'
import { between } from 'randomish'
import { Vector3 } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils'
import { itemBundle } from '../game/items'
import { enableBasketUi } from '../game/spawnBasket'
import { itemsData } from '@/constants/items'
import { Animator } from '@/global/animator'
import { Faction } from '@/global/entity'
import { assets, ecs } from '@/global/init'
import { chestAppearing } from '@/particles/chestAppearing'
import { entries, getRandom, range } from '@/utils/mapFunctions'
import { sleep } from '@/utils/sleep'

export const spawnChest = () => {
	const chest = clone(assets.models.Chest.scene)
	chest.scale.setScalar(0)
	chest.rotateY(Math.PI)
	const chestEntity = ecs.add({
		inMap: true,
		model: chest,
		bodyDesc: RigidBodyDesc.fixed().lockRotations(),
		colliderDesc: ColliderDesc.cuboid(6, 4, 6).setTranslation(0, 2, 0),
		position: new Vector3(),
		chestAnimator: new Animator(chest, assets.models.Chest.animations),
		tween: new Tween(chest.scale).to(new Vector3(8, 8, 8)).onComplete(async () => {
			chestEntity.chestAnimator.playClamped('chest_open')
			const seeds = entries(itemsData).filter(([_, data]) => data.seed).map(([name]) => name)
			const items = range(1, between(3, 5), () => getRandom(seeds))
			if (Math.random() > 0.5) {
				items.push('egg')
			}
			if (Math.random() > 0.5) {
				items.push('cinnamon')
			}
			await sleep(200)
			for (let i = 0; i < items.length; i++) {
				const seed = items[i]
				await sleep(100)
				const angle = Math.PI * i / (items.length - 1)
				ecs.add({
					parent: chestEntity,
					...itemBundle(seed),
					position: new Vector3(0, 5, 0),
					popDirection: new Vector3(Math.cos(angle), 1, -Math.sin(angle)).multiplyScalar(2),
				})
			}
		}).easing(Easing.Exponential.Out),
		emitter: chestAppearing(),
	})
}

const enemiesQuery = ecs.with('faction').where(({ faction }) => faction === Faction.Enemy)
export const endBattleSpawnChest = () => enemiesQuery.onEntityRemoved.subscribe(() => {
	if (enemiesQuery.size === 1) {
		spawnChest()
		enableBasketUi()
	}
})