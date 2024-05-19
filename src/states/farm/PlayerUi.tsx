import { For } from 'solid-js'
import { StateUi } from '../../ui/components/StateUi'
import { HealthUi } from '../dungeon/HealthUi'
import { SneezeUi } from '../dungeon/SneezeUi'
import { BasketUi } from '../game/BasketUi'
import { CauldronMinigameUi } from './CauldronMinigameUi'
import { CuttingBoardMinigameUi } from './CuttingBoardMiniGameUi'
import { OvenMinigameUi } from './OvenMinigameUi'
import { QuestUi } from './QuestUi'
import { playerInventoryQuery } from '@/utils/dialogHelpers'
import { useQuery } from '@/ui/store'
import { DialogUi } from '@/ui/DialogUi'
import { SeedUi } from '@/states/farm/SeedUi'
import { InventoryUi } from '@/states/farm/InventoryUi'
import { campState, dungeonState, genDungeonState } from '@/global/states'

const playerQuery = useQuery(playerInventoryQuery.with('playerControls', 'maxHealth', 'currentHealth', 'maxHealth', 'currentHealth', 'strength', 'menuInputs', 'sneeze', 'debuffsContainer', 'poisoned', 'position'))
export const PlayerUi = () => {
	return (
		<For each={playerQuery()}>
			{(player) => {
				return (
					<>
						<DialogUi player={player} />
						<StateUi state={campState}>

							<OvenMinigameUi player={player} />
							<CauldronMinigameUi player={player} />
							<CuttingBoardMinigameUi player={player} />
							<InventoryUi player={player} />
							<SeedUi player={player} />
							<QuestUi player={player} />
							<HealthUi player={player} />
						</StateUi>
						<StateUi state={dungeonState}>
							<SneezeUi player={player} />
							<HealthUi player={player} />
						</StateUi>
						<StateUi state={genDungeonState}>
							<HealthUi player={player} />
						</StateUi>
						<BasketUi player={player} />
					</>
				)
			}}
		</For>
	)
}