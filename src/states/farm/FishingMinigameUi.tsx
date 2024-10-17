import { MenuType } from '@/global/entity'
import { ecs } from '@/global/init'
import { useGame, useQuery } from '@/ui/store'
import { TouchButton } from '@/ui/TouchControls'
import Exit from '@assets/icons/arrow-left-solid.svg'
import Fish from '@assets/icons/fish-solid.svg'
import { For, Show } from 'solid-js'

const fishingQuery = useQuery(ecs.with('menuType').where(e => e.menuType === MenuType.Fishing))
export const FishingMinigameUi = () => {
	const context = useGame()
	return (
		<Show when={context?.usingTouch() && context.player()}>
			{(player) => {
				return (
					<For each={fishingQuery()}>
						{() => {
							return (
								<>
									<TouchButton size="10rem" input="primary" controller={player().playerControls.touchController!}>
										<Fish />
									</TouchButton>
									<TouchButton size="7rem" distance="15rem" angle="100deg" input="cancel" controller={player().menuInputs.touchController!}>
										<Exit />
									</TouchButton>
								</>
							)
						}}
					</For>
				)
			}}
		</Show>
	)
}