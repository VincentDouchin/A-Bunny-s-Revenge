import { PlayerUi } from '../states/farm/PlayerUi'
import { PauseUi } from './PauseUI'
import { TopRight } from './TopRight'
import { StateUi } from './components/StateUi'
import { GameProvider } from './store'
import { KeyboardControls } from './KeyboardControl'
import { TouchControls } from './TouchControls'
import { InteractionUi } from './Interactions'
import { DebugUi } from '@/debug/debugUi'
import { dungeonState } from '@/global/states'
import { EnemyHealthBarUi } from '@/states/dungeon/EnemyHealthBarUi'
import { LoseUi } from '@/states/dungeon/LoseUi'
import { FullscreenUi } from '@/states/game/FullscreenUi'
import { OverlayUi } from '@/states/game/overlayUi'

export const UI = () => (
	<GameProvider>
		<DebugUi />
		<PauseUi />
		<FullscreenUi />
		<LoseUi />
		<PlayerUi />
		<StateUi state={dungeonState}>
			<EnemyHealthBarUi />
		</StateUi>
		<KeyboardControls />
		<TouchControls />
		<InteractionUi />
		<TopRight />
		<OverlayUi />
	</GameProvider>
)