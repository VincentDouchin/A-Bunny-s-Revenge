import { get } from 'idb-keyval'
import type { Object3D, Object3DEventMap } from 'three'
import { Box3, Quaternion, Vector3 } from 'three'
import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import type { models } from '@assets/assets'
import type { CollidersData, LevelData } from './LevelEditor'
import { props } from './props'
import { updateDebugColliders } from './debugCollider'
import type { State } from '@/lib/state'
import { assets, ecs } from '@/global/init'
import type { Entity } from '@/global/entity'

const levelData = await get('levelData') as LevelData ?? {}
const colliderData = await get('colliderData') as CollidersData ?? {}

const getBoundingBox = (modelName: models, model: Object3D<Object3DEventMap>): Entity => {
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

const spawnLevelData = () => ecs.with('map').onEntityAdded.subscribe(async (e) => {
	for (const [entityId, data] of Object.entries(levelData ?? {})) {
		if (data.map === e.map) {
			const model = assets.models[data.model].scene.clone()
			model.scale.setScalar(data.scale)
			const position = new Vector3().fromArray(data.position)
			const rotation = new Quaternion().set(...data.rotation)
			const bundleFn = props.find(p => p.models.includes(data.model))?.bundle
			const bundle = bundleFn ? bundleFn() : {}

			ecs.add({
				...bundle,
				...getBoundingBox(data.model, model),
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