import { ecs } from '@/global/init'
import { pausedState } from '@/global/states'

const playerControlsQuery = ecs.with('playerControls')
export const pauseGame = () => {
	for (const { playerControls } of playerControlsQuery) {
		if (playerControls.get('pause').justPressed) {
			pausedState.toggle()
		}
	}
}