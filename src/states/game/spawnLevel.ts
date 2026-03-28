import type { AssetData, LevelEntity, LevelLoaded } from 'editor/src/types'
import type { GLTF } from 'three/addons'
import type { Entity } from '@/global/entity'
import type { app } from '@/global/states'
import type { AppStates, UpdateSystem } from '@/lib/app'
import type { Direction } from '@/lib/directions'
import boundingBoxes from '@assets/boundingBox.json'
import { ActiveEvents, ColliderDesc, RigidBodyDesc, RigidBodyType } from '@dimforge/rapier3d-compat'
import { SkeletonUtils } from 'three/addons'
import { CanvasTexture, Group, Mesh, Object3D, PlaneGeometry, Quaternion, Vector2, Vector3 } from 'three/webgpu'
import { canvasToArray, InstancedModel } from '@/global/assetLoaders'
import { assets, ecs } from '@/global/init'
import { getBodyAndColliders } from '@/lib/colliders'
import { collisionGroups } from '@/lib/collisionGroups'
import { cardinalDirections } from '@/lib/directions'
import { inGameScene } from '@/lib/hierarchy'
import { getSize } from '@/lib/models'
import { WaterMaterial } from '@/shaders/waterMaterial'
import { getScreenBuffer, scaleCanvas } from '@/utils/buffer'
import { getGroundMaterial } from './groundMaterial'
import { spawnLight } from './spawnLights'
import { composeMatrix, getGrassModel, setDisplacement } from './spawnTrees'

export const getDisplacementMap = (level: LevelLoaded) => {
	const ctx = getScreenBuffer(level.sizeX, level.sizeY)
	// ! heightMap
	const filledHeightMap = getScreenBuffer(level.sizeX, level.sizeY)
	filledHeightMap.fillStyle = 'black'
	filledHeightMap.fillRect(0, 0, level.sizeX, level.sizeY)
	if (level.heightMap) {
		filledHeightMap.drawImage(level.heightMap, 0, 0)
	}
	// ! combine
	ctx.fillStyle = 'rgb(128,128,128)'
	ctx.fillRect(0, 0, level.sizeX, level.sizeY)
	ctx.save()
	ctx.globalAlpha = 0.5
	ctx.drawImage(filledHeightMap.canvas, 0, 0)
	ctx.restore()
	// ! water
	ctx.save()

	ctx.filter = `invert(1)`
	if (level.waterMap) {
		ctx.drawImage(level.waterMap, 0, 0)
	}

	ctx.restore()
	ctx.translate(level.sizeX, 0)
	ctx.scale(-1, 1)
	ctx.drawImage(ctx.canvas, 0, 0)
	return ctx.canvas
}

const spawnWater = (level: LevelLoaded, parent: Entity) => {
	const waterMap = new CanvasTexture(level.waterMap)
	const waterMaterial = new WaterMaterial({ map: waterMap, transparent: true }, new Vector2(level.sizeX, level.sizeY))
	const waterMesh = new Mesh(new PlaneGeometry(level.sizeX, level.sizeY), waterMaterial)
	ecs.add({
		model: waterMesh,
		position: new Vector3(0, -3, 0),
		withTimeUniform: (time: number) => waterMaterial.time.value = time,
		rotation: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2),
		parent,
	})
}

