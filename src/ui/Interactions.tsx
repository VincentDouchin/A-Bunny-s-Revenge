import type { With } from 'miniplex'
import { children, createMemo, createSignal, onMount } from 'solid-js'
import { Portal, Show } from 'solid-js/web'
import { Transition } from 'solid-transition-group'
import { InputIcon } from './InputIcon'
import { ForQuery } from './components/ForQuery'
import { itemsData } from '@/constants/items'
import type { Entity } from '@/global/entity'
import { Interactable } from '@/global/entity'
import { ecs } from '@/global/init'
import { save } from '@/global/save'

export const getInteractables = (player: With<Entity, 'inventory'>, entity?: With<Entity, 'interactable'>): (string | undefined)[] => {
	const hasSeedInInventory = player.inventory?.filter(Boolean)?.some(item => itemsData[item.name].seed)
	const hasSelectedSeed = player.inventory?.filter(Boolean).some((item) => {
		return itemsData[item.name].seed === save.selectedSeed && item.quantity > 0
	})
	switch (entity?.interactable) {
		case Interactable.Plant:return [
			hasSelectedSeed ? `plant ${save.selectedSeed}` : undefined,
			hasSeedInInventory ? 'select seed' : undefined,
		]
		case Interactable.Talk:return [
			entity.currentDialog ? undefined : 'talk',
		]
		case Interactable.Cauldron: return ['Prepare', 'Cook']
		case Interactable.Oven: return ['Prepare', 'Cook']
		default: return [entity?.interactable]
	}
}

const interactionQuery = ecs.with('interactable', 'interactionContainer', 'position').without('currentDialog', 'menuType')

export const InteractionUi = ({ player }: {
	player: With<Entity, 'playerControls' | 'inventory'>
}) => {
	return (
		<ForQuery query={interactionQuery}>
			{(entity) => {
				if (entity.size) {
					entity.interactionContainer.position.y = entity.size.y - entity.position.y
				}
				const interactables = createMemo(() => getInteractables(player, entity))
				const [visible, setVisible] = createSignal(false)
				onMount(() => {
					setTimeout(() => setVisible(true), 10)
				})
				const content = children(() => (
					<Transition name="popup">
						<Show when={visible()}>
							<div style={{ 'background': 'hsl(0,0%,0%,0.3)', 'padding': '0.25rem 0.5rem', 'font-size': '1.5rem', 'color': 'white', 'border-radius': '1rem' }}>
								<Show when={interactables()[1]}>
									<div style={{ display: 'flex', gap: '0.5rem' }}>
										<InputIcon input={player.playerControls.get('secondary')} />
										<div>{interactables()[1]}</div>
									</div>
								</Show>
								<Show when={interactables()[0]}>
									<div style={{ display: 'flex', gap: '0.5rem' }}>
										<InputIcon input={player.playerControls.get('primary')}></InputIcon>
										<div>{interactables()[0]}</div>
									</div>
								</Show>
							</div>
						</Show>
					</Transition>
				))
				return (
					<Show when={content.toArray().length && entity.interactionContainer?.element}>
						<Portal mount={entity.interactionContainer.element}>
							{content()}
						</Portal>
					</Show>
				)
			}}
		</ForQuery>
	)
}