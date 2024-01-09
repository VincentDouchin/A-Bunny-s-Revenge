import { Portal, Show } from 'solid-js/web'
import { ForQuery } from './components/ForQuery'
import { InputIcon } from './InputIcon'
import { ecs, ui } from '@/global/init'
import { playerInputMap } from '@/global/inputMaps'

const interactionQuery = ecs.with('interactable', 'interactionContainer', 'position')
export const InteractionUi = () => {
	const input = playerInputMap().playerControls.get('interact')
	return (
		<ForQuery query={interactionQuery}>
			{(entity) => {
				if (entity.size) {
					entity.interactionContainer.position.y = entity.size.y - entity.position.y
				}
				const dialog = ui.sync(() => entity.currentDialog)
				return (
					<Show when={!dialog()}>
						<Portal mount={entity.interactionContainer.element}>
							<div style={{ 'background': 'hsl(0,0%,0%,0.3)', 'padding': '0.25rem 0.5rem', 'font-size': '1.5rem', 'color': 'white', 'border-radius': '1rem', 'display': 'flex', 'gap': '0.5rem' }}>
								<InputIcon input={input}></InputIcon>
								<div>
									{entity.interactable}
								</div>
							</div>
						</Portal>
					</Show>
				)
			}}
		</ForQuery>
	)
}