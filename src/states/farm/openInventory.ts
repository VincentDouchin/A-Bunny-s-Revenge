import type { Entity } from '@/global/entity'
import { MenuType } from '@/global/entity'
import { ecs } from '@/global/init'
import { openMenuState, pausedState } from '@/global/states'

export const openMenu = (menu: MenuType) => (e: Entity) => ecs.addComponent(e, 'menuType', menu)

const playerInventoryClosedQuery = ecs.with('playerControls').without('menuType')
const playerInventoryOpenQuery = ecs.with('playerControls').with('menuType')
export const openPlayerInventory = () => {
	for (const player of playerInventoryClosedQuery) {
		if (player.playerControls.get('inventory').justPressed) {
			ecs.addComponent(player, 'menuType', MenuType.Player)
		}
	}
}
export const closePlayerInventory = () => {
	for (const player of playerInventoryOpenQuery) {
		if (player.playerControls.get('inventory').justPressed) {
			ecs.removeComponent(player, 'menuType')
		}
	}
}

const openInventoryQuery = ecs.with('menuType')
export const enableInventoryState = () => openInventoryQuery.onEntityAdded.subscribe(() => {
	openMenuState.enable()
})
export const disableInventoryState = () => openInventoryQuery.onEntityRemoved.subscribe(() => {
	openMenuState.disable()
})
export const toggleMenuState = [enableInventoryState, disableInventoryState]

const interactableQuery = ecs.with('collider', 'interactionContainer', 'interactable')
const dialogQuery = ecs.with('dialog')
const primaryQuery = interactableQuery.with('onPrimary')
const secondaryQuery = interactableQuery.with('onSecondary')
export const interact = () => {
	if (dialogQuery.size === 0 && pausedState.disabled) {
		for (const entity of primaryQuery) {
			for (const player of playerInventoryClosedQuery) {
				if (player.playerControls.get('primary').justPressed) {
					entity.onPrimary(entity, player)
				}
			}
		}
		for (const entity of secondaryQuery) {
			for (const player of playerInventoryClosedQuery) {
				if (player.playerControls.get('secondary').justPressed) {
					entity.onSecondary(entity, player)
				}
			}
		}
	}
}