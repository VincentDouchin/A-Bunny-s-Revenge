import { DebugUi } from '@/debug/debugUi'
import { ui } from '@/global/init'
import { app } from '@/global/states'
import { EnemyHealthBarUi } from '@/states/dungeon/EnemyHealthBarUi'
import { HealthUi } from '@/states/dungeon/HealthUi'
import { LockIndicator } from '@/states/dungeon/lockIndicator'
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
import { MainMenuUi } from '@/states/mainMenu/MainMenuUi'
import { Show } from 'solid-js'
import { StateUi } from './components/StateUi'
import { DialogUi } from './DialogUi'
import { Errors } from './Errors'
import { InteractionUi } from './Interactions'
import { KeyboardControls } from './KeyboardControl'
import { KeyItem } from './KeyItem'
import { PauseUi } from './PauseUI'
import { GameProvider } from './store'
import { TopRight } from './TopRight'
import { TouchControls } from './TouchControls'
import { TutorialUi } from './Tutorial'

export const UI = () => {
	const debug = ui.sync(() => app.isEnabled('debug'))
	return (
		<GameProvider>
			<DebugUi />
			<Show when={!debug()}>

				<StateUi state="farm">
					<RecipesUi />
					<OvenMinigameUi />
					<CauldronMinigameUi />
					<CuttingBoardMinigameUi />
					<InventoryUi />
					<SeedUi />
					<QuestUi />
					<HealthUi />
				</StateUi>
				<StateUi state="dungeon">
					<SneezeUi />
					<HealthUi />
					<LockIndicator />
					<EnemyHealthBarUi />
				</StateUi>
				<StateUi state="clearing">
					<HealthUi />
				</StateUi>
				<StateUi state="mainMenu" disabled>
					<KeyboardControls />
				</StateUi>
				<StateUi state="mainMenu">
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
				<KeyItem />
				<TutorialUi />
			</Show>

		</GameProvider>
	)
}