import type { Actor, Doors, Entity } from '@/global/entity'
import type { fruit_trees, gardenPlots, models, vegetation, village } from '@assets/assets'
import type { With } from 'miniplex'
import type { BufferGeometry, Object3DEventMap } from 'three'
import type { EntityData, ModelName } from './LevelEditor'
import { itemsData } from '@/constants/items'
import { Animator } from '@/global/animator'
import { Interactable, MenuType } from '@/global/entity'
import { assets, ecs, save } from '@/global/init'
import { app, type DungeonResources, type FarmResources } from '@/global/states'
import { Direction, isCardinalDirection } from '@/lib/directions'
import { inMap } from '@/lib/hierarchy'
import { getSecondaryColliders } from '@/lib/models'
import { fireParticles } from '@/particles/fireParticles'
import { smoke } from '@/particles/smoke'
import { introQuest } from '@/quests/introQuest'
import { GardenPlotMaterial, GrassMaterial } from '@/shaders/materials'
import { RoomType } from '@/states/dungeon/generateDungeon'
import { cropBundle } from '@/states/farm/farming'
import { openMenu } from '@/states/farm/openInventory'
import { wateringCanBundle } from '@/states/farm/wateringCan'
import { doorSide } from '@/states/game/spawnDoor'
import { lockPlayer, unlockPlayer } from '@/utils/dialogHelpers'
import { sleep } from '@/utils/sleep'
import { ActiveCollisionTypes, ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import FastNoiseLite from 'fastnoise-lite'
import { Color, ConeGeometry, DoubleSide, Euler, Group, Material, Mesh, MeshBasicMaterial, MeshPhongMaterial, Object3D, PointLight, Quaternion, SphereGeometry, Vector2, Vector3 } from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils'

const markerModel = () => {
	const mesh = new Mesh(new SphereGeometry(3), new MeshBasicMaterial())
	const arrow = new Mesh(new ConeGeometry(2, 5), new MeshBasicMaterial({ color: 0xFF0000 }))
	arrow.position.set(0, 0, 3)
	arrow.rotateX(Math.PI / 2)
	mesh.add(arrow)
	return mesh
}

export const customModels = {

	door: doorSide,
	doorMarker: markerModel,
	marker: markerModel,
} as const satisfies Record<string, () => Object3D<Object3DEventMap>>
export type customModel = keyof typeof customModels
export const getModel = (key: ModelName): Object3D => {
	if (key in customModels) {
		// @ts-expect-error okok
		return customModels[key]()
	}
	for (const model of ['vegetation', 'gardenPlots', 'fruitTrees', 'models', 'village'] as const) {
		if (key in assets[model]) {
			// @ts-expect-error okok
			return clone(assets[model][key]?.scene ?? assets[model][key])
		}
	}
	throw new Error(`Couldn\'t find model ${key}`)
}
export interface ExtraData {
	'door': {
		direction: Doors
		doorLevel: number
		boundary: Direction | null
	}
	'Vine gate': {
		direction: Direction
		doorLevel: number
		unlocked: boolean
	}
	'sign': {
		text: string
	}
	'marker': {
		name: Actor | null
	}

}

type BundleFn<E extends EntityData<any>> = (entity: With<Entity, 'entityId' | 'model' | 'position' | 'rotation'>, data: NonNullable<E>, resources: FarmResources | DungeonResources | void) => Entity

export interface PlacableProp<N extends string> {
	name: N
	models: (models | customModel | vegetation | gardenPlots | fruit_trees | village)[]
	data?: N extends keyof ExtraData ? ExtraData[N] : undefined
	bundle?: BundleFn<EntityData<N extends keyof ExtraData ? NonNullable<ExtraData[N]> : never>>
}
export type propNames = 'log' | 'door' | 'rock' | 'board' | 'oven' | 'CookingPot' | 'stove' | 'Flower/plants' | 'sign' | 'plots' | 'bush' | 'fence' | 'house' | 'mushrooms' | 'lamp' | 'Kitchen' | 'berry bushes' | 'bench' | 'well' | 'fruit trees' | 'stall' | 'Vine gate' | 'fishing deck' | 'pillar' | 'marker' | 'cellar' | 'cellar_door' | 'scaffolds' | 'cellar_props' | 'cellar_wall' | 'village'

type Props = ({ [k in propNames]: PlacableProp<k> }[propNames])[]
export const props: Props = [
	{
		name: 'cellar',
		models: ['stairs'],
		bundle: e => ({ ...e, actor: 'cellarStairs' }),
	},
	{
		name: 'cellar_props',
		models: ['barrel', 'barrel_small', 'crate', 'bookshelf', 'keg', 'box_large', 'box_small', 'box_stack', 'trunk'],
		bundle: e => ({ ...e, crate: true }),
	},
	{
		name: 'cellar_wall',
		models: ['cellar_wall', 'cellar_wall2', 'cellar_wall3', 'cellar_wall_corner'],
	},
	{
		name: 'cellar_door',
		models: ['cellar_entrance'],
		bundle: (e) => {
			return {
				...e,
				interactable: Interactable.Open,
				cellarDoorAnimator: new Animator(e.model, assets.models.cellar_entrance.animations),
				actor: 'cellarDoor',
			}
		},
	},
	{
		name: 'scaffolds',
		models: ['scaffold1', 'scaffold2', 'scaffold3', 'scaffold4'],
	},
	{
		name: 'log',
		models: ['WoodLog', 'WoodLog_Moss', 'TreeStump', 'TreeStump_Moss'],
		bundle: entity => ({ ...entity, obstacle: true }),
	},
	{
		name: 'marker',
		models: ['marker'],
		data: { name: null },
		bundle(e, data) {
			if (app.isEnabled('debug') || !data.data.name) return e
			return {
				actor: data.data.name,
				position: e.position,
				rotation: e.rotation,
				targetRotation: e.rotation.clone(),
				...inMap(),
			}
		},
	},
	{
		name: 'door',
		data: { direction: Direction.N, doorLevel: 0, boundary: null },
		models: ['door', 'doorMarker'],
		bundle: (entity, data, resources) => {
			if (app.isEnabled('dungeon') && resources && 'dungeon' in resources) {
				const isBattle = [RoomType.Battle, RoomType.Boss, RoomType.Entrance].includes(resources.dungeon.type)
				const enemiesPresent = resources.dungeon.enemies.length > 0
				if (isBattle && enemiesPresent) {
					entity.doorLocked = true
				}
			}
			if (app.isEnabled('clearing') && data.data.direction === 'north') {
				entity.doorLevel = data.data.doorLevel
				entity.doorLocked = true
			}
			if (data.model === 'door') {
				entity.doorType = 'fog'
			}
			if (data.model === 'doorMarker' && app.isDisabled('debug')) {
				entity.doorType = 'marker'
				entity.model = new Object3D()
			}

			if (resources && 'dungeon' in resources && data.data.direction && resources.dungeon.plan.type === 'dungeon') {
				const next = isCardinalDirection(data.data.direction) && resources.dungeon.doors[data.data.direction]
				if (next) {
					const isBossEntrance = next?.type === RoomType.Boss
					const isBossRoom = resources.dungeon.type === RoomType.Boss && next !== null
					const isEntrance = resources.dungeon.type === RoomType.Entrance && next === null
					let model: Object3D | null = null
					if (isBossEntrance || isBossRoom) {
						model = assets.models.Gate_Thorns.scene.clone()
						entity.doorType = 'vine'
						if (isBossRoom) {
							model.rotateY(Math.PI)
						}
					} else if (isEntrance) {
						model = assets.models.Gate_Vines.scene.clone()
						entity.doorType = 'vine'
						model.rotateY(Math.PI)
					}
					if (model) {
						Object.assign(entity, getSecondaryColliders(model))
						entity.model = model
					}
				}
			}
			if (data.data.boundary) {
				entity.boundary = data.data.boundary
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
		bundle(entity) {
			const materials: MeshPhongMaterial[] = []
			entity.model.traverse((node) => {
				const height = entity.size?.y ?? 5
				if (node instanceof Mesh && node.material) {
					const mat = new GrassMaterial({ color: node.material.color, map: node.material.map })
					mat.setUniforms({
						pos: new Vector2(entity.position.x, entity.position.z),
						height,
					})
					node.material = mat
					materials.push(mat)
				}
			})
			return {
				...entity,
				bush: true,
				withTimeUniform: materials,
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
				actor: 'oven',
				onSecondary: (e) => {
					e.recipesQueued?.length && openMenu(MenuType.OvenMiniGame)(e)
				},
				withChildren(parent) {
					const model = assets.models['ume-wood'].scene.clone()
					model.scale.setScalar(5)
					const light = new PointLight(new Color(0xFF0000), 0, 20)
					light.position.setY(5)
					ecs.add({
						parent,
						position: new Vector3(),
						light,
						fireParticles: fireParticles(),
					})
					ecs.add({
						parent,
						model,
						position: new Vector3(),
					})
					parent.model?.traverse((node) => {
						if (node.name.includes('smoke')) {
							ecs.add({
								parent,
								position: node.position.clone().multiply(parent.model!.scale),
								smokeParticles: smoke(),
								group: new Group(),
							})
						}
					})
				},
			}
		},
	},
	{
		name: 'CookingPot',
		models: ['CookingPot'],
		bundle: entity => ({
			...entity,
			interactable: Interactable.Cauldron,
			onPrimary: openMenu(MenuType.Cauldron),
			actor: 'cookingPot',
			questMarker: [introQuest.marker('5_cook_meal')],
			onSecondary: (e) => {
				e.recipesQueued?.length && openMenu(MenuType.CauldronGame)(e)
			},
			withChildren(parent) {
				const spoonModel = assets.models.spoon.scene.clone()
				const spoon = ecs.add({
					parent,
					model: spoonModel,
					position: new Vector3(),
					rotation: new Quaternion(),
				})
				const light = new PointLight(new Color(0xFF0000), 10, 10)
				light.position.setY(5)
				ecs.add({
					parent,
					position: new Vector3(),
					group: new Group(),
					light,
					fireParticles: fireParticles(),
				})
				const woodModel = assets.models['ume-wood'].scene.clone()
				woodModel.scale.setScalar(5)
				ecs.add({
					parent,
					model: woodModel,
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
			const miniGameContainer = new CSS2DObject(document.createElement('div'))
			miniGameContainer.position.set(0, 5, 0)
			return {
				...entity,
				miniGameContainer,
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
			const dialog = function* () {
				while (true) {
					yield data.data.text
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
		bundle: (entity, _, resources) => {
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

			if (crop && resources) {
				const grow = 'previousState' in resources && resources.previousState === 'dungeon'
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
		bundle(entity) {
			const materials: MeshPhongMaterial[] = []
			entity.model.traverse((node) => {
				const height = entity.size?.y ?? 5
				if (node instanceof Mesh && node.material) {
					const mat = new GrassMaterial({ color: node.material.color, map: node.material.map })
					mat.setUniforms({
						pos: new Vector2(entity.position.x, entity.position.z),
						height,
					})
					node.material = mat
					materials.push(mat)
				}
			})
			return { ...entity, withTimeUniform: materials }
		},
	},

	{
		name: 'Vine gate',
		data: { direction: Direction.N, doorLevel: 0, unlocked: false },
		models: ['Gate_Vines'],
		bundle(entity, { data }, resources) {
			entity.model.traverse((node) => {
				if (node.parent?.name === 'GATE' && node instanceof Mesh && node.material instanceof Material) {
					node.material = node.material.clone()
				}
			})
			if (app.isEnabled('dungeon') && resources && 'dungeon' in resources) {
				if (![RoomType.NPC, RoomType.Item].includes(resources.dungeon.type)) {
					entity.doorLocked = true
				}
			}
			if (app.isEnabled('clearing') && data.direction === Direction.N) {
				entity.doorLevel = data.doorLevel
				entity.doorLocked = true
			}
			if (data.unlocked) {
				entity.unlocked = true
			}
			return {
				...entity,
				doorType: 'vine',
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
							const door: Entity = {
								parent,
								position,
								rotation: new Quaternion(),
								group: new Group(),
								interactable: Interactable.Enter,
								bodyDesc: RigidBodyDesc.fixed().lockRotations(),
								colliderDesc: ColliderDesc.cuboid(5, 7, 1).setSensor(true).setActiveCollisionTypes(ActiveCollisionTypes.ALL),
								actor: 'houseDoor',
							}

							ecs.add(door)
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
		bundle: (entity, _data, resources) => {
			if (resources && 'dungeon' in resources && resources.dungeon.type === RoomType.Seller && resources.dungeon.items) {
				const items = resources.dungeon.items
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
							// ...dialogBundle('Seller'),
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
	{
		name: 'village',
		models: ['P_BLD_house_01', 'P_BLD_house_02', 'P_BLD_house_03', 'P_BLD_house_04', 'P_BLD_house_05', 'P_BLD_house_06', 'P_BLD_house_07', 'P_BLD_house_08', 'P_BLD_house_09', 'P_BLD_house_10', 'P_BLD_house_11', 'P_BLD_house_12', 'P_BLD_house_13', 'P_BLD_house_14'],
	},
]