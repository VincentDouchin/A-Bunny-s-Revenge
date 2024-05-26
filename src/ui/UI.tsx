import { PlayerUi } from '../states/farm/PlayerUi'
import { PauseUi } from './PauseUI'
import { TopRight } from './TopRight'
import { StateUi } from './components/StateUi'
import { GameProvider } from './store'
import { KeyboardControls } from './KeyboardControl'
import { TouchControls } from './TouchControls'
import { InteractionUi } from './Interactions'
import { DebugUi } from '@/debug/debugUi'
import { campState, dungeonState } from '@/global/states'
import { EnemyHealthBarUi } from '@/states/dungeon/EnemyHealthBarUi'
import { LoseUi } from '@/states/dungeon/LoseUi'
import { FullscreenUi } from '@/states/game/FullscreenUi'
import { OverlayUi } from '@/states/game/overlayUi'
import { RecipesUi } from '@/states/farm/RecipesUi'
import { FishingMinigameUi } from '@/states/farm/FishingMinigameUi'

export const UI = () => (
	<GameProvider>
		<DebugUi />
		<PauseUi />
		<FullscreenUi />
		<LoseUi />
		<PlayerUi />
		<FishingMinigameUi />
		<StateUi state={dungeonState}>
			<EnemyHealthBarUi />
		</StateUi>
		<StateUi state={campState}>
			<RecipesUi />
		</StateUi>
		<KeyboardControls />
		<TouchControls />
		<InteractionUi />
		<TopRight />
		<OverlayUi />
	</GameProvider>
)