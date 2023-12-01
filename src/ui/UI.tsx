import { StateUi } from './StateUi'
import { DebugUi } from '@/debug/debugUi'
import { campState } from '@/global/states'
import { InventoryUi } from '@/states/farm/InventoryUi'

export const UI = () => (
	<>
		<DebugUi />
		<StateUi state={campState}>
			<InventoryUi />
		</StateUi>
	</>
)