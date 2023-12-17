import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { between } from 'randomish'
import { BoxGeometry, Color, Mesh, Vector3 } from 'three'
import { cauldronBundle } from '../farm/cooking'
import { doorBundle } from './spawnDoor'
import { playerBundle } from './spawnCharacter'
import type { EntityInstance, LayerInstance, Level } from '@/LDTKMap'
import { assets, ecs } from '@/global/init'
import type { DungeonRessources } from '@/global/states'
import { type direction, otherDirection } from '@/lib/directions'
import { modelColliderBundle } from '@/lib/models'
import type { System } from '@/lib/state'
import { GroundShader } from '@/shaders/GroundShader'
import { getRandom, objectValues } from '@/utils/mapFunctions'

export const treeBundle = () => {
	const model = getRandom(objectValues(assets.trees)).scene.clone()
	model.scale.setScalar(between(1.5, 2))
	model.rotateY(between(0, Math.PI))
	return {
		inMap: true,
		parent,
		scale: 4,
		model,
	} as const
}

enum GroundType {
	Tree = 1,
	Grass = 2,
}
const SCALE = 7

interface FieldInstances {
	door: {
		direction: direction
	}
	level: {
		dungeon: boolean
	}
}

export const getFieldIntances = <Name extends keyof FieldInstances>(entity: EntityInstance | Level) => {
	return entity.fieldInstances.reduce((acc, v) => {
		return { ...acc, [v.__identifier]: v.__value }
	}, {} as FieldInstances[Name])
}
const getEntityPosition = (entity: EntityInstance, layer: LayerInstance, offsetX = 0, offsetY = 0) => {
	return new Vector3(
		-entity.__grid[0] + layer.__cWid / 2 + offsetX,
		0,
		-entity.__grid[1] + layer.__cHei / 2 + offsetY,
	).multiplyScalar(SCALE)
}

const spawnEntity = (entity: EntityInstance, layer: LayerInstance) => {
	switch (entity.__identifier) {
		case 'door':{
			const position = getEntityPosition(entity, layer)
			const data = getFieldIntances<'door'>(entity)
			ecs.add({ ...doorBundle(1, data.direction), position })
		};break
		case 'cauldron':{
			const position = getEntityPosition(entity, layer)
			ecs.add({ ...cauldronBundle(), position })
		}
	}
}

const spawnGroundAndTrees = (layer: LayerInstance) => {
	// ! Ground
	const groundMesh = new Mesh(
		new BoxGeometry(layer.__cWid * SCALE, 1, layer.__cHei * SCALE),
		new GroundShader(new Color(0x26854C)),
	)
	groundMesh.receiveShadow = true
	ecs.add({
		inMap: true,
		mesh: groundMesh,
		position: new Vector3(),
		...modelColliderBundle(groundMesh, RigidBodyType.Fixed),
	})
	for (let i = 0; i < layer.intGridCsv.length; i++) {
		const val = layer.intGridCsv[i]
		if (val === GroundType.Tree) {
			const x = i % layer.__cWid
			const y = Math.floor(i / layer.__cWid)
			const position = new Vector3(
				-x + layer.__cWid / 2 + between(-0.5, 0.5),
				0,
				-y + layer.__cHei / 2 + between(-0.5, 0.5),
			).multiplyScalar(SCALE)
			ecs.add({ ...treeBundle(), position })
		}
	}
}

export const spawnLevel = (level: Level) => () => {
	for (const layer of level.layerInstances!) {
		ecs.add({ map: true })
		switch (layer.__type) {
			case 'IntGrid' : {
				if (layer.__identifier === 'ground') {
					spawnGroundAndTrees(layer)
				}
			};break
			case 'Entities':{
				for (const entity of layer.entityInstances) {
					spawnEntity(entity, layer)
				}
			};break
		}
	}
}

export const spawnFarm = spawnLevel(assets.levels.levels.find(l => l.identifier === 'farm')!)
export const spawnDungeon: System<DungeonRessources> = ({ dungeon, direction, roomIndex }) => {
	ecs.add({ map: true })
	const room = dungeon.rooms[roomIndex]
	for (const layer of room.plan.layerInstances!) {
		switch (layer.__type) {
			case 'IntGrid':{
				if (layer.__identifier === 'ground') {
					spawnGroundAndTrees(layer)
				}
			};break
			case 'Entities':{
				for (const entity of layer.entityInstances) {
					const position = getEntityPosition(entity, layer)
					if (entity.__identifier === 'door') {
						const doorData = getFieldIntances<'door'>(entity)
						const dungeonDoor = room.doors.find(d => d?.direction === doorData.direction || doorData.direction === otherDirection[direction])
						if (dungeonDoor) {
							ecs.add({
								 ...doorBundle(dungeonDoor.to, dungeonDoor.direction),
								position,
							})
						}
						if (doorData.direction === otherDirection[direction]) {
							ecs.add({
								...playerBundle(),
								position: position.clone(),
								ignoreDoor: doorData.direction,
							})
						}
					}
				}
			}
		}
	}
}