import { PlayerUi } from '../states/farm/PlayerUi'
import { PauseUi } from './PauseUI'
import { TopRight } from './TopRight'
import { StateUi } from './components/StateUi'
import { DebugUi } from '@/debug/debugUi'
import { dungeonState } from '@/global/states'
import { EnemyHealthBarUi } from '@/states/dungeon/EnemyHealthBarUi'
import { LoseUi } from '@/states/dungeon/LoseUi'
import { FullscreenUi } from '@/states/game/FullscreenUi'
import { OverlayUi } from '@/states/game/overlayUi'

export const UI = () => (
	<>
		<DebugUi />
		<PauseUi />
		<FullscreenUi />
		<LoseUi />
		<PlayerUi />
		<StateUi state={dungeonState}>
			<EnemyHealthBarUi />
		</StateUi>
		<TopRight />
		<OverlayUi />
	</>
)