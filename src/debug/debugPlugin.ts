import { get } from 'idb-keyval'
import { Quaternion, Vector3 } from 'three'
import type { LevelData } from './LevelEditor'
import { addDebugCollider } from './debugCollider'
import type { State } from '@/lib/state'
import { assets, ecs } from '@/global/init'

const levelData = await get('levelData') as LevelData
const spawnLevelData = () => ecs.with('map').onEntityAdded.subscribe(async (e) => {
	for (const [entityId, data] of Object.entries(levelData ?? {})) {
		if (data.map === e.map) {
			const model = assets.models[data.model].scene.clone()
			model.scale.setScalar(data.scale)
			const position = new Vector3().fromArray(data.position)
			const rotation = new Quaternion().set(...data.rotation)
			ecs.add({
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
		.addSubscriber(addDebugCollider, spawnLevelData)
}