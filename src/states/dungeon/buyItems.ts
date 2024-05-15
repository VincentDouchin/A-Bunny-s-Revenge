import { ecs } from '@/global/init'
import { save, updateSave } from '@/global/save'
import type { DungeonRessources } from '@/global/states'
import type { System } from '@/lib/state'
import { addItemToPlayer } from '@/utils/dialogHelpers'

const sellableItemsQuery = ecs.with('price', 'interactionContainer', 'itemLabel', 'stallPosition')
const playerQuery = ecs.with('player', 'playerControls')
export const buyItems: System<DungeonRessources> = ({ dungeon }) => {
	for (const player of playerQuery) {
		for (const item of sellableItemsQuery) {
			if (save.acorns >= item.price && player.playerControls.get('primary').justReleased) {
				ecs.remove(item)
				if (dungeon.items) dungeon.items[item.stallPosition] = null
				addItemToPlayer({ name: item.itemLabel, quantity: 1, recipe: item.recipe })
				updateSave(s => s.acorns -= item.price)
				return
			}
		}
	}
}