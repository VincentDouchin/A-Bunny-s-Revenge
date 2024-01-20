import { get } from 'idb-keyval'
import { Box3, Quaternion, Vector3 } from 'three'
import type { Object3D, Object3DEventMap } from 'three'

import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import type { models } from '@assets/assets'
import data from '@assets/levels/data.json'
import type { CollidersData, LevelData } from './LevelEditor'
import { props } from './props'
import { updateDebugColliders } from './debugCollider'
import type { State } from '@/lib/state'
import { assets, ecs } from '@/global/init'
import type { Entity } from '@/global/entity'

const getBoundingBox = (modelName: models, model: Object3D<Object3DEventMap>, colliderData: CollidersData): Entity => {
	const collider = colliderData[modelName]

	if (collider) {
		const size = new Vector3()
		if (collider.size) {
			size.set(...collider.size)
		} else {
			const boxSize = new Box3().setFromObject(model)
			boxSize.getSize(size)
		}
		return {
			bodyDesc: new RigidBodyDesc(collider.type).lockRotations(),
			colliderDesc: ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2).setTranslation(...collider.offset).setSensor(collider.sensor),
			size,
		}
	}
	return {}
}

const levelData = data.levelData as unknown as LevelData
const colliderData = data.colliderData as unknown as CollidersData
Object.assign(levelData, await get('levelData'))
Object.assign(colliderData, await get('colliderData'))
const spawnLevelData = () => ecs.with('map').onEntityAdded.subscribe(async (e) => {
	for (const [entityId, entityData] of Object.entries(levelData ?? {})) {
		if (entityData.map === e.map) {
			const model = assets.models[entityData.model].scene.clone()
			model.scale.setScalar(entityData.scale)
			const position = new Vector3().fromArray(entityData.position)
			const rotation = new Quaternion().set(...entityData.rotation)
			const bundleFn = props.find(p => p.models.includes(entityData.model))?.bundle
			const bundle = bundleFn ? bundleFn(entityId, entityData) : {}

			ecs.add({
				...bundle,
				...getBoundingBox(entityData.model, model, colliderData),
				entityId,
				model,
				position,
				rotation,
				inMap: true,

			})
		}
	}
})

export const debugPlugin = (state: State) => {
	state
		.addSubscriber(...updateDebugColliders, spawnLevelData)
}