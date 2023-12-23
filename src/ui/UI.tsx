import { StateUi } from './StateUi'
import { DialogUi } from './DialogUi'
import { DebugUi } from '@/debug/debugUi'
import { campState } from '@/global/states'
import { CauldronUi } from '@/states/farm/CauldronUi'
import { InventoryUi } from '@/states/farm/InventoryUi'

export const UI = () => (
	<>
		<DebugUi />
		<StateUi state={campState}>
			<InventoryUi />
			<CauldronUi />
			<DialogUi />
		</StateUi>
	</>
)