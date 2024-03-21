import { Show, createMemo } from 'solid-js'
import { StateUi } from '../../ui/components/StateUi'
import { HealthUi } from '../dungeon/HealthUi'
import { BasketUi } from '../game/BasketUi'
import { CauldronMinigameUi } from './CauldronMinigameUi'
import { OvenMinigameUi } from './OvenMinigameUi'
import { QuestUi } from './QuestUi'
import { RecipesUi } from './RecipesUi'
import { inputManager, ui } from '@/global/init'
import { campState, dungeonState, openMenuState, pausedState } from '@/global/states'
import { ChestUi } from '@/states/farm/ChestUi'
import { InventoryUi } from '@/states/farm/InventoryUi'
import { SeedUi } from '@/states/farm/SeedUi'
import { InteractionUi } from '@/ui/Interactions'
import { TouchControls } from '@/ui/TouchControls'
import { ForQuery } from '@/ui/components/ForQuery'
import { playerInventoryQuery } from '@/utils/dialogHelpers'

const playerQuery = playerInventoryQuery.with('playerControls', 'maxHealth', 'currentHealth', 'maxHealth', 'currentHealth', 'strength', 'menuInputs')
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
						<Show when={!showTouch()}>
							<InteractionUi player={player} />
						</Show>
						<StateUi state={campState}>
							<RecipesUi player={player} />
							<OvenMinigameUi player={player} />
							<CauldronMinigameUi player={player} />
							<InventoryUi player={player} />
							<SeedUi player={player} />
							<QuestUi player={player} />
							<ChestUi />
							<HealthUi player={player}></HealthUi>
						</StateUi>
						<StateUi state={dungeonState}>
							<HealthUi player={player}></HealthUi>
						</StateUi>
						<BasketUi player={player} />
					</>
				)
			}}
		</ForQuery>
	)
}