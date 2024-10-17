import type { Entity } from '@/global/entity'
import type { With } from 'miniplex'
import type { JSX } from 'solid-js'
import { getSeed } from '@/constants/items'
import { Interactable } from '@/global/entity'
import { ecs, save, ui } from '@/global/init'
import { dungeonState } from '@/global/states'
import { WeaponStatsUi } from '@/states/dungeon/WeaponStatsUi'
import Carrot from '@assets/icons/carrot-solid.svg'
import Clipboard from '@assets/icons/clipboard-check-solid.svg'
import Talk from '@assets/icons/comment-dots-solid.svg'
import Water from '@assets/icons/droplet-solid.svg'
import HandOpen from '@assets/icons/hand_open.svg'
import Seed from '@assets/icons/seedling-solid.svg'
import Spoon from '@assets/icons/spoon-solid.svg'
import Sword from '@assets/icons/sword.svg'
import WateringCan from '@assets/icons/tool_watering_can.svg'
import Utensils from '@assets/icons/utensils-solid.svg'
import Wind from '@assets/icons/wind-solid.svg'
import { createSignal, For, onMount } from 'solid-js'
import { Portal, Show } from 'solid-js/web'
import { css } from 'solid-styled'
import { Transition } from 'solid-transition-group'
import { OutlineText } from './components/styledComponents'
import { InputIcon } from './InputIcon'
import { useGame, useQuery } from './store'

export const getInteractables = (
	player: With<Entity, 'inventory'>,
	entity?: With<Entity, 'interactable'>,
): ({ text: string, icon?: JSX.Element } | undefined)[] => {
	const hasSeedInInventory = player.inventory?.filter(Boolean)?.some(item => getSeed(item.name))
	const hasSelectedSeed = player.inventory?.filter(Boolean).some((item) => {
		return getSeed(item.name) === save.selectedSeed && item.quantity > 0
	})
	if (entity) {
		switch (entity?.interactable) {
			case Interactable.Plant: return [
				hasSelectedSeed ? { text: `plant ${save.selectedSeed}`, icon: Carrot } : undefined,
				hasSeedInInventory ? { text: 'select seed', icon: Seed } : undefined,
			]
			case Interactable.Water: return (player.wateringCan?.waterAmount ?? 0) > 0 ? [{ text: Interactable.Water, icon: WateringCan }] : []
			case Interactable.FillWateringCan: return [{ text: Interactable.FillWateringCan, icon: Water }]
			case Interactable.Read:
			case Interactable.Talk: return [
				entity.dialogContainer ? undefined : { text: entity.interactable, icon: Talk },
			]
			case Interactable.Cauldron:
			case Interactable.Oven:
			case Interactable.Chop: return [
				{ text: 'Prepare', icon: Utensils },
				entity.recipesQueued?.length ? { text: 'Cook', icon: Spoon } : undefined,
			]
			case Interactable.WeaponStand: return [{ text: 'Equip', icon: HandOpen }]
			case Interactable.Buy: return [{ text: `Buy (${entity.price})` }]
			case Interactable.MagicBean: return [{ text: 'Plant magic bean' }, undefined]
			case Interactable.BulletinBoard :return [{ text: Interactable.BulletinBoard, icon: Clipboard }]
			default: return [{ text: entity?.interactable }]
		}
	}
	if (dungeonState.enabled) {
		return [
			{ text: 'Attack', icon: Sword },
			{ text: 'Dash', icon: Wind },
		]
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
															<OutlineText>{interactables()[1]?.text}</OutlineText>
														</div>
													</Show>
													<Show when={interactables()[0]}>
														<div class="interaction-text">
															<InputIcon input={player().playerControls.get('primary')}></InputIcon>
															<OutlineText>{interactables()[0]?.text}</OutlineText>
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