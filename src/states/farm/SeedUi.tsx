import { For, Portal, Show } from 'solid-js/web'
import { createSignal, onMount } from 'solid-js'
import { Transition } from 'solid-transition-group'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { ItemDisplay } from './InventoryUi'
import type { Item } from '@/constants/items'
import { itemsData } from '@/constants/items'
import type { Entity } from '@/global/entity'
import { ecs, ui } from '@/global/init'
import { updateSave } from '@/global/save'
import { ForQuery } from '@/ui/components/ForQuery'
import { Menu, menuItem } from '@/ui/components/Menu'
import type { FarmUiProps } from '@/ui/types'
// eslint-disable-next-line no-unused-expressions
menuItem
const query = ecs.with('menuType', 'interactionContainer', 'plantableSpot')
const playerMenuInputs = ecs.with('player', 'menuInputs')
export const SeedUi = ({ player }: FarmUiProps) => {
	const seeds = ui.sync(() => player.inventory.filter(item => item && itemsData[item.name].seed).filter(Boolean))
	const inputs = ui.sync(() => playerMenuInputs.first?.menuInputs)
	const chooseSeed = (seed: Item, entity: Entity) => {
		const crop = itemsData[seed.name].seed
		if (crop) {
			updateSave(s => s.selectedSeed = crop)
			ecs.removeComponent(entity, 'menuType')
		}
	}
	css/* css */`
	.seeds{
		display: flex;
		padding: 1rem 1rem 2rem 1rem;
		border-radius: 1rem;
		gap: 1rem;
	}
	`
	return (
		<Show when={inputs()}>
			{inputs => (
				<Menu inputs={inputs()}>
					{({ menu }) => {
						return (
							<ForQuery query={query}>
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
													<div class="seeds styled-container">
														<For each={seeds()}>
															{(seed, i) => {
																const selected = atom(false)
																return (
																	<div use:menuItem={[menu, i() === 0, selected]} onClick={() => chooseSeed(seed, entity)}>
																		<ItemDisplay item={seed} selected={selected}></ItemDisplay>
																	</div>
																)
															}}
														</For>
													</div>
												</Show>
											</Transition>
										</Portal>
									)
								}}
							</ForQuery>
						)
					}}
				</Menu>
			)}
		</Show>
	)
}