import type { With } from 'miniplex'
import { For, createSignal, onMount } from 'solid-js'
import { Portal, Show } from 'solid-js/web'
import { css } from 'solid-styled'
import { Transition } from 'solid-transition-group'
import { InputIcon } from './InputIcon'
import { OutlineText } from './components/styledComponents'
import { useGame, useQuery } from './store'
import { getSeed } from '@/constants/items'
import type { Entity } from '@/global/entity'
import { Interactable } from '@/global/entity'
import { ecs, ui } from '@/global/init'
import { save } from '@/global/save'
import { dungeonState } from '@/global/states'
import { WeaponStatsUi } from '@/states/dungeon/WeaponStatsUi'
import { getMagicBeanInteractable } from '@/states/farm/beanStalk'

export const getInteractables = (
	player: With<Entity, 'inventory'>,
	entity?: With<Entity, 'interactable'>,
): (string | undefined)[] => {
	const hasSeedInInventory = player.inventory?.filter(Boolean)?.some(item => getSeed(item.name))
	const hasSelectedSeed = player.inventory?.filter(Boolean).some((item) => {
		return getSeed(item.name) === save.selectedSeed && item.quantity > 0
	})
	if (entity) {
		switch (entity?.interactable) {
			case Interactable.Plant: return [
				hasSelectedSeed ? `plant ${save.selectedSeed}` : undefined,
				hasSeedInInventory ? 'select seed' : undefined,
			]
			case Interactable.Water:return (player.wateringCan?.waterAmount ?? 0) > 0 ? [Interactable.Water] : []
			case Interactable.Read:
			case Interactable.Talk: return [
				entity.activeDialog ? undefined : entity.interactable,
			]
			case Interactable.Cauldron:
			case Interactable.Oven:
			case Interactable.Chop: return ['Prepare', entity.recipesQueued?.length ? 'Cook' : undefined]
			case Interactable.WeaponStand: return ['Equip']
			case Interactable.Buy: return [`Buy (${entity.price})`]
			case Interactable.MagicBean:return getMagicBeanInteractable()
			default: return [entity?.interactable]
		}
	}
	if (dungeonState.enabled) {
		return ['Attack', 'Dash']
	}
	return []
}

const interactionQuery = ecs.with('interactable', 'interactionContainer', 'position').without('menuType')

export const InteractionUi = () => {
	const query = useQuery(interactionQuery)
	const context = useGame()
	css/* css */`
		.interaction{
			background: var(--black-transparent);
			padding: 0.25rem 0.5rem;
			color: white;
			border-radius: 1rem;
			display: grid;
			gap: 0.5rem;
			place-items: center;
		}
		.interaction-text{
			display: flex;
			gap: 0.5rem;
			font-size: 1.5rem;
		}
	`
	return (
		<Show when={context?.player()}>
			{(player) => {
				return (
					<For each={query()}>
						{(entity) => {
							if (entity.size) {
								entity.interactionContainer.position.y = entity.size.y - entity.position.y
							}
							const interactables = ui.sync(() => getInteractables(player(), entity))
							const [visible, setVisible] = createSignal(false)
							onMount(() => {
								setTimeout(() => setVisible(true), 10)
							})
							return (
								<Portal mount={entity.interactionContainer.element}>
									<Transition name="popup">
										<Show when={visible() && (!context?.usingTouch() || entity.weaponStand)}>
											<div class="interaction">
												<Show when={entity.weaponStand}>
													{weaponName => <WeaponStatsUi name={weaponName()} />}
												</Show>
												<Show when={!context?.usingTouch()}>
													<Show when={interactables()[1]}>
														<div class="interaction-text">
															<InputIcon input={player().playerControls.get('secondary')} />
															<OutlineText>{interactables()[1]}</OutlineText>
														</div>
													</Show>
													<Show when={interactables()[0]}>
														<div class="interaction-text">
															<InputIcon input={player().playerControls.get('primary')}></InputIcon>
															<OutlineText>{interactables()[0]}</OutlineText>
														</div>
													</Show>
												</Show>
											</div>
										</Show>
									</Transition>
								</Portal>
							)
						}}
					</For>
				)
			}}
		</Show>
	)
}