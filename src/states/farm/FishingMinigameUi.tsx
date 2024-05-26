import { For, Show } from 'solid-js'
import Fish from '@assets/icons/fish-solid.svg'
import Exit from '@assets/icons/arrow-left-solid.svg'
import { css } from 'solid-styled'
import { MenuType } from '@/global/entity'
import { ecs } from '@/global/init'
import { useGame, useQuery } from '@/ui/store'
import { TouchButton } from '@/ui/TouchControls'

const fishingQuery = useQuery(ecs.with('menuType').where(e => e.menuType === MenuType.Fishing))
export const FishingMinigameUi = () => {
	const context = useGame()
	return (
		<Show when={context?.usingTouch() && context.player()}>
			{(player) => {
				css/* css */`
			.inputs-container{
				position: fixed;
				bottom: 0;
				right: 0;
				margin: 7em;
				display: flex;
				gap: 7rem;
				flex-direction: row-reverse;
			}
			`
				return (
					<For each={fishingQuery()}>
						{() => {
							return (
								<div class="inputs-container">
									<TouchButton input="primary" controller={player().playerControls.touchController!}>
										<Fish />
									</TouchButton>
									<TouchButton input="cancel" controller={player().menuInputs.touchController!}>
										<Exit />
									</TouchButton>
								</div>
							)
						}}
					</For>
				)
			}}
		</Show>
	)
}