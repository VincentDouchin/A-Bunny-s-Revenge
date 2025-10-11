import type { Item } from '@/constants/items'
import type { Entity } from '@/global/entity'
import { createSignal, onMount } from 'solid-js'
import { For, Portal, Show } from 'solid-js/web'
import { css } from 'solid-styled'
import { Transition } from 'solid-transition-group'
import atom from 'solid-use/atom'
import { getSeed } from '@/constants/items'
import { ecs, save, ui } from '@/global/init'
import { Menu, menuItem } from '@/ui/components/Menu'
import { GoldContainer, OutlineText } from '@/ui/components/styledComponents'
import { InputIcon } from '@/ui/InputIcon'
import { useGame, useQuery } from '@/ui/store'
import { ItemDisplay } from './InventoryUi'

menuItem
const seedQuery = useQuery(ecs.with('menuType', 'interactionContainer', 'plantableSpot'))
const playerMenuInputs = ecs.with('player', 'menuInputs')
export const SeedUi = () => {
	const context = useGame()

	css/* css */`
	.seeds{
		display: flex;
		padding: 1rem 1rem 2rem 1rem;
		border-radius: 1rem;
		gap: 1rem;
		position: relative;
	}

	.input-icon{
		position:absolute;
		right:-0.5rem;
		top:100%;
		margin-top: 1rem;
		display: flex;
		align-items: center;
		color: white;
		font-size: 1.5rem;
	}
	`
	return (
		<Show when={context?.player()}>
			{(player) => {
				const seeds = ui.sync(() => player().inventory.filter(item => item && getSeed(item.name)).filter(Boolean))
				const inputs = ui.sync(() => playerMenuInputs.first?.menuInputs)
				const chooseSeed = (seed: Item, entity: Entity) => {
					const crop = getSeed(seed.name)
					if (crop) {
						save.selectedSeed = crop
						ecs.removeComponent(entity, 'menuType')
					}
				}
				return (
					<Show when={inputs()}>
						{inputs => (
							<Menu inputs={inputs()}>
								{({ menu }) => {
									return (
										<For each={seedQuery()}>
											{(entity) => {
												const [visible, setVisible] = createSignal(false)
												onMount(() => setTimeout(() => setVisible(true), 100))
												ui.updateSync(() => {
													if (inputs().get('cancel').justReleased) {
														ecs.removeComponent(entity, 'menuType')
													}
												})
												return (
													<Portal mount={entity.interactionContainer.element}>
														<Transition name="popup">
															<Show when={visible()}>
																<GoldContainer padding="0.5rem 1rem">
																	<div class="seeds">
																		<Show when={!context?.usingTouch()}>
																			<div class="input-icon">
																				<InputIcon input={player().playerControls.get('primary')} />
																				<OutlineText>Select</OutlineText>
																			</div>
																		</Show>
																		<For each={seeds()}>
																			{(seed, i) => {
																				const selected = atom(false)
																				return (
																					<div use:menuItem={[menu, i() === 0, selected]} onClick={() => chooseSeed(seed, entity)} class="seed">
																						<ItemDisplay item={seed} selected={selected}></ItemDisplay>
																					</div>
																				)
																			}}
																		</For>
																	</div>
																</GoldContainer>
															</Show>
														</Transition>
													</Portal>
												)
											}}
										</For>
									)
								}}
							</Menu>
						)}
					</Show>
				) }}
		</Show>
	)
}