import type { Entity, Interactable } from '@/global/entity'
import { save } from '@/global/init'

export const inventoryBundle = (size: number, inventoryId: string, interactable?: Interactable) => {
	if (save.inventories[inventoryId] === undefined) {
		save.inventories[inventoryId] = []
	}
	return {
		inventorySize: size,
		inventory: save.inventories[inventoryId] ?? [],
		...(interactable && { interactable }),
		inventoryId,
	} as const satisfies Entity
}
