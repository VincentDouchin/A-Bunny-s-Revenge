import { Vector3 } from 'three'
import { dialogs } from '@/constants/dialogs'
import { assets, ecs } from '@/global/init'
import { cutSceneState } from '@/global/states'
import { movePlayerTo } from '@/utils/dialogHelpers'
import { displayKeyItem } from '@/ui/KeyItem'

const playerQuery = ecs.with('player', 'position', 'rotation', 'targetRotation')

export const startIntro = async () => {
	const player = playerQuery.first
	if (player) {
		ecs.update(player, {
			dialog: dialogs.PlayerIntro1(),
			activeDialog: 'instant',
		})
	}
}

export const enableCutscene = () => {
	cutSceneState.enable()
	return () => cutSceneState.disable()
}

const basketQuery = ecs.with('basket', 'position', 'rotation')
export const pickUpBasket = async () => {
	for (const basket of basketQuery) {
		const dest = basket.position.clone().add(new Vector3(0, 0, 5).applyQuaternion(basket.rotation))
		await movePlayerTo(dest)
		ecs.remove(basket)
		const basketItem = assets.models.basket.scene
		basketItem.scale.setScalar(0.6)
		await displayKeyItem(basketItem, 'Basket of ingredients')
		const player = playerQuery.first
		if (player) {
			ecs.removeComponent(player, 'dialog')
			ecs.removeComponent(player, 'activeDialog')
			setTimeout(() => {
				ecs.update(player, {
					dialog: dialogs.pickupBasket2(),
					activeDialog: 'instant',
				})
			}, 1000)
		}
	}
}