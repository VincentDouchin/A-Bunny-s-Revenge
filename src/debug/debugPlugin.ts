import type { Object3D, Object3DEventMap } from 'three'
import { Box3, Quaternion, Vector3 } from 'three'

import type { models } from '@assets/assets'
import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import type { CollidersData } from './LevelEditor'
import { props } from './props'
import type { State } from '@/lib/state'
import { assets, ecs, levelsData } from '@/global/init'
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
		if (collider.offset) {
			return {
				bodyDesc: new RigidBodyDesc(collider.type).lockRotations(),
				colliderDesc: ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2).setTranslation(...collider.offset).setSensor(collider.sensor),
				size,
			}
		}
	}
	return {}
}

const spawnLevelData = () => ecs.with('map').onEntityAdded.subscribe(async (e) => {
	const { levelData, colliderData } = levelsData
	for (const [entityId, entityData] of Object.entries(levelData ?? {})) {
		if (entityData.map === e.map) {
			const model = assets.models[entityData.model].scene.clone()
			model.scale.setScalar(entityData.scale)
			const position = new Vector3().fromArray(entityData.position)
			const rotation = new Quaternion().set(...entityData.rotation)
			const bundleFn = props.find(p => p.models.includes(entityData.model))?.bundle
			const bundle = bundleFn ? bundleFn(entityId, entityData) : {}

			ecs.add({
				rotation,
				position,
				...bundle,
				...getBoundingBox(entityData.model, model, colliderData),
				entityId,
				model,
				inMap: true,

			})
		}
	}
})
export const debugPlugin = (state: State) => {
	state
		.addSubscriber(spawnLevelData)
}