const spawnGround = (level: LevelLoaded, parent: Entity) => {
	const geometry = setDisplacement(
		new Vector2(level.sizeX, level.sizeY),
		level.heightMap ?? null,
		level.waterMap ?? null,
		level.displacementScale,
	)
	const material = getGroundMaterial(level.floorTexture ?? 'grass', {
		size: { x: level.sizeX, y: level.sizeY },
		planksTexture: assets.textures.planks,
		groundTexture: assets.textures.Dirt4_Dark,
		rockTexture: assets.textures.Rocks1_Light,
		level: new CanvasTexture(level.pathMap),
		grassNoiseTexture: new CanvasTexture(level.grassNoise),
	})
	const groundMesh = new Mesh(geometry, material)
	groundMesh.rotation.x = -Math.PI / 2
	groundMesh.position.y = -level.displacementScale / 2
	groundMesh.receiveShadow = true
	const gridScale = 0.20
	const heightfieldMap = scaleCanvas(getDisplacementMap(level), gridScale)
	const heights = canvasToArray(heightfieldMap).map(pixel => pixel.y / 255)
	const heightfield = new Float32Array(heights.length)
	heightfield.set(heights)
	const colliderNorth = ColliderDesc.cuboid(level.sizeX / 2, 50, 1).setTranslation(0, 0, level.sizeY + 0.5 / 2)
	const colliderSouth = ColliderDesc.cuboid(level.sizeX / 2, 50, 1).setTranslation(0, 0, -(level.sizeY + 0.5) / 2)
	const colliderEast = ColliderDesc.cuboid(1, 50, level.sizeY / 2).setTranslation(level.sizeX / 2 + 0.5, 0, 0)
	const colliderWest = ColliderDesc.cuboid(1, 50, level.sizeY / 2).setTranslation(-(level.sizeX / 2 + 0.5), 0, 0)
	const secondaryCollidersDesc = [colliderNorth, colliderSouth, colliderEast, colliderWest]
	ecs.add({
		model: groundMesh,
		position: new Vector3(0, 0, 0),
		bodyDesc: new RigidBodyDesc(RigidBodyType.Fixed)
			.setCcdEnabled(true),
		colliderDesc: ColliderDesc
			.heightfield(
				level.sizeX * gridScale - 1,
				level.sizeY * gridScale - 1,
				heightfield,
				{ x: level.sizeY, y: level.displacementScale, z: level.sizeX },
			)
			.setTranslation(0, -level.displacementScale / 4, 0)
			.setRotation(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2))
			.setCollisionGroups(collisionGroups('floor', ['enemy', 'player']))
			.setActiveEvents(ActiveEvents.COLLISION_EVENTS),
		ground: true,
		secondaryCollidersDesc,
		parent,
	})
}

const spawnInstances = <C extends keyof typeof assets, M extends keyof typeof assets[C]>(level: LevelLoaded, parent: Entity, directions?: Direction[]) => {
	for (const instance of Object.values(level.instances)) {
		if (instance.entities.length === 0) {
			continue
		}
		const model = assets[instance.category as C][instance.model as M] as GLTF
		const instancedModel = new InstancedModel(model.scene.clone())
		const bodyDesc = RigidBodyDesc.fixed()
		const size = getSize(model.scene)
		const secondaryCollidersDesc = []

		for (const instanceEntity of instance.entities) {
			if (!instanceEntity.doorDungeon || !directions?.includes(instanceEntity.doorDungeon)) {
				instancedModel.addInstance(composeMatrix(instanceEntity))
				if (instanceEntity.collider) {
					const treeSize = size.clone().multiply(instanceEntity.scale)
					secondaryCollidersDesc.push(ColliderDesc.cylinder(treeSize.y, treeSize.x / 2).setTranslation(instanceEntity.position.x, instanceEntity.position.y + treeSize.y / 2, instanceEntity.position.z))
				}
			}
		}
		ecs.add({
			parent,
			group: instancedModel.build(),
			position: new Vector3(),
			bodyDesc,
			secondaryCollidersDesc,

		})
	}
}

const getModel = <C extends keyof typeof assets, M extends keyof typeof assets[C]>(category: string, model: string) => {
	const gltf = assets?.[category as C]?.[model as M] as GLTF | Object3D
	if (!gltf) {
		console.error(assets?.[category as C] ?? assets)
		throw new Error(`can't find model ${category} - ${model}`)
	}
	if (gltf instanceof Object3D) {
		return gltf
	} else {
		return gltf.scene
	}
}

