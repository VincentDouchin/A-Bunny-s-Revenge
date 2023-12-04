import { Vector3 } from 'three'
import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { assets, ecs, world } from '@/global/init'
import { modelColliderBundle } from '@/lib/models'
import { menuInputMap } from '@/lib/inputs'
import { addTag } from '@/lib/hierarchy'

export const spawnCauldron = () => {
	const model = assets.characters.cauldron.scene.clone()
	model.scale.setScalar(10)
	const bundle = modelColliderBundle(model, RigidBodyType.Fixed)
	ecs.add({
		...bundle,
		...menuInputMap(),
		position: new Vector3(20, bundle.size.y, 0),
		cauldron: [null, null, null, null],
		inMap: true,

	})
}
const playerCollider = ecs.with('sensorCollider', 'playerControls')
const cauldronQuery = ecs.with('cauldron', 'collider', 'menuInputs')
export const openCauldronInventory = () => {
	for (const player of playerCollider) {
		const { sensorCollider, playerControls } = player
		for (const cauldron of cauldronQuery) {
			if (world.intersectionPair(cauldron.collider, sensorCollider)) {
				if (playerControls.get('interact').justPressed) {
					addTag(cauldron, 'openInventory')
				}
			}
		}
	}
}
export const closeCauldronInventory = () => {
	for (const cauldron of cauldronQuery) {
		if (cauldron.menuInputs.get('cancel').justPressed) {
			ecs.removeComponent(cauldron, 'openInventory')
		}
	}
}