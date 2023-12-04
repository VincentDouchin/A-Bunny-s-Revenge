import { ecs } from '@/global/init'
import { openMenuState } from '@/global/states'
import { addTag } from '@/lib/hierarchy'

const playerInventoryClosedQuery = ecs.with('playerControls').without('openInventory')
const playerInventoryOpenQuery = ecs.with('playerControls').with('openInventory')
export const openInventory = () => {
	for (const player of playerInventoryClosedQuery) {
		if (player.playerControls.get('inventory').justPressed) {
			addTag(player, 'openInventory')
		}
	}
}
export const closeInventory = () => {
	for (const player of playerInventoryOpenQuery) {
		if (player.playerControls.get('inventory').justPressed) {
			ecs.removeComponent(player, 'openInventory')
		}
	}
}
const openInventoryQuery = ecs.with('openInventory')
const enableInventoryState = () => openInventoryQuery.onEntityAdded.subscribe(() => {
	openMenuState.enable()
})
const disableInventoryState = () => openInventoryQuery.onEntityRemoved.subscribe(() => {
	openMenuState.disable()
})
export const toggleMenuState = [enableInventoryState, disableInventoryState]
