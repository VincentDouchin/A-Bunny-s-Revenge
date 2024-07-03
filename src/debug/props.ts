import type { fruit_trees, gardenPlots, models, vegetation } from '@assets/assets'
import { ActiveCollisionTypes, ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import type { With } from 'miniplex'
import type { BufferGeometry, Object3DEventMap } from 'three'
import { Color, DoubleSide, Euler, Group, Material, Mesh, MeshPhongMaterial, Object3D, PointLight, Quaternion, Vector3 } from 'three'

import FastNoiseLite from 'fastnoise-lite'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils'
import type { EntityData, ModelName } from './LevelEditor'
import { dialogs } from '@/constants/dialogs'
import { Animator } from '@/global/animator'
import type { Entity } from '@/global/entity'
import { Interactable, MenuType } from '@/global/entity'

import { assets, ecs } from '@/global/init'
import { save } from '@/global/save'
import type { DungeonRessources, FarmRessources } from '@/global/states'
import { dungeonState, genDungeonState } from '@/global/states'

import { itemsData } from '@/constants/items'
import { Direction } from '@/lib/directions'
import { inMap } from '@/lib/hierarchy'
import { getSecondaryColliders } from '@/lib/models'
import { GardenPlotMaterial } from '@/shaders/materials'
import { RoomType } from '@/states/dungeon/generateDungeon'
import { cropBundle } from '@/states/farm/farming'
import { openMenu } from '@/states/farm/openInventory'
import { wateringCanBundle } from '@/states/farm/wateringCan'
import { dialogBundle } from '@/states/game/dialog'
import { doorSide } from '@/states/game/spawnDoor'
import { lockPlayer, unlockPlayer } from '@/utils/dialogHelpers'
import { sleep } from '@/utils/sleep'

export const customModels = {
	door: doorSide,
} as const satisfies Record<string, () => Object3D<Object3DEventMap>>
export type customModel = keyof typeof customModels
export const getModel = (key: ModelName): Object3D => {
	if (key in customModels) {
		// @ts-expect-error okok
		return customModels[key]()
	}
	for (const model of ['vegetation', 'gardenPlots', 'fruitTrees', 'models'] as const) {
		if (key in assets[model]) {
		// @ts-expect-error okok
			return clone(assets[model][key].scene)
		}
	}
	throw new Error(`Coudln\'t find model ${key}`)
}
export interface ExtraData {
	'door': {
		direction: Direction
		doorLevel: number
	}
	'Vine gate': {
		direction: Direction
		doorLevel: number
	}
	'sign': {
		text: string
	}

}

type BundleFn<E extends EntityData<any>> = (entity: With<Entity, 'entityId' | 'model' | 'position' | 'rotation' >, data: NonNullable<E>, ressources: FarmRessources | DungeonRessources | void) => Entity

export interface PlacableProp<N extends string> {
	name: N
	models: (models | customModel | vegetation | gardenPlots | fruit_trees)[]
	data?: N extends keyof ExtraData ? ExtraData[N] : undefined
	bundle?: BundleFn<EntityData<N extends keyof ExtraData ? NonNullable<ExtraData[N]> : never>>
}
type propNames = 'log' | 'door' | 'rock' | 'board' | 'oven' | 'CookingPot' | 'stove' | 'Flower/plants' | 'sign' | 'plots' | 'bush' | 'fence' | 'house' | 'mushrooms' | 'lamp' | 'Kitchen' | 'berry bushes' | 'bench' | 'well' | 'fruit trees' | 'stall' | 'Vine gate' | 'fishing deck' | 'pillar'

type Props = ({ [k in propNames]: PlacableProp<k> }[propNames])[]
export const props: Props = [
	{
		name: 'log',
		models: ['WoodLog', 'WoodLog_Moss', 'TreeStump', 'TreeStump_Moss'],
		bundle: entity => ({ ...entity, obstacle: true }),
	},
	{
		name: 'door',
		data: { direction: Direction.N, doorLevel: 0 },
		models: ['door'],
		bundle: (entity, data, ressources) => {
			if (dungeonState.enabled && ressources && 'dungeon' in ressources) {
				const isBattle = [RoomType.Battle, RoomType.Boss, RoomType.Entrance].includes(ressources.dungeon.type)
				const enemiesPresent = ressources.dungeon.enemies.length > 0
				if (isBattle && enemiesPresent) {
					entity.doorLocked = true
				}
			}
			if (genDungeonState.enabled && data.data.direction === 'north') {
				entity.doorLevel = data.data.doorLevel
				entity.doorLocked = true
			}
			if (ressources && 'dungeon' in ressources && data.data.direction) {
				const isBossEntrance = ressources.dungeon.doors[data.data.direction]?.type === RoomType.Boss
				const isBossRoom = ressources.dungeon.type === RoomType.Boss && ressources.dungeon.doors[data.data.direction] !== null
				const isEntrance = ressources.dungeon.type === RoomType.Entrance && ressources.dungeon.doors[data.data.direction] === null
				let model: Object3D | null = null
				if (isBossEntrance || isBossRoom) {
					model = assets.models.Gate_Thorns.scene.clone()
					entity.vineGate = true
					if (isBossRoom) {
						model.rotateY(Math.PI)
					}
				} else if (isEntrance) {
					model = assets.models.Gate_Vines.scene.clone()
					entity.vineGate = true
					model.rotateY(Math.PI)
				}
				if (model) {
					Object.assign(entity, getSecondaryColliders(model))
					entity.model = model
				}
			}
			return {
				door: data.data.direction,
				...entity,
			}
		},
	},
	{
		name: 'rock',
		models: ['Rock_1', 'Rock_2', 'Rock_3', 'Rock_4', 'Rock_5', 'Rock_6', 'Rock_7'],
		bundle: entity => ({ ...entity, obstacle: true }),
	},
	{
		name: 'bush',
		models: ['Bush_1', 'Bush_2', 'SM_Env_Bush_01', 'SM_Env_Bush_02', 'SM_Env_Bush_03', 'SM_Env_Bush_04'],
		bundle: (entity) => {
			const mats: MeshPhongMaterial[] = []
			entity.model.traverse((node) => {
				if (node instanceof Mesh) {
					node.material.uniforms.pos.value = entity.position.clone()
					mats.push(node.material)
				}
			})

			return {
				...entity,
				withTimeUniform: mats,
				bush: true,
			}
		},
	},
	{
		name: 'board',
		models: ['Bulliten'],
		bundle: entity => ({
			...entity,
			interactable: Interactable.BulletinBoard,
			onPrimary: openMenu(MenuType.Quest),
		}),
	},
	{
		name: 'lamp',
		models: ['Lamp', 'Lamp2'],
		bundle(entity) {
			entity.withChildren = (parent) => {
				entity.model.traverse((node) => {
					if (node.name.includes('light')) {
						const nightLight = new PointLight(0xFFFF00, 1, 100, 0.01)
						node.add(nightLight)
						ecs.add({ parent, nightLight })
					}
					if (node instanceof Mesh && node.material instanceof MeshPhongMaterial) {
						node.material.side = DoubleSide
						if (node.name.includes('bulb')) {
							node.material.emissive = new Color(0xFFFF00)
							ecs.add({ parent, emissiveMat: node.material })
						}
					}
				})
			}
			return entity
		},
	},
	{
		name: 'oven',
		models: ['BunnyOvenPacked'],
		bundle: (entity) => {
			return {
				...entity,
				recipesQueued: [],
				ovenAnimator: new Animator(entity.model, assets.models.BunnyOvenPacked.animations),
				interactable: Interactable.Oven,
				onPrimary: openMenu(MenuType.Oven),
				onSecondary: (e) => {
					e.recipesQueued?.length && openMenu(MenuType.OvenMinigame)(e)
				},
				withChildren(parent) {
					const model = assets.models['ume-wood'].scene.clone()
					model.scale.setScalar(5)
					ecs.add({
						parent,
						model,
						position: new Vector3(),
					})
				},
			} },
	},
	{
		name: 'CookingPot',
		models: ['CookingPot'],
		bundle: entity => ({
			...entity,
			interactable: Interactable.Cauldron,
			onPrimary: openMenu(MenuType.Cauldron),
			onSecondary: (e) => {
				e.recipesQueued?.length && openMenu(MenuType.CauldronGame)(e)
			},
			withChildren(parent) {
				const spoonmodel = assets.models.spoon.scene.clone()
				const spoon = ecs.add({
					parent,
					model: spoonmodel,
					position: new Vector3(),
					rotation: new Quaternion(),
				})
				const woodmodel = assets.models['ume-wood'].scene.clone()
				woodmodel.scale.setScalar(5)
				ecs.add({
					parent,
					model: woodmodel,
					position: new Vector3(),
				})

				ecs.update(parent, { spoon })
			},
			recipesQueued: [],

		}),
	},
	{
		name: 'bench',
		models: ['bench'],
		bundle: (entity) => {
			const minigameContainer = new CSS2DObject(document.createElement('div'))
			minigameContainer.position.set(0, 5, 0)
			return {
				...entity,
				minigameContainer,
				interactable: Interactable.Chop,
				onPrimary: e => ecs.addComponent(e, 'menuType', MenuType.Bench),
				onSecondary: e => ecs.addComponent(e, 'menuType', MenuType.BenchGame),
				recipesQueued: [],
			}
		},
	},
	{
		name: 'stove',
		models: ['Stove1'],
		bundle: entity => ({
			...entity,
			recipesQueued: [],
		}),
	},
	{
		name: 'sign',
		data: { text: '' },
		models: ['WoodenSign', 'WoodenSign2'],
		bundle: (entity, data) => {
			const dialog = function*() {
				while (true) {
					yield data.data.text
					yield false
				}
			}
			return {
				...entity,
				interactable: Interactable.Read,
				dialog: dialog(),
			}
		},
	},
	{
		name: 'fence',
		models: ['Fence'],
	},
	{
		name: 'plots',
		models: ['gardenPlot1', 'gardenPlot2', 'gardenPlot3'],
		bundle: (entity, _, ressources) => {
			const crop = save.crops[entity.entityId]
			const noise = new FastNoiseLite(Number(entity.entityId.replace(/\D/g, '')))
			noise.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2S)
			entity.model.traverse((node) => {
				if (node instanceof Mesh && node.material) {
					node.material = new GardenPlotMaterial().copy(node.material)
					if (node.name.includes('rock')) {
						const noiseValue = noise.GetNoise(...node.position.toArray())
						if (noiseValue < 0) {
							node.visible = false
						}
					} else if (crop?.watered) {
						node.material.uniforms.water.value = 1
					}
				}
			})
			const newEntity: Entity = {
				...entity,
				plantableSpot: entity.entityId,
				bodyDesc: RigidBodyDesc.fixed().lockRotations(),
				colliderDesc: ColliderDesc.cuboid(3, 3, 3).setSensor(true),
			}

			if (crop && ressources) {
				const grow = 'previousState' in ressources && ressources.previousState === 'dungeon'
				newEntity.withChildren = (parent) => {
					const planted = ecs.add({
						parent,
						...cropBundle(grow, crop),
					})
					ecs.update(parent, { planted })
				}
			}

			return newEntity
		},
	},
	{
		name: 'Flower/plants',
		models: ['SM_Env_Flower_01', 'SM_Env_Flower_02', 'SM_Env_Flower_03', 'SM_Env_Flower_05', 'SM_Env_Flower_06', 'SM_Env_Flower_07', 'SM_Env_Flower_08', 'SM_Env_Grass_01', 'SM_Env_Grass_02', 'grass&vines', 'SM_Env_Flowers_01', 'SM_Env_Flowers_02', 'SM_Env_Plant_01', 'SM_Env_Plant_02', 'SM_Env_Plant_03', 'Creepy_Flower', 'Creepy_Grass', 'SM_Env_Lillypad_Large_01', 'SM_Env_Lillypad_Large_02', 'SM_Env_Lillypad_Large_03', 'SM_Env_Lillypad_Small_01', 'SM_Env_Reeds_01', 'SM_Env_Reeds_02', 'SM_Env_RicePlant_01', 'SM_Env_RicePlant_02'],
	},

	{
		name: 'Vine gate',
		data: { direction: Direction.N, doorLevel: 0 },
		models: ['Gate_Vines'],
		bundle(entity, { data }, ressources) {
			entity.model.traverse((node) => {
				if (node.parent?.name === 'GATE' && node instanceof Mesh && node.material instanceof Material) {
					node.material = node.material.clone()
				}
			})
			if (dungeonState.enabled && ressources && 'dungeon' in ressources) {
				if (![RoomType.NPC, RoomType.Item].includes(ressources.dungeon.type)) {
					entity.doorLocked = true
				}
			}
			if (genDungeonState.enabled && data.direction === Direction.N) {
				entity.doorLevel = data.doorLevel
				entity.doorLocked = true
			}

			return {
				...entity,
				vineGate: true,
				door: data?.direction ?? Direction.N,
			}
		},
	},
	{
		name: 'house',
		models: ['House'],
		bundle: (entity) => {
			return {
				...entity,
				withChildren: (parent) => {
					entity.model.traverse((node) => {
						if (node.name.includes('light')) {
							const nightLight = new PointLight(0xFFFF00, 1, 30, 0.01)
							node.add(nightLight)
							ecs.add({ parent, nightLight })
						} else if (node.name === 'door') {
							const position = node.position.clone().multiply(entity.model.scale)
							ecs.add({
								parent,
								npcName: 'door',
								position,
								group: new Group(),
								dialog: dialogs.GrandmasDoor(),
								interactable: Interactable.Enter,
								bodyDesc: RigidBodyDesc.fixed().lockRotations(),
								colliderDesc: ColliderDesc.cuboid(5, 7, 1).setSensor(true).setActiveCollisionTypes(ActiveCollisionTypes.ALL),
							})
						} else if (node instanceof Mesh) {
							ecs.add({ parent, emissiveMat: node.material })
							node.material.emissive = new Color(0xFFFF00)
						}
					})
				},
				dialogHeight: 4,
				npcName: 'Grandma',
				houseAnimator: new Animator(entity.model, assets.models.House.animations),
				voice: 'f1',
				dialog: dialogs.GrandmasHouse(),
			}
		},
	},
	{
		name: 'mushrooms',
		models: ['Shroom1', 'Shroom2', 'Shroom3', 'Shroom4'],
	},
	{
		name: 'Kitchen',
		models: ['KitchenSet1', 'table', 'stringLights', 'Bucket'],
	},
	{
		name: 'well',
		models: ['well'],
		bundle: (entity) => {
			return {
				...entity,
				interactable: Interactable.FillWateringCan,
				size: new Vector3(0, 5, 0),
				onPrimary(_e, player) {
					const wateringCan = player.wateringCan ?? wateringCanBundle()
					ecs.update(player, { wateringCan })
					lockPlayer()
					wateringCan.waterAmount = 0
					sleep(100).then(() => {
						wateringCan.waterAmount = 1
					})
					sleep(2000).then(unlockPlayer)
				},
			}
		},
	},
	{
		name: 'berry bushes',
		models: ['Berry_Bush'],
		bundle: (entity) => {
			let berriesModel: Mesh<BufferGeometry, MeshPhongMaterial>[] = []
			const berries = new Set<Mesh<BufferGeometry, MeshPhongMaterial>>()
			entity.model.traverse((node) => {
				if (node.name.includes('Berry') && node instanceof Mesh) {
					berriesModel.push(node)
					node.material = node.material.clone()
				}
			})
			for (let i = 0; i < 15; i++) {
				const index = Math.floor(Math.random() * berriesModel.length)
				const berry = berriesModel[index]
				delete berriesModel[index]
				berriesModel = berriesModel.filter(Boolean)
				berries.add(berry)
				berry.material.color = new Color(0xEC273F)
			}
			for (const leftOverBerry of berriesModel) {
				leftOverBerry.removeFromParent()
			}
			return {
				...entity,
				berries,
			}
		},
	},
	{
		name: 'fruit trees',
		models: ['Apple_Tree'],
	},
	{
		name: 'fishing deck',
		models: ['fishing_deck'],
		bundle: (e) => {
			// const fishingSpotPosition = new Vector3(0, 3, -10)
			return {
				...e,
				withChildren(parent) {
					if (!e.size) return
					const spotBundle = (): Entity => ({
						fishingSpot: true,
						interactable: Interactable.Fishing,
						parent,
						rotation: e.rotation.clone(),
						bodyDesc: RigidBodyDesc.fixed(),
						model: new Object3D(),
					})
					const spotSizeY = 3
					// front
					ecs.add({
						...spotBundle(),
						position: new Vector3(0, e.size.y / 2, -(e.size.z / 2 + 2)),
						colliderDesc: ColliderDesc.cuboid(e.size.x / 2, spotSizeY, 2),
					})
					// left
					ecs.add({
						...spotBundle(),
						position: new Vector3(e.size.x / 2 + 2, e.size.y / 2, 0),
						colliderDesc: ColliderDesc.cuboid(2, spotSizeY, e.size.z / 2),
					})
					// right
					ecs.add({
						...spotBundle(),
						position: new Vector3(-(e.size.x / 2 + 2), e.size.y / 2, 0),
						colliderDesc: ColliderDesc.cuboid(2, spotSizeY, e.size.z / 2),
					})
					// spawner
					ecs.add({
						parent,
						position: new Vector3(0, 0, -e.size.z),
						model: new Object3D(),
						fishSpawner: true,
					})
				},
			}
		},
	},
	{
		name: 'stall',
		models: ['stall'],
		bundle: (entity, _data, ressources) => {
			if (ressources && 'dungeon' in ressources && ressources.dungeon.type === RoomType.Seller && ressources.dungeon.items) {
				const items = ressources.dungeon.items
				return {
					...entity,
					withChildren(parent) {
						for (let i = 0; i < items.length; i++) {
							const x = [-1, 0, 1][i]
							const item = items[i]
							if (!item) continue
							const model = assets.items[item.name].model.clone()
							model.scale.multiplyScalar(5)
							const itemData = itemsData[item.name]
							const itemEntity: Entity = {
								parent,
								model,
								colliderDesc: ColliderDesc.ball(4),
								bodyDesc: RigidBodyDesc.fixed(),
								interactable: Interactable.Buy,
								position: new Vector3(x * 7, 4, 0),
								stallPosition: i,
								itemLabel: item.name,
							}
							let itemForPrice = itemData
							if (item.recipe) {
								itemEntity.recipe = item.recipe
								itemForPrice = itemsData[item.recipe]
							}
							if ('price' in itemForPrice) {
								itemEntity.price = itemForPrice.price
							}

							ecs.add(itemEntity)
						}
						const owlModel = clone(assets.characters.OWL_animated.scene)
						owlModel.scale.multiplyScalar(6)
						const rot = new Euler().setFromQuaternion(entity.rotation)
						rot.y += Math.PI
						const targetRotation = new Quaternion().setFromEuler(rot)
						const owl = ecs.add({
							...inMap(),
							model: owlModel,
							...dialogBundle('Seller'),
							kayAnimator: new Animator(owlModel, assets.characters.OWL_animated.animations),
							rotation: new Quaternion(),
							targetRotation,
							position: new Vector3(-18, 0, -5).applyQuaternion(entity.rotation).add(entity.position),
							bodyDesc: RigidBodyDesc.fixed(),
							colliderDesc: ColliderDesc.cylinder(5, 3),
							npcName: 'Owl',
							npc: true,
						})
						owl.kayAnimator.playAnimation('Idle')
					},
				}
			} else {
				return {}
			}
		},
	},
	{
		name: 'pillar',
		models: ['pillarDown', 'pillarUp'],
	},
]