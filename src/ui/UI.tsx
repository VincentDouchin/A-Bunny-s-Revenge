import { PlayerUi } from '../states/farm/FarmUi'
import { PauseUI } from './PauseUI'
import { DebugUi } from '@/debug/debugUi'

export const UI = () => (
	<>
		<DebugUi />
		<PauseUI />
		<PlayerUi />
	</>
)