import type { app } from '@/global/states'
import type { UpdateSystem } from '@/lib/app'
import { ecs, gameInputs, save } from '@/global/init'
import { addItemToPlayer } from '@/utils/dialogHelpers'

const sellableItemsQuery = ecs.with('price', 'interactionContainer', 'itemLabel', 'stallPosition')
export const buyItems: UpdateSystem<typeof app, 'dungeon'> = ({ dungeon }) => {
	for (const item of sellableItemsQuery) {
		if (save.acorns >= item.price && gameInputs.get('primary').justReleased) {
			ecs.remove(item)
			if (dungeon.items) dungeon.items[item.stallPosition] = null
			addItemToPlayer({ name: item.itemLabel, quantity: 1, recipe: item.recipe })
			save.acorns -= item.price
			return
		}
	}
}