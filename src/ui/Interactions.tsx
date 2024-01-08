import { Portal } from 'solid-js/web'
import { ForQuery } from './components/ForQuery'
import { InputIcon } from './InputIcon'
import { ecs } from '@/global/init'
import { playerInputMap } from '@/global/inputMaps'

const interactionQuery = ecs.with('interactable', 'interactionContainer', 'size', 'position')
export const InteractionUi = () => {
	const input = playerInputMap().playerControls.get('interact')
	return (
		<ForQuery query={interactionQuery}>
			{(entity) => {
				entity.interactionContainer.position.y = entity.size.y - entity.position.y
				return (
					<Portal mount={entity.interactionContainer.element}>
						<div style={{ 'background': 'hsl(0,0%,0%,0.3)', 'padding': '0.5rem 1rem', 'font-size': '1rem', 'color': 'white', 'border-radius': '1rem', 'display': 'flex', 'gap': '0.5rem' }}>
							<InputIcon input={input}></InputIcon>
							<div>{entity.interactable}</div>
						</div>
					</Portal>
				)
			}}
		</ForQuery>
	)
}