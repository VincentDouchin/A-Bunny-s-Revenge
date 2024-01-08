import { DialogUi } from './DialogUi'
import { PauseUI } from './PauseUI'
import { StateUi } from './components/StateUi'
import { TouchControls } from './TouchControls'
import { InteractionUi } from './Interactions'
import { DebugUi } from '@/debug/debugUi'
import { campState } from '@/global/states'
import { CuttingBoardUi, OvenUi } from '@/states/farm/CookingUi'
import { InventoryUi } from '@/states/farm/InventoryUi'

export const UI = () => (
	<>
		<DebugUi />
		<StateUi state={campState}>
			<InventoryUi />
			<DialogUi />
			<CuttingBoardUi />
			<OvenUi />
		</StateUi>
		<InteractionUi />
		<TouchControls />
		<PauseUI />
	</>
)