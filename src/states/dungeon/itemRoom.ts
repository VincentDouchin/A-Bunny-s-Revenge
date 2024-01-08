import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { Vector3 } from 'three'
import { RoomType } from './dungeonTypes'
import { assets, ecs } from '@/global/init'
import type { DungeonRessources } from '@/global/states'
import { modelColliderBundle } from '@/lib/models'
import type { System } from '@/lib/state'
import { getRandom } from '@/utils/mapFunctions'
import { Sizes } from '@/constants/sizes'

export const spawnItems: System<DungeonRessources> = ({ dungeon, roomIndex }) => {
	if (dungeon.rooms[roomIndex].type === RoomType.Item) {
		for (let i = 0; i < 8; i++) {
			const model = getRandom(assets.crops.mushroom.stages).scene.clone()
			model.scale.multiplyScalar(10)
			const x = Math.cos(i * Math.PI / 4) * 5
			const y = Math.sin(i * Math.PI / 4) * 5
			ecs.add({
				...modelColliderBundle(model, RigidBodyType.Fixed, true, Sizes.small),
				position: new Vector3(x, 0, y),
				crop: { stage: 3, name: 'mushroom' },
				interactable: 'harvest',
				inMap: true,
			})
		}
	}
}