import type { With } from 'miniplex'
import { Match, Portal, Show, Switch } from 'solid-js/web'
import { InputIcon } from './InputIcon'
import { ForQuery } from './components/ForQuery'
import type { Entity } from '@/global/entity'
import { Interactable } from '@/global/entity'
import { ecs, ui } from '@/global/init'
import type { PlayerInputMap } from '@/global/inputMaps'
import { save } from '@/global/save'
import { itemsData } from '@/constants/items'

const interactionQuery = ecs.with('interactable', 'interactionContainer', 'position').without('menuOpen')
const Interactables = ({ primary, secondary, inputs }: {
	primary?: string
	secondary?: string
	inputs: PlayerInputMap
}) => {
	return (
		<div style={{ 'background': 'hsl(0,0%,0%,0.3)', 'padding': '0.25rem 0.5rem', 'font-size': '1.5rem', 'color': 'white', 'border-radius': '1rem' }}>
			<Show when={secondary}>
				<div style={{ display: 'flex', gap: '0.5rem' }}>
					<InputIcon input={inputs.get('secondary')} />
					<div>{secondary}</div>
				</div>
			</Show>
			<Show when={primary}>
				<div style={{ display: 'flex', gap: '0.5rem' }}>
					<InputIcon input={inputs.get('primary')}></InputIcon>
					<div>{primary}</div>
				</div>
			</Show>
		</div>
	)
}
export const InteractionUi = ({ player }: {
	player: With<Entity, 'playerControls'>
}) => {
	return (
		<ForQuery query={interactionQuery}>
			{(entity) => {
				if (entity.size) {
					entity.interactionContainer.position.y = entity.size.y - entity.position.y
				}
				const canShowDialog = ui.sync(() => !entity.currentDialog)
				const hasSeedInInventory = player.inventory?.filter(Boolean)?.some(item => itemsData[item.name].seed)
				const hasSelectedSeed = player.inventory?.filter(Boolean).some((item) => {
					return itemsData[item.name].seed === save.selectedSeed && item.quantity > 0
				})
				return (
					<Portal mount={entity.interactionContainer.element}>
						<Switch fallback={<Interactables inputs={player.playerControls} primary={entity.interactable} />}>
							<Match when={entity.interactable === Interactable.Talk}>
								{canShowDialog() && (
									<Interactables
										inputs={player.playerControls}
										primary="talk"
									/>
								)}
							</Match>
							<Match when={entity.interactable === Interactable.Plant}>
								<Interactables
									inputs={player.playerControls}
									primary={hasSelectedSeed ? `plant ${save.selectedSeed}` : undefined}
									secondary={hasSeedInInventory ? 'select seed' : undefined}
								/>

							</Match>
						</Switch>
					</Portal>
				)
			}}
		</ForQuery>
	)
}
{ /* <Show when={canShowDialog()}>

							</Show>
							<Show when={entity.interactable === Interactable.Plant}>
								<Interactables inputs={player.playerControls} primary={`plant ${save.selectedSeed}`} secondary="select seed" />
							</Show> */ }