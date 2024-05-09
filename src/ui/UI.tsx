import { PlayerUi } from '../states/farm/PlayerUi'
import { PauseUi } from './PauseUI'
import { StateUi } from './components/StateUi'
import { Toaster } from './Toaster'
import { DebugUi } from '@/debug/debugUi'
import { dungeonState } from '@/global/states'
import { EnemyHealthBarUi } from '@/states/dungeon/EnemyHealthBarUi'
import { LoseUi } from '@/states/dungeon/LoseUi'
import { MiniMapUi } from '@/states/dungeon/MinimapUi'
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
			<MiniMapUi />
		</StateUi>
		<OverlayUi />
		<Toaster />
	</>
)