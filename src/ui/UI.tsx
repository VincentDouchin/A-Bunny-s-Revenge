import { PlayerUi } from '../states/farm/FarmUi'
import { PauseUI } from './PauseUI'
import { TouchControls } from './TouchControls'
import { DebugUi } from '@/debug/debugUi'

export const UI = () => (
	<>
		<DebugUi />
		<TouchControls />
		<PauseUI />
		<PlayerUi />
	</>
)