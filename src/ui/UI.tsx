import { PlayerUi } from '../states/farm/PlayerUi'
import { PauseUi } from './PauseUI'
import { DebugUi } from '@/debug/debugUi'
import { LoseUi } from '@/states/dungeon/LoseUi'

export const UI = () => (
	<>
		<DebugUi />
		<PauseUi />
		<LoseUi />
		<PlayerUi />
	</>
)