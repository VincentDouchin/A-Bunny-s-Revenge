import { PlayerUi } from '../states/farm/PlayerUi'
import { PauseUi } from './PauseUI'
import { StateUi } from './components/StateUi'
import { DebugUi } from '@/debug/debugUi'
import { LoseUi } from '@/states/dungeon/LoseUi'
import { dungeonState } from '@/global/states'
import { MiniMapUi } from '@/states/dungeon/MinimapUi'

export const UI = () => (
	<>
		<DebugUi />
		<PauseUi />
		<LoseUi />
		<PlayerUi />
		<StateUi state={dungeonState}>
			<MiniMapUi />
		</StateUi>
	</>
)