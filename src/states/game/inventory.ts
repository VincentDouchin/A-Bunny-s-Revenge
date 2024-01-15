import type { Entity, Interactable, InventoryTypes } from '@/global/entity'
import { menuInputMap } from '@/global/inputMaps'
import { save, updateSave } from '@/global/save'

export const inventoryBundle = (inventoryType: InventoryTypes, size: number, inventoryId: string, interactable?: Interactable) => {
	if (save.inventories[inventoryId] === undefined) {
		updateSave(s => s.inventories[inventoryId] = [])
	}
	return {
		...menuInputMap(),
		inventoryType,
		inventorySize: size,
		inventory: save.inventories[inventoryId] ?? [],
		...(interactable && { interactable }),
		inventoryId,
	} as const satisfies Entity
}
