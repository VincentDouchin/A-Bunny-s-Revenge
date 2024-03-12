import { PlayerUi } from '../states/farm/PlayerUi'
import { DialogUi } from './DialogUi'
import { PauseUi } from './PauseUI'
import { StateUi } from './components/StateUi'
import { HealthBarUi } from '@/states/dungeon/HealthBarUi'
import { DebugUi } from '@/debug/debugUi'
import { dungeonState } from '@/global/states'
import { LoseUi } from '@/states/dungeon/LoseUi'
import { MiniMapUi } from '@/states/dungeon/MinimapUi'

export const UI = () => (
	<>
		<DebugUi />
		<PauseUi />
		<LoseUi />
		<PlayerUi />
		<StateUi state={dungeonState}>
			<HealthBarUi />
			<MiniMapUi />
		</StateUi>
		<DialogUi />
	</>
)