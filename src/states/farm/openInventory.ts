import { ecs } from '@/global/init'
import { openMenuState } from '@/global/states'
import { addTag } from '@/lib/hierarchy'

const playerInventoryClosedQuery = ecs.with('playerControls').without('menuOpen')
const playerInventoryOpenQuery = ecs.with('playerControls').with('menuOpen')
export const openPlayerInventory = () => {
	for (const player of playerInventoryClosedQuery) {
		if (player.playerControls.get('inventory').justPressed) {
			addTag(player, 'menuOpen')
		}
	}
}
export const closePlayerInventory = () => {
	for (const player of playerInventoryOpenQuery) {
		if (player.playerControls.get('inventory').justPressed) {
			ecs.removeComponent(player, 'menuOpen')
		}
	}
}

const menuEntityQuery = ecs.with('menuType', 'interactionContainer')

export const openMenu = () => {
	for (const { playerControls } of playerInventoryClosedQuery) {
		if (playerControls.get('primary').justPressed) {
			for (const menuEntity of menuEntityQuery) {
				addTag(menuEntity, 'menuOpen')
			}
		}
	}
}

const openMenuEntityQuery = ecs.with('menuOpen', 'menuInputs')
export const closeMenu = () => {
	for (const menuEntity of openMenuEntityQuery) {
		if (menuEntity.menuInputs.get('cancel').justPressed) {
			ecs.removeComponent(menuEntity, 'menuOpen')
		}
	}
}
// const playerCollider = ecs.with('sensorCollider', 'playerControls')
// const cauldronQuery = ecs.with('inventory', 'collider', 'menuInputs')
// export const openCauldronInventory = () => {
// 	for (const player of playerCollider) {
// 		const { sensorCollider, playerControls } = player
// 		for (const cauldron of cauldronQuery) {
// 			if (world.intersectionPair(cauldron.collider, sensorCollider)) {
// 				if (playerControls.get('primary').justReleased) {
// 					addTag(cauldron, 'openInventory')
// 				}
// 			}
// 		}
// 	}
// }
// export const closeCauldronInventory = () => {
// 	for (const cauldron of cauldronQuery) {
// 		if (cauldron.menuInputs.get('cancel').justReleased) {
// 			ecs.removeComponent(cauldron, 'openInventory')
// 		}
// 	}
// }

const openInventoryQuery = ecs.with('menuOpen')
export const enableInventoryState = () => openInventoryQuery.onEntityAdded.subscribe(() => {
	openMenuState.enable()
})
export const disableInventoryState = () => openInventoryQuery.onEntityRemoved.subscribe(() => {
	openMenuState.disable()
})
export const toggleMenuState = [enableInventoryState, disableInventoryState]
