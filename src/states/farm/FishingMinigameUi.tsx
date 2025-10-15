import Exit from '@assets/icons/arrow-left-solid.svg'
import Fish from '@assets/icons/fish-solid.svg'
import { For, Show } from 'solid-js'
import { MenuType } from '@/global/entity'
import { ecs, menuInputs } from '@/global/init'
import { useGame, useQuery } from '@/ui/store'
import { TouchButton } from '@/ui/TouchControls'

const fishingQuery = useQuery(ecs.with('menuType').where(e => e.menuType === MenuType.Fishing))
export const FishingMiniGameUi = () => {
	const context = useGame()
	return (
		<Show when={context?.usingTouch()}>
			<For each={fishingQuery()}>
				{_e => (
					<>
						<TouchButton size="10rem" input="primary" controller={menuInputs.touchController!}>
							{' '}
							<Fish />
							{' '}
						</TouchButton>
						<TouchButton size="7rem" distance="15rem" angle="100deg" input="cancel" controller={menuInputs.touchController!}>
							<Exit />
						</TouchButton>
					</>
				)}
			</For>
		</Show>
	)
}