const spawnEntity = (mapEntity: LevelEntity, entityId: string, parent: Entity) => {
	const model = getModel(mapEntity.category, mapEntity.model)
	const boundingBox = (boundingBoxes as unknown as Record<string, Record<string, AssetData>>)?.[mapEntity.category]?.[mapEntity.model]
	const boundingBoxScale = boundingBox?.scale
	const tags = { ...(boundingBox?.tags ?? {}), ...(mapEntity?.tags ?? {}) }
	model.scale.copy(new Vector3().fromArray(mapEntity.scale))
	model.userData = mapEntity
	if (boundingBoxScale) {
		model.scale.multiply(new Vector3().fromArray(boundingBoxScale))
	}
	const position = new Vector3().set(...mapEntity.position)
	const rotation = new Quaternion().fromArray(mapEntity.rotation)
	const getBody = () => {
		if (boundingBox?.collider) {
			const bodydBundle = getBodyAndColliders(boundingBox, model.clone(), mapEntity.scale)

			bodydBundle.bodyDesc.setRotation(rotation)
			return bodydBundle
		}
		return {}
	}

	if (mapEntity.grid) {
		for (let y = 0; y <= mapEntity.grid.repetitionY; y++) {
			for (let x = 0; x <= mapEntity.grid.repetitionX; x++) {
				if (!(x === 0 && y === 0)) {
					const gridPosition = new Vector3(
						x * mapEntity.grid.spacingX,
						0,
						y * mapEntity.grid.spacingY,
					).multiply(model.scale).applyQuaternion(rotation).add(position)
					ecs.add({
						model: SkeletonUtils.clone(model),
						position: gridPosition,
						parent,
						rotation: rotation.clone(),
						entityId: `${entityId}:${x}-${y}`,
						...getBody(),
						...tags,
					})
				}
			}
		}
	}

	ecs.add({
		model: SkeletonUtils.clone(model),
		position,
		rotation,
		parent,
		entityId,
		...getBody(),
		...tags,
	})
}
const spawnGrass = (level: LevelLoaded, parent: Entity) => {
	if (!level.grassNoise || !level.grassMap) return
	const grassModel = getGrassModel(
		assets.textures.grass,
		new CanvasTexture(level.grassNoise),
		{
			grassMap: level.grassMap,
			heightMap: level.heightMap,
			waterMap: level.waterMap,
			pathMap: level.pathMap,
		},
		level.displacementScale,
		{ x: level.sizeX, y: level.sizeY },
	)
	if (!grassModel) return
	ecs.add({
		parent,
		model: grassModel,
		position: new Vector3(),
	})
}

const spawnLevelAsset = (level: LevelLoaded, state: AppStates<typeof app>) => {
	const levelEntity = ecs.add(inGameScene({ map: 'dungeon_room_1', group: new Group(), stateEntity: state, levelSize: { x: level.sizeX, y: level.sizeY } }))
	spawnLight({ x: level.sizeX, y: level.sizeY }, levelEntity)
	spawnGround(level, levelEntity)
	spawnWater(level, levelEntity)
	spawnGrass(level, levelEntity)
	for (const id in level.entities) {
		spawnEntity(level.entities[id], id, levelEntity)
	}
	return levelEntity
}

export const spawnLevel = (levelName: keyof typeof assets['levels'], state: AppStates<typeof app>) => () => {
	const level = assets.levels[levelName]
	const parent = spawnLevelAsset(level, state)
	spawnInstances(level, parent)
}
export const spawnDungeon: UpdateSystem<typeof app, 'dungeon'> = (resources) => {
	const parent = spawnLevelAsset(resources.dungeon.plan, 'dungeon')
	const directions: Direction[] = []
	for (const dir of cardinalDirections) {
		if (dir in resources.dungeon.doors) {
			directions.push(dir as Direction)
		}
	}
	spawnInstances(resources.dungeon.plan, parent, directions)
}