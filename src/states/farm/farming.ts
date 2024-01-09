import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { Easing, Tween } from '@tweenjs/tween.js'
import type { With } from 'miniplex'
import { Vector3 } from 'three'
import { Sizes } from '@/constants/sizes'
import type { Entity, crops } from '@/global/entity'
import { assets, ecs, world } from '@/global/init'
import { save, updateSave } from '@/global/save'
import { modelColliderBundle } from '@/lib/models'
import { removeEntityRef } from '@/lib/hierarchy'

const playerQuery = ecs.with('playerControls', 'sensorCollider')
const plantedSpotQuery = ecs.with('plantableSpot', 'collider', 'worldPosition', 'planted')

export const updateCropsSave = () => {
	updateSave((s) => {
		s.crops = plantedSpotQuery.entities.reduce((acc, v) => {
			return { ...acc, [v.plantableSpot]: v.planted.crop }
		}, {})
	})
}
const maxStage = (name: crops) => assets.crops[name].stages.length - 1
export const cropBundle = (grow: boolean, crop: { name: crops, stage: number }) => {
	const increaseStage = grow ? 1 : 0

	const stage = Math.min(crop.stage + increaseStage, maxStage(crop.name))
	const model = assets.crops[crop.name].stages[stage].scene.clone()
	model.scale.setScalar(10)
	const modelBundle = modelColliderBundle(model, RigidBodyType.Fixed, true, Sizes.small)
	const bundle: With<Entity, 'crop'> = {
		crop: { name: crop.name, stage },
		...modelBundle,
	}
	if (stage === 0) {
		modelBundle.model.scale.setScalar(0)
		const tween = new Tween({ scale: 0 }).to({ scale: 10 }, 1000).easing(Easing.Elastic.Out).onUpdate(({ scale }) => {
			modelBundle.model.scale.setScalar(scale)
		})
		ecs.update(bundle, { tween })
	}
	if (stage === maxStage(crop.name)) {
		bundle.interactable = 'harvest'
	}
	return bundle
}

const plantableSpotsQuery = ecs.with('plantableSpot').without('planted')

export const plantSeed = () => {
	for (const { playerControls } of playerQuery) {
		if (playerControls.get('interact').justPressed) {
			for (const spot of plantableSpotsQuery) {
				if (spot.interactionContainer) {
					if (save.crops[spot.plantableSpot] === undefined) {
						const planted = ecs.add({
							...cropBundle(false, { name: 'carrot', stage: 0 }),
							parent: spot,
							position: new Vector3(),
						})
						ecs.addComponent(spot, 'planted', planted)
					}
				}
			}
		}
	}
}
export const interactablePlantableSpot = [
	() => plantedSpotQuery.onEntityAdded.subscribe((entity) => {
		ecs.removeComponent(entity, 'interactable')
		updateCropsSave()
	}),
	() => plantableSpotsQuery.onEntityAdded.subscribe((entity) => {
		ecs.update(entity, { interactable: 'plant' })
		updateCropsSave()
	}),
]

export const harvestCrop = () => {
	for (const { playerControls, sensorCollider } of playerQuery) {
		if (playerControls.get('interact').justPressed) {
			for (const spot of plantedSpotQuery) {
				if (maxStage(spot.planted.crop.name) === spot.planted.crop.stage && world.intersectionPair(sensorCollider, spot.collider)) {
					const model = assets.crops[spot.planted.crop.name].crop.scene.clone()
					model.scale.setScalar(8)
					const bundle = modelColliderBundle(model, RigidBodyType.Fixed, true)
					ecs.add({
						...bundle,
						model,
						item: true,
						position: spot.worldPosition.clone().add(new Vector3(0, bundle.size.y + 2, 0)),
						inMap: true,
						itemLabel: spot.planted.crop.name,
					})
					removeEntityRef(spot, 'planted')
				}
			}
		}
	}
}
