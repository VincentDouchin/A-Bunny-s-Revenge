import { RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { between } from 'randomish'
import type { Object3D, Object3DEventMap } from 'three'
import { Vector3 } from 'three'
import { assets, ecs } from '@/global/init'
import { playSound } from '@/global/sounds'
import { getSize } from '@/lib/models'
import { sleep } from '@/utils/sleep'
import type { Entity } from '@/global/entity'
import { inMap } from '@/lib/hierarchy'
import { updateSave } from '@/global/save'

export const spawnBouncyItems = (entity: Entity, itemModel: Object3D<Object3DEventMap>) => async (amount: number, position: Vector3) => {
	const size = getSize(itemModel)
	for (let i = 0; i < amount; i++) {
		const model = itemModel.clone()
		model.scale.setScalar(4)
		const angle = Math.random() * Math.PI * 2
		ecs.add({
			position: new Vector3(between(-5, 5), 5, between(-5, 5)).add(position),
			model,
			bodyDesc: RigidBodyDesc.dynamic().setLinvel(Math.cos(angle) * between(10, 20), Math.random() * between(20, 30), Math.sin(angle) * between(10, 20)).setAdditionalMass(0.1),
			groundLevel: size.y / 2,
			item: true,
			bounce: { amount: Math.floor(Math.random() * 4), force: new Vector3(0, between(2, 5), 0), touchedGround: false },
			...entity,
			...inMap(),

		})
		playSound(['665181__el_boss__item-or-material-pickup-pop-3-of-3', '665182__el_boss__item-or-material-pickup-pop-2-of-3', '665183__el_boss__item-or-material-pickup-pop-1-of-3'], { volume: -12 })
		await sleep(50)
	}
}

export const spawnAcorns = spawnBouncyItems({ acorn: true }, assets.items.acorn.model)
const acornQuery = ecs.with('position', 'acorn')
const playerQuery = ecs.with('player', 'position')
export const pickupAcorn = () => {
	for (const player of playerQuery) {
		for (const acorn of acornQuery) {
			if (player.position.distanceTo(acorn.position) < 5) {
				ecs.remove(acorn)
				playSound('zapsplat_multimedia_alert_action_collect_pick_up_point_or_item_79293', { volume: -20 })
				updateSave(s => s.acorns++)
			}
		}
	}
}