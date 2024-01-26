import { Show, createMemo } from 'solid-js'
import { StateUi } from '../../ui/components/StateUi'
import { DialogUi } from '../../ui/DialogUi'
import { HealthUi } from '../dungeon/HealthUi'
import { QuestUi } from './QuestUi'
import { inputManager, ui } from '@/global/init'
import { playerInventoryQuery } from '@/utils/dialogHelpers'
import { InventoryUi } from '@/states/farm/InventoryUi'
import { CuttingBoardUi, OvenUi } from '@/states/farm/CookingUi'
import { SeedUi } from '@/states/farm/SeedUi'
import { ChestUi } from '@/states/farm/ChestUi'
import { campState, dungeonState, openMenuState, pausedState } from '@/global/states'
import { InteractionUi } from '@/ui/Interactions'
import { TouchControls } from '@/ui/TouchControls'
import { ForQuery } from '@/ui/components/ForQuery'

const playerQuery = playerInventoryQuery.with('playerControls', 'maxHealth', 'currentHealth', 'maxHealth', 'currentHealth', 'strength')
export const PlayerUi = () => {
	const controls = ui.sync(() => inputManager.controls)
	const isMenuOpen = ui.sync(() => openMenuState.enabled)
	const isTouch = createMemo(() => controls() === 'touch')
	const isPauseState = ui.sync(() => pausedState.enabled)
	return (
		<ForQuery query={playerQuery}>
			{(player) => {
				const playerInputs = createMemo(() => player?.playerControls.touchController)
				const showTouch = createMemo(() => isTouch() && playerInputs() && !isMenuOpen() && !isPauseState())
				return (
					<>
						<Show when={showTouch()}>
							<TouchControls player={player} />
						</Show>
						<StateUi state={campState}>
							<InventoryUi player={player} />
							<DialogUi />
							<CuttingBoardUi player={player} />
							<OvenUi player={player} />
							<SeedUi player={player} />
							<QuestUi />
							<ChestUi />
							<HealthUi player={player}></HealthUi>
							<Show when={!showTouch()}>
								<InteractionUi player={player} />
							</Show>
						</StateUi>
						<StateUi state={dungeonState}>
							<HealthUi player={player}></HealthUi>
						</StateUi>
					</>
				)
			}}
		</ForQuery>
	)
}