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
		ecs.add({
			dialog: dialogs.PlayerIntro1(),
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
		await displayKeyItem(assets.models.basket.scene, 'Basket of ingredients', 0.6)
	}
}