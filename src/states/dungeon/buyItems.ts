import { ecs } from '@/global/init'
import { save, updateSave } from '@/global/save'
import { addItemToPlayer } from '@/utils/dialogHelpers'

const sellableItemsQuery = ecs.with('price', 'interactionContainer', 'itemLabel')
const playerQuery = ecs.with('player', 'playerControls')
export const buyItems = () => {
	for (const player of playerQuery) {
		for (const item of sellableItemsQuery) {
			if (save.acorns >= item.price && player.playerControls.get('primary').justPressed) {
				ecs.remove(item)
				addItemToPlayer({ name: item.itemLabel, quantity: 1 })
				updateSave(s => s.acorns -= item.price)
				return
			}
		}
	}
}