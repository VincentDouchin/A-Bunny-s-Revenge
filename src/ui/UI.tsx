import { FarmUi } from '../states/farm/FarmUi'
import { InteractionUi } from './Interactions'
import { PauseUI } from './PauseUI'
import { TouchControls } from './TouchControls'
import { DebugUi } from '@/debug/debugUi'

export const UI = () => (
	<>
		<DebugUi />
		<InteractionUi />
		<TouchControls />
		<PauseUI />
		<FarmUi />
	</>
)