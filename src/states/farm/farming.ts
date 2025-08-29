import type { With } from 'miniplex'
import type { crops } from '@/constants/items'
import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { createBackIn, reverseEasing } from 'popmotion'
import { Vector3 } from 'three'
import { randFloat } from 'three/src/math/MathUtils'
import { itemsData } from '@/constants/items'
import { type Crop, type Entity, Interactable, MenuType } from '@/global/entity'
import { harvestCropEvent } from '@/global/events'
import { assets, dayTime, ecs, removeItem, save, tweens } from '@/global/init'
import { playSound } from '@/global/sounds'
import { removeEntityRef } from '@/lib/hierarchy'
import { modelColliderBundle } from '@/lib/models'
import { getWorldPosition } from '@/lib/transforms'
import { sleep } from '@/utils/sleep'
import { itemBundle } from '../game/items'
import { updateSpotWatered } from './wateringCan'

const playerQuery = ecs.with('playerControls', 'movementForce', 'inventory', 'inventoryId', 'inventorySize', 'playerAnimator')
const plantedSpotQuery = ecs.with('plantableSpot', 'planted', 'group', 'model', 'entityId')

export const updateCropsSave = () => {
	save.crops = plantedSpotQuery.entities.reduce((acc, v) => {
		return { ...acc, [v.plantableSpot]: v.planted.crop }
	}, {})
}

export const maxStage = (name: crops) => (assets.crops[name].length ?? 1) - 1
export const cropBundle = (grow: boolean, crop: NonNullable<Entity['crop']>) => {
	const increaseStage = grow ? 1 : 0
	const stage = Math.min(crop.stage + increaseStage, maxStage(crop.name))
	const model = assets.crops[crop.name][stage].scene.clone()
	model.scale.setScalar(10)
	const hole = assets.models.plantedHole.scene.clone()
	const modelBundle = modelColliderBundle(model, RigidBodyType.Fixed, true, new Vector3(4, 4, 4))
	const bundle: With<Entity, 'crop' | 'model'> = {
		crop: {
			name: crop.name,
			stage,
			luck: crop.luck,
			watered: grow ? false : crop.watered,
			planted: grow ? dayTime.dayLight : crop.planted,
		},
		...modelBundle,
		position: new Vector3(),
		withChildren(parent) {
			ecs.add({
				parent,
				position: new Vector3(),
				model: hole,
			})
		},
	}

	if (stage === 0) {
		modelBundle.model.scale.setScalar(0)
		tweens.add({
			from: 0,
			to: 10,
			duration: 500,
			ease: reverseEasing(createBackIn(3)),
			onUpdate: f => modelBundle.model.scale.setScalar(f),
		})
	}
	if (stage === maxStage(crop.name)) {
		bundle.interactable = Interactable.Harvest
	} else {
		bundle.interactable = Interactable.Water
	}
	return bundle
}

const plantableSpotsQuery = ecs.with('plantableSpot').without('planted')

export const plantSeed = () => {
	for (const player of playerQuery) {
		const { playerControls, inventory } = player
		if (playerControls.get('primary').justPressed) {
			for (const spot of plantableSpotsQuery) {
				const seed = inventory.filter(Boolean).find((item) => {
					const itemData = itemsData[item.name]
					return 'seed' in itemData && itemData.seed === save.selectedSeed && item.quantity > 0
				})
				if (spot.interactionContainer && save.selectedSeed && seed) {
					if (save.crops[spot.plantableSpot] === undefined) {
						const planted = ecs.add({
							...cropBundle(false, { name: save.selectedSeed, stage: 0, watered: false, luck: 0, planted: dayTime.dayLight }),
							parent: spot,
							position: new Vector3(),
						})
						removeItem(player, { name: seed.name, quantity: 1 })
						ecs.addComponent(spot, 'planted', planted)
					}
				}
			}
		}
	}
}

export const initPlantableSpotsInteractions = () => {
	for (const spot of plantableSpotsQuery) {
		ecs.update(spot, { interactable: Interactable.Plant })
	}
}
export const interactablePlantableSpot = [
	() => plantedSpotQuery.onEntityAdded.subscribe((entity) => {
		ecs.removeComponent(entity, 'interactable')
		updateCropsSave()
	}),
	() => plantableSpotsQuery.onEntityAdded.subscribe((entity) => {
		ecs.update(entity, { interactable: Interactable.Plant })
		updateCropsSave()
	}),
]

const touchedPlantableSpotQuery = plantableSpotsQuery.with('interactionContainer')

export const harvestCrop = async () => {
	for (const player of playerQuery) {
		const { playerControls, playerAnimator } = player
		if (playerControls.get('secondary').justPressed) {
			for (const spot of touchedPlantableSpotQuery) {
				if (save.inventories.player.some((item) => {
					const itemData = itemsData[item.name]
					return 'seed' in itemData
				})) {
					ecs.addComponent(spot, 'menuType', MenuType.SelectSeed)
				}
			}
		}
		if (playerControls.get('primary').justPressed && playerAnimator.current !== 'pickup') {
			for (const spot of plantedSpotQuery) {
				if (spot.planted.interactionContainer && maxStage(spot.planted.crop.name) === spot.planted.crop.stage) {
					playerAnimator.playOnce('pickup')?.then(async () => {
						playerAnimator.playAnimation('idle')
						const extraDrops = Math.floor(spot.planted.crop.luck)
						const extraChance = Math.random() < (spot.planted.crop.luck % 1) ? 1 : 0
						const totalDrops = 1 + extraDrops + extraChance
						for (let i = 0; i < totalDrops; i++) {
							const bundle = itemBundle(spot.planted.crop.name)
							const position = getWorldPosition(spot.group)
							ecs.add({
								...bundle,

								position: position.add(new Vector3(0, bundle.size.y + randFloat(4, 6), 0)),
							})
							await sleep(100)
						}
						playSound(['zapsplat_foley_fern_pull_from_ground_18385', 'zapsplat_foley_moss_grass_clump_pull_rip_from_ground_70635'])
						harvestCropEvent.emit(spot.entityId, spot.planted.crop.name)
						removeEntityRef(spot, 'planted')
					})
				}
			}
		}
	}
}
export const getGrowthStages = (crop: Crop) => Math.floor((dayTime.dayLight - crop.planted) / (dayTime.dayLength / 2))
const cropsQuery = ecs.with('crop')
export const growCrops = () => {
	const changed: With<Entity, 'crop'>[] = []
	for (const entity of cropsQuery) {
		const stages = getGrowthStages(entity.crop)
		if (stages > 0 && entity.crop.stage < maxStage(entity.crop.name)) {
			changed.push(entity)
		}
	}
	if (changed.length > 0) {
		for (const plot of plantedSpotQuery) {
			for (const toGrow of changed) {
				if (plot.planted === toGrow) {
					removeEntityRef(plot, 'planted')
					const planted = ecs.add({
						parent: plot,
						...cropBundle(true, toGrow.crop),
					})
					if (toGrow.crop.watered) {
						updateSpotWatered(plot, false, false)
					}
					ecs.update(plot, { planted })
				}
			}
		}
		updateCropsSave()
	}
}