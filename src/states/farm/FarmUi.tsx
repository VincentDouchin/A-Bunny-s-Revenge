import { Show } from 'solid-js'
import { StateUi } from '../../ui/components/StateUi'
import { DialogUi } from '../../ui/DialogUi'
import { QuestUi } from './QuestUi'
import { ui } from '@/global/init'
import { playerInventoryQuery } from '@/utils/dialogHelpers'
import { InventoryUi } from '@/states/farm/InventoryUi'
import { CuttingBoardUi, OvenUi } from '@/states/farm/CookingUi'
import { SeedUi } from '@/states/farm/SeedUi'
import { ChestUi } from '@/states/farm/ChestUi'
import { campState } from '@/global/states'

const playerQuery = playerInventoryQuery.with('playerControls')
export const FarmUi = () => {
	const player = ui.sync(() => playerQuery.first)
	return (
		<Show when={player()}>
			{(player) => {
				return (
					<StateUi state={campState}>
						<InventoryUi player={player()} />
						<DialogUi />
						<CuttingBoardUi player={player()} />
						<OvenUi player={player()} />
						<SeedUi player={player()} />
						<QuestUi />
						<ChestUi />
					</StateUi>
				)
			}}
		</Show>
	)
}