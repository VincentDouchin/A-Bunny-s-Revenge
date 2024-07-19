import { Vector3 } from 'three'
import { ecs } from '@/global/init'
import { cutSceneState } from '@/global/states'
import { movePlayerTo } from '@/utils/dialogHelpers'
import { sleep } from '@/utils/sleep'
import { dialogs } from '@/constants/dialogs'

const playerQuery = ecs.with('player', 'position', 'rotation', 'targetRotation')

export const startIntro = async () => {
	cutSceneState.enable()
	const player = playerQuery.first
	if (player) {
		await sleep(100)
		await movePlayerTo(player.position.clone().add(new Vector3(0, 0, 50).applyQuaternion(player.rotation)))
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