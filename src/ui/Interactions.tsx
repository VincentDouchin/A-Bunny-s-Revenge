import { Match, Portal, Show, Switch } from 'solid-js/web'
import { ForQuery } from './components/ForQuery'
import { InputIcon } from './InputIcon'
import { ecs, ui } from '@/global/init'
import { playerInputMap } from '@/global/inputMaps'
import { Interactable } from '@/global/entity'
import { save } from '@/global/save'

const interactionQuery = ecs.with('interactable', 'interactionContainer', 'position').without('openInventory')
export const InteractionUi = () => {
	const primary = playerInputMap().playerControls.get('primary')
	const secondary = playerInputMap().playerControls.get('secondary')
	return (
		<ForQuery query={interactionQuery}>
			{(entity) => {
				if (entity.size) {
					entity.interactionContainer.position.y = entity.size.y - entity.position.y
				}
				const dialog = ui.sync(() => entity.currentDialog)
				const interactable = ui.sync(() => entity.interactable)
				return (
					<Show when={!dialog()}>
						<Portal mount={entity.interactionContainer.element}>
							<div style={{ 'background': 'hsl(0,0%,0%,0.3)', 'padding': '0.25rem 0.5rem', 'font-size': '1.5rem', 'color': 'white', 'border-radius': '1rem' }}>
								<Show when={entity.interactableSecondary}>
									<div style={{ display: 'flex', gap: '0.5rem' }}>
										<InputIcon input={secondary} />
										<div>{entity.interactableSecondary}</div>
									</div>
								</Show>
								<div style={{ display: 'flex', gap: '0.5rem' }}>
									<InputIcon input={primary}></InputIcon>
									<Switch fallback={(<div>{interactable()}</div>)}>
										<Match when={interactable() === Interactable.Plant}>
											{`plant ${save.selectedSeed}`}
										</Match>
									</Switch>
								</div>
							</div>
						</Portal>
					</Show>
				)
			}}
		</ForQuery>
	)
}