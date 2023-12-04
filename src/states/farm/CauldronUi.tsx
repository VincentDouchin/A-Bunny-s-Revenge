import { For, Show, createMemo } from 'solid-js'
import { ItemDisplay } from './InventoryUi'
import type { ItemData } from '@/constants/items'
import { ecs, ui } from '@/global/init'
import { addItem, save, updateSave } from '@/global/save'
import { ForQuery } from '@/ui/ForQuery'
import { Menu } from '@/ui/Menu'
import { range } from '@/utils/mapFunctions'
import { recipes } from '@/constants/recipes'

const cauldronQuery = ecs.with('cauldron', 'openInventory', 'menuInputs')
export const CauldronUi = () => {
	return (
		<ForQuery query={cauldronQuery}>
			{(cauldron) => {
				const cauldronInventory = ui.sync(() => cauldron.cauldron)
				const items = ui.sync(() => [...save.items, ...range(save.items.length, 24, () => null)])
				const addToCauldron = (item: ItemData | null) => () => {
					if (cauldron.cauldron.includes(null) && item) {
						if (item.quantity > 1) {
							item.quantity--
						} else {
							updateSave(s => s.items = save.items.filter(i => i !== item), false)
						}
						const firstEmptyIndex = cauldron.cauldron.indexOf(null)
						cauldron.cauldron.splice(firstEmptyIndex, 1, { ...item, quantity: 1 })
					}
				}
				const removeFromCauldron = (item: ItemData | null, index: number) => () => {
					item && addItem(item, false)
					cauldron.cauldron[index] = null
				}
				const output = createMemo(() => {
					return recipes.find(({ input }) => {
						return cauldronInventory().every((slot, i) => slot?.icon === input[i])
					})?.output ?? null
				})
				const cook = () => {
					const meal = output()
					if (meal) {
						addItem({ ...meal })
						cauldron.cauldron = [null, null, null, null]
					}
				}
				return (
					<div style={{ 'background': 'hsla(0 0% 0% / 20%)', 'place-self': 'center', 'padding': '2rem', 'border-radius': '1rem', 'display': 'grid', 'gap': '2rem' }}>

						<div>
							<Menu inputs={cauldron.menuInputs}>
								{({ getProps }) => {
									const outputProps = getProps()
									return (
										<div style={{ display: 'grid', gap: '2rem' }}>
											<div>
												<div style={{ 'font-size': '2rem', 'color': 'white' }}>Cauldron</div>
												<div style={{ display: 'flex', gap: '1rem' }}>
													<For each={cauldronInventory()}>
														{(cauldronSlot, i) => {
															const props = getProps()
															const item = ui.sync(() => cauldronSlot)
															return (
																<div {...props} onClick={removeFromCauldron(cauldronSlot, i())}>
																	<ItemDisplay
																		item={item()}
																		selected={props.selected()}
																	/>
																</div>
															)
														}}
													</For>
													<Show when={output()}>
														<div {...outputProps} onClick={cook}>
															<ItemDisplay item={output()} selected={outputProps.selected()}></ItemDisplay>
														</div>
													</Show>
												</div>
											</div>
											<div style={{ 'display': 'grid', 'grid-template-columns': 'repeat(8, 1fr)', 'gap': '1rem' }}>
												<For each={items()}>
													{(item, i) => {
														const props = getProps(i() === 0)
														const itemSynced = ui.sync(() => item)
														return (
															<div {...props} onClick={addToCauldron(item)}>
																<ItemDisplay
																	item={itemSynced()}
																	selected={props.selected()}

																/>
															</div>
														)
													}}

												</For>
											</div>
										</div>
									) }}
							</Menu>
						</div>

					</div>
				)
			}}
		</ForQuery>
	)
}