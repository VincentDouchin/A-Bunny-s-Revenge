import type { With } from 'miniplex'
import type { Accessor } from 'solid-js'
import { createSignal, onMount } from 'solid-js'
import { Portal, Show } from 'solid-js/web'
import { Transition } from 'solid-transition-group'
import { InputIcon } from './InputIcon'
import { ForQuery } from './components/ForQuery'
import { itemsData } from '@/constants/items'
import type { Entity } from '@/global/entity'
import { Interactable } from '@/global/entity'
import { ecs, ui } from '@/global/init'
import { save } from '@/global/save'
import { dungeonState } from '@/global/states'
import { WeaponStatsUi } from '@/states/dungeon/WeaponStatsUi'

export const getInteractables = (
	player: With<Entity, 'inventory'>,
	entity?: With<Entity, 'interactable'>,
): (string | undefined)[] => {
	const hasSeedInInventory = player.inventory?.filter(Boolean)?.some(item => itemsData[item.name].seed)
	const hasSelectedSeed = player.inventory?.filter(Boolean).some((item) => {
		return itemsData[item.name].seed === save.selectedSeed && item.quantity > 0
	})

	if (entity) {
		switch (entity?.interactable) {
			case Interactable.Plant: return [
				hasSelectedSeed ? `plant ${save.selectedSeed}` : undefined,
				hasSeedInInventory ? 'select seed' : undefined,
			]
			case Interactable.Water:return (player.wateringCan?.waterAmount ?? 0) > 0 ? [Interactable.Water] : []
			case Interactable.Talk: return [
				entity.dialogContainer ? undefined : 'talk',
			]
			case Interactable.Cauldron: return ['Prepare', 'Cook']
			case Interactable.Oven: return ['Prepare', 'Cook']
			case Interactable.Chop: return ['Prepare', 'Cook']
			case Interactable.WeaponStand: return ['Equip']
			case Interactable.Buy: return [`Buy (${entity.price})`]
			default: return [entity?.interactable]
		}
	}
	if (dungeonState.enabled) {
		return ['Attack', 'Dash']
	}
	return []
}

const interactionQuery = ecs.with('interactable', 'interactionContainer', 'position').without('menuType')

export const InteractionUi = ({ player, isTouch }: {
	player: With<Entity, 'playerControls' | 'inventory'>
	isTouch: Accessor<boolean>
}) => {
	ui.updateSync(() => interactionQuery.size)
	return (
		<ForQuery query={interactionQuery}>
			{(entity) => {
				if (entity.size) {
					entity.interactionContainer.position.y = entity.size.y - entity.position.y
				}
				const interactables = ui.sync(() => getInteractables(player, entity))
				const [visible, setVisible] = createSignal(false)
				onMount(() => {
					setTimeout(() => setVisible(true), 10)
				})
				return (
					<Portal mount={entity.interactionContainer.element}>
						<Transition name="popup">
							<Show when={visible() && (!isTouch() || entity.weaponStand)}>
								<div style={{ 'background': 'hsl(0,0%,0%,0.3)', 'padding': '0.25rem 0.5rem', 'color': 'white', 'border-radius': '1rem', 'display': 'grid', 'gap': '0.5rem', 'place-items': 'center' }}>
									<Show when={entity.weaponStand}>
										{weaponName => <WeaponStatsUi name={weaponName()} />}
									</Show>
									<Show when={!isTouch()}>
										<Show when={interactables()[1]}>
											<div style={{ 'display': 'flex', 'gap': '0.5rem', 'font-size': '1.5rem' }}>
												<InputIcon input={player.playerControls.get('secondary')} />
												<div>{interactables()[1]}</div>
											</div>
										</Show>
										<Show when={interactables()[0]}>
											<div style={{ 'display': 'flex', 'gap': '0.5rem', 'font-size': '1.5rem' }}>
												<InputIcon input={player.playerControls.get('primary')}></InputIcon>
												<div>{interactables()[0]}</div>
											</div>
										</Show>
									</Show>
								</div>
							</Show>
						</Transition>
					</Portal>
				)
			}}
		</ForQuery>
	)
}