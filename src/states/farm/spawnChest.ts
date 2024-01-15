import { Quaternion, Vector3 } from 'three'
import { kitchenApplianceBundle } from './kitchen'
import { inventoryBundle } from '@/states/game/inventory'
import { ecs } from '@/global/init'
import { Interactable, MenuType } from '@/global/entity'

export const spawnChest = () => {
	const bundle = inventoryBundle(MenuType.Chest, 16, 'chest1', Interactable.Open)
	bundle.inventory.push({ name: 'carrot_seeds', quantity: 10 }, { name: 'beet_seeds', quantity: 10 })
	ecs.add({
		...bundle,
		...kitchenApplianceBundle('Chest', 'front', 10),
		position: new Vector3(0, 0, 40),
		rotation: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI),
	})
}