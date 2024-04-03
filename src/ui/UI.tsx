import { PlayerUi } from '../states/farm/PlayerUi'
import { DialogUi } from './DialogUi'
import { PauseUi } from './PauseUI'
import { StateUi } from './components/StateUi'
import { DebugUi } from '@/debug/debugUi'
import { dungeonState } from '@/global/states'
import { HealthBarUi } from '@/states/dungeon/HealthBarUi'
import { LoseUi } from '@/states/dungeon/LoseUi'
import { MiniMapUi } from '@/states/dungeon/MinimapUi'
import { FullscreenUi } from '@/states/game/FullscreenUi'
import { OverlayUi } from '@/states/game/overlayUi'
import type { } from 'solid-styled-jsx'

export const UI = () => (
	<>
		<DebugUi />
		<PauseUi />
		<FullscreenUi />
		<LoseUi />
		<PlayerUi />
		<StateUi state={dungeonState}>
			<HealthBarUi />
			<MiniMapUi />
		</StateUi>
		<DialogUi />
		<OverlayUi />
	</>
)