import type { Entity, Interactable } from '@/global/entity'
import { save, updateSave } from '@/global/save'

export const inventoryBundle = (size: number, inventoryId: string, interactable?: Interactable) => {
	if (save.inventories[inventoryId] === undefined) {
		updateSave(s => s.inventories[inventoryId] = [])
	}
	return {
		inventorySize: size,
		inventory: save.inventories[inventoryId] ?? [],
		...(interactable && { interactable }),
		inventoryId,
	} as const satisfies Entity
}
