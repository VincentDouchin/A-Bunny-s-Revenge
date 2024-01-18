import { For, Portal, Show } from 'solid-js/web'
import { ItemDisplay } from './InventoryUi'
import type { Item } from '@/constants/items'
import { itemsData } from '@/constants/items'
import type { Entity } from '@/global/entity'
import { ecs, ui } from '@/global/init'
import { updateSave } from '@/global/save'
import { ForQuery } from '@/ui/components/ForQuery'
import { Menu } from '@/ui/components/Menu'
import type { FarmUiProps } from '@/ui/types'

const query = ecs.with('menuOpen', 'interactionContainer', 'plantableSpot')
const playerMenuInputs = ecs.with('player', 'menuInputs')
export const SeedUi = ({ player }: FarmUiProps) => {
	const seeds = ui.sync(() => player.inventory.filter(item => item && itemsData[item.name].seed).filter(Boolean))
	const inputs = ui.sync(() => playerMenuInputs.first?.menuInputs)
	const chooseSeed = (seed: Item, entity: Entity) => {
		const crop = itemsData[seed.name].seed
		if (crop) {
			updateSave(s => s.selectedSeed = crop)
			ecs.removeComponent(entity, 'menuOpen')
		}
	}
	return (
		<Show when={inputs()}>
			{inputs => (
				<Menu inputs={inputs()}>
					{({ getProps }) => {
						return (
							<ForQuery query={query}>
								{(entity) => {
									return (
										<Portal mount={entity.interactionContainer.element}>
											<div style={{ 'display': 'flex', 'background': 'hsl(0,0%,0%,0.3)', 'padding': '1rem', 'border-radius': '1rem', 'gap': '1rem' }}>
												<For each={seeds()}>
													{(seed, i) => {
														const props = getProps(i() === 0)
														return (
															<div {...props} onClick={() => chooseSeed(seed, entity)}>
																<ItemDisplay item={seed} selected={props.selected}></ItemDisplay>
															</div>
														)
													}}
												</For>
											</div>
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