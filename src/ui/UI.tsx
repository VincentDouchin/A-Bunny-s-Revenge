import { createArray } from 'solid-proxies'
import { Show } from 'solid-js'
import { DialogUi } from './DialogUi'
import { InteractionUi } from './Interactions'
import { KeyboardControls } from './KeyboardControl'
import { PauseUi } from './PauseUI'
import { TopRight } from './TopRight'
import { TouchControls } from './TouchControls'
import { StateUi } from './components/StateUi'
import { GameProvider } from './store'
import { Errors } from './Errors'
import { DebugUi } from '@/debug/debugUi'
import { campState, dungeonState, genDungeonState, mainMenuState } from '@/global/states'
import { EnemyHealthBarUi } from '@/states/dungeon/EnemyHealthBarUi'
import { HealthUi } from '@/states/dungeon/HealthUi'
import { LoseUi } from '@/states/dungeon/LoseUi'
import { SneezeUi } from '@/states/dungeon/SneezeUi'
import { CauldronMinigameUi } from '@/states/farm/CauldronMinigameUi'
import { CuttingBoardMinigameUi } from '@/states/farm/CuttingBoardMiniGameUi'
import { FishingMinigameUi } from '@/states/farm/FishingMinigameUi'
import { InventoryUi } from '@/states/farm/InventoryUi'
import { OvenMinigameUi } from '@/states/farm/OvenMinigameUi'
import { QuestUi } from '@/states/farm/QuestUi'
import { RecipesUi } from '@/states/farm/RecipesUi'
import { SeedUi } from '@/states/farm/SeedUi'
import { FullscreenUi } from '@/states/game/FullscreenUi'
import { OverlayUi } from '@/states/game/overlayUi'
import { LockIndicator } from '@/states/dungeon/lockIndicator'
import { ui } from '@/global/init'
import { debugState } from '@/debug/debugState'
import { MainMenuUi } from '@/states/mainMenu/MainMenuUi'

export const errors = createArray<string>([])
export const UI = () => {
	const debug = ui.sync(() => debugState.enabled)
	return (
		<GameProvider>
			<DebugUi />
			<Show when={!debug()}>

				<StateUi state={campState}>
					<RecipesUi />
					<OvenMinigameUi />
					<CauldronMinigameUi />
					<CuttingBoardMinigameUi />
					<InventoryUi />
					<SeedUi />
					<QuestUi />
					<HealthUi />
				</StateUi>
				<StateUi state={dungeonState}>
					<SneezeUi />
					<HealthUi />
					<LockIndicator />
				</StateUi>
				<StateUi state={genDungeonState}>
					<HealthUi />
				</StateUi>
				<StateUi state={dungeonState}>
					<EnemyHealthBarUi />
				</StateUi>
				<StateUi state={mainMenuState} disabled>
					<KeyboardControls />
				</StateUi>
				<StateUi state={mainMenuState}>
					<MainMenuUi />
				</StateUi>
				<Errors />
				<PauseUi />
				<FullscreenUi />
				<LoseUi />
				<DialogUi />
				<FishingMinigameUi />
				<TouchControls />
				<InteractionUi />
				<TopRight />
				<OverlayUi />
			</Show>

		</GameProvider>
	)
}