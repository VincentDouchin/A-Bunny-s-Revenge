import type { app } from '@/global/states'
import type { UpdateSystem } from '@/lib/app'
import { ecs, save } from '@/global/init'
import { addItemToPlayer } from '@/utils/dialogHelpers'

const sellableItemsQuery = ecs.with('price', 'interactionContainer', 'itemLabel', 'stallPosition')
const playerQuery = ecs.with('player', 'playerControls')
export const buyItems: UpdateSystem<typeof app, 'dungeon'> = ({ dungeon }) => {
	for (const player of playerQuery) {
		for (const item of sellableItemsQuery) {
			if (save.acorns >= item.price && player.playerControls.get('primary').justReleased) {
				ecs.remove(item)
				if (dungeon.items) dungeon.items[item.stallPosition] = null
				addItemToPlayer({ name: item.itemLabel, quantity: 1, recipe: item.recipe })
				save.acorns -= item.price
				return
			}
		}
	}
}