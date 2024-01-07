import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { Easing, Tween } from '@tweenjs/tween.js'
import { Vector3 } from 'three'
import { assets, ecs, world } from '@/global/init'
import { save, updateSave } from '@/global/save'
import type { FarmRessources } from '@/global/states'
import { modelColliderBundle } from '@/lib/models'
import type { System } from '@/lib/state'
import { Sizes } from '@/constants/sizes'
import { isInIntersectionWithCollider } from '@/lib/transforms'

const playerQuery = ecs.with('playerControls', 'sensorCollider')
const cropsQuery = ecs.with('position', 'crop')

const updateCropsSave = () => {
	updateSave((s) => {
		s.crops = [...cropsQuery].map(({ crop, position }) => ({ ...crop, x: position.x, z: position.z }))
	})
}

export const plantSeed = () => {
	for (const { playerControls, sensorCollider } of playerQuery) {
		if (playerControls.get('plant').justPressed) {
			if (isInIntersectionWithCollider(sensorCollider)) return
			const pos = sensorCollider.translation()
			const position = new Vector3(pos.x, pos.y, pos.z).divideScalar(5).round().multiplyScalar(5)
			if (![...cropsQuery].some(otherCrop => otherCrop.position.x === position.x && otherCrop.position.z === position.z)) {
				ecs.add({
					position,
					inMap: true,
					crop: { stage: 0, name: 'carrot' },
				})
				updateCropsSave()
			}
		}
	}
}
export const addCropModel = () => ecs.with('crop').without('model').onEntityAdded.subscribe((entity) => {
	const model = assets.crops[entity.crop.name].stages[entity.crop.stage].scene.clone()
	model.scale.setScalar(10)
	const bundle = modelColliderBundle(model, RigidBodyType.Fixed, true, Sizes.small)
	ecs.update(entity, bundle)

	if (entity.crop.stage === 0) {
		ecs.addComponent(entity, 'scale', 0)
		const tween = new Tween(entity).to({ scale: 1 }, 1000).easing(Easing.Elastic.Out)
		ecs.update(entity, { tween })
	}
})

export const spawnCrops: System<FarmRessources> = ({ previousState }) => {
	for (const crop of save.crops) {
		const increaseStage = previousState === 'dungeon' ? 1 : 0
		const stage = Math.min(crop.stage + increaseStage, assets.crops[crop.name].stages.length - 1)
		ecs.add({
			crop: { name: crop.name, stage },
			position: new Vector3(crop.x, 0, crop.z),
			inMap: true,
			interactable: true,
		})
	}
}

const cropsColliderQuery = cropsQuery.with('collider')

export const harvestCrop = () => {
	for (const { playerControls, sensorCollider } of playerQuery) {
		if (playerControls.get('plant').justPressed) {
			for (const cropEntity of cropsColliderQuery) {
				const { collider, crop, position } = cropEntity
				if (crop.stage === assets.crops[crop.name].stages.length - 1 && world.intersectionPair(sensorCollider, collider)) {
					ecs.remove(cropEntity)
					const model = assets.crops[crop.name].crop.scene.clone()
					model.scale.setScalar(8)
					const bundle = modelColliderBundle(model, RigidBodyType.Fixed, true)
					ecs.add({
						...bundle,
						model,
						item: true,
						position: position.clone().add(new Vector3(0, bundle.size.y + 2, 0)),
						inMap: true,
						itemLabel: crop.name,
					})
				}
			}
		}
	}
}

export const saveCrops = [() => cropsQuery.onEntityAdded.subscribe(updateCropsSave), () => cropsQuery.onEntityRemoved.subscribe(updateCropsSave)]