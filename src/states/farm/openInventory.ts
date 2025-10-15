import type { Entity } from '@/global/entity'
import { MenuType } from '@/global/entity'
import { ecs, gameInputs } from '@/global/init'
import { app } from '@/global/states'

export const openMenu = (menu: MenuType) => (e: Entity) => ecs.addComponent(e, 'menuType', menu)

const playerInventoryClosedQuery = ecs.with('player').without('menuType')
const playerInventoryOpenQuery = ecs.with('player').with('menuType')
export const openPlayerInventory = () => {
	for (const player of playerInventoryClosedQuery) {
		if (gameInputs.get('inventory').justPressed) {
			ecs.addComponent(player, 'menuType', MenuType.Player)
		}
	}
}
export const closePlayerInventory = () => {
	for (const player of playerInventoryOpenQuery) {
		if (gameInputs.get('inventory').justPressed) {
			ecs.removeComponent(player, 'menuType')
		}
	}
}

const openInventoryQuery = ecs.with('menuType')
export const enableInventoryState = () => openInventoryQuery.onEntityAdded.subscribe(() => {
	app.enable('menu')
})
export const disableInventoryState = () => openInventoryQuery.onEntityRemoved.subscribe(() => {
	app.disable('menu')
})
export const toggleMenuState = [enableInventoryState, disableInventoryState]

const interactableQuery = ecs.with('collider', 'interactionContainer', 'interactable')
const dialogQuery = ecs.with('dialog')
const primaryQuery = interactableQuery.with('onPrimary')
const secondaryQuery = interactableQuery.with('onSecondary')
export const interact = () => {
	if (dialogQuery.size === 0 && app.isDisabled('paused')) {
		for (const entity of primaryQuery) {
			for (const player of playerInventoryClosedQuery) {
				if (gameInputs.get('primary').justPressed) {
					entity.onPrimary(entity, player)
				}
			}
		}
		for (const entity of secondaryQuery) {
			for (const player of playerInventoryClosedQuery) {
				if (gameInputs.get('secondary').justPressed) {
					entity.onSecondary(entity, player)
				}
			}
		}
	}
}