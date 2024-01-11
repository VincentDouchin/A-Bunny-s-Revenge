import { RigidBodyType } from '@dimforge/rapier3d-compat'
import { type Entity, Interactable } from '@/global/entity'
import { assets, ecs, world } from '@/global/init'
import { addTag } from '@/lib/hierarchy'
import { menuInputMap } from '@/global/inputMaps'
import { modelColliderBundle } from '@/lib/models'

export const cauldronBundle = (): Entity => {
	const model = assets.characters.cauldron.scene.clone()
	model.scale.setScalar(10)
	const bundle = modelColliderBundle(model, RigidBodyType.Fixed)
	return {
		...bundle,
		interactable: Interactable.Cook,
		...menuInputMap(),
		inventory: [null, null, null, null],
		inMap: true,

	}
}
const playerCollider = ecs.with('sensorCollider', 'playerControls')
const cauldronQuery = ecs.with('inventory', 'collider', 'menuInputs')
export const openCauldronInventory = () => {
	for (const player of playerCollider) {
		const { sensorCollider, playerControls } = player
		for (const cauldron of cauldronQuery) {
			if (world.intersectionPair(cauldron.collider, sensorCollider)) {
				if (playerControls.get('primary').justPressed) {
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