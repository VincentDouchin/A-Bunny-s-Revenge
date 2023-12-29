import type { With } from 'miniplex'
import { For } from 'solid-js'
import { Quaternion, Vector3 } from 'three'
import { InventorySlots, ItemDisplay } from './InventoryUi'
import type { Entity, InventoryTypes } from '@/global/entity'
import { type ItemData, choppables } from '@/constants/items'

import { assets, ecs, ui } from '@/global/init'
import { addItem, save, updateSave } from '@/global/save'
import { menuInputMap } from '@/lib/inputs'
import { ForQuery } from '@/ui/ForQuery'
import { Menu } from '@/ui/Menu'

export const inventoryBundle = (inventoryType: InventoryTypes, size: number) => {
	return {
		...menuInputMap(),
		inventoryType,
		inventorySize: size,
		inventory: Array.from({ length: size }, () => null),
		interactable: true,
	} as const satisfies Entity
}

function addToInventory<E extends With<Entity, 'inventory'>>(entity: E) {
	return (item: ItemData | null) => {
		if (entity.inventory.includes(null) && item) {
			if (item.quantity > 1) {
				item.quantity--
			} else {
				updateSave(s => s.items = save.items.filter(i => i !== item), false)
			}
			const firstEmptyIndex = entity.inventory.indexOf(null)
			entity.inventory.splice(firstEmptyIndex, 1, { ...item, quantity: 1 })
		}
	}
}

function removeFromInventory<E extends With<Entity, 'inventory'>>(entity: E) {
	return (item: ItemData | null, index: number) => {
		item && addItem(item, false)
		entity.inventory.splice(index, 1, null)
	}
}

const inventoryQuery = ecs.with('inventory', 'openInventory', 'menuInputs', 'inventorySize')
export const InventoryTitle = (props: { children: string }) => <div style={{ 'font-size': '3rem', 'color': 'white', 'font-family': 'NanoPlus' }}>{props.children}</div>
// export const CauldronUi = () => {
// 	return (
// 		<ForQuery query={inventoryQuery}>
// 			{(cauldron) => {
// 				const cauldronInventory = ui.sync(() => cauldron.inventory)
// 				const addToCauldron = addToInventory(cauldron)
// 				const removeFromCauldron = removeFromInventory(cauldron)
// 				const output = createMemo(() => {
// 					return recipes.find(({ input }) => {
// 						return cauldronInventory().every((slot, i) => slot?.icon === input[i])
// 					})?.output ?? null
// 				})
// 				const cook = () => {
// 					const meal = output()
// 					if (meal) {
// 						addItem({ ...meal })
// 						cauldron.inventory = Array.from({ length: cauldron.inventorySize }, () => null)
// 					}
// 				}
// 				return (
// 					<div style={{ 'background': 'hsla(0 0% 0% / 20%)', 'place-self': 'center', 'padding': '2rem', 'border-radius': '1rem', 'display': 'grid', 'gap': '2rem' }}>
// 						<div>
// 							<Menu inputs={cauldron.menuInputs}>
// 								{({ getProps }) => {
// 									const outputProps = getProps()
// 									return (
// 										<div style={{ display: 'grid', gap: '2rem' }}>
// 											<div>
// 												<InventoryTitle>Cauldron</InventoryTitle>
// 												<div style={{ display: 'flex', gap: '1rem' }}>
// 													<For each={cauldronInventory()}>
// 														{(cauldronSlot, i) => {
// 															const props = getProps()
// 															const item = ui.sync(() => cauldronSlot)
// 															return (
// 																<div {...props} onClick={removeFromCauldron(cauldronSlot, i())}>
// 																	<ItemDisplay
// 																		item={item()}
// 																		selected={props.selected()}
// 																	/>
// 																</div>
// 															)
// 														}}
// 													</For>
// 													<Show when={output()}>
// 														<div {...outputProps} onClick={cook}>
// 															<ItemDisplay item={output()} selected={outputProps.selected()}></ItemDisplay>
// 														</div>
// 													</Show>
// 													I

// 												</div>
// 											</div>
// 											<div style={{ 'display': 'grid', 'grid-template-columns': 'repeat(8, 1fr)', 'gap': '1rem' }}>
// 												<InventorySlots getProps={getProps} click={addToCauldron}></InventorySlots>
// 											</div>
// 										</div>
// 									) }}
// 							</Menu>
// 						</div>

// 					</div>
// 				)
// 			}}
// 		</ForQuery>
// 	)
// }
const cuttingBoardQuery = ecs.with('inventory', 'inventoryType', 'size').where(e => e.inventoryType === 'cuttingBoard')
export const displayOnCuttinBoard = () => {
	for (const cuttingBoard of cuttingBoardQuery) {
		const item = cuttingBoard.inventory[0]?.icon

		if (item && !cuttingBoard.displayedItem) {
			if (choppables.includes(item)) {
				const crop = item as (typeof choppables)[number]
				const model = assets.crops[crop].crop.scene.clone()
				model.scale.setScalar(10)
				const displayedItem = ecs.add({
					parent: cuttingBoard,
					model,
					position: new Vector3(-2, cuttingBoard.size.y + 1, 0),
					rotation: new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 2),
				})
				ecs.update(cuttingBoard, { displayedItem })
			}
		}
		if (!item && cuttingBoard.displayedItem) {
			ecs.remove(cuttingBoard.displayedItem)
			ecs.removeComponent(cuttingBoard, 'displayedItem')
		}
	}
}
export const CuttingBoardUi = () => {
	return (
		<ForQuery query={inventoryQuery.with('inventoryType').where(({ inventoryType }) => inventoryType === 'cuttingBoard')}>
			{(cuttingBoard) => {
				const cuttingBoardInventory = ui.sync(() => cuttingBoard.inventory)
				const addToCuttingBoard = addToInventory(cuttingBoard)
				const removeFromCuttingBoard = removeFromInventory(cuttingBoard)
				return (
					<div style={{ 'background': 'hsla(0 0% 0% / 20%)', 'place-self': 'center', 'padding': '2rem', 'border-radius': '1rem', 'display': 'grid', 'gap': '2rem' }}>
						<div>
							<Menu inputs={cuttingBoard.menuInputs}>
								{({ getProps }) => {
									return (
										<div style={{ display: 'grid', gap: '2rem' }}>
											<div>
												<InventoryTitle>Cutting board</InventoryTitle>
												<div style={{ 'display': 'grid', 'gap': '1rem', 'place-items': 'center' }}>
													<For each={cuttingBoardInventory()}>
														{(slot, i) => {
															const props = getProps()
															const item = ui.sync(() => slot)
															return (
																<div {...props} onClick={() => removeFromCuttingBoard(slot, i())}>
																	<ItemDisplay
																		item={item()}
																		selected={props.selected()}
																	/>
																</div>
															)
														}}
													</For>
												</div>
											</div>
											<div style={{ 'display': 'grid', 'grid-template-columns': 'repeat(8, 1fr)', 'gap': '1rem' }}>
												<InventorySlots
													getProps={getProps}
													click={addToCuttingBoard}
													disabled={item => item?.icon && !choppables.includes(item.icon)}
												/>
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
export const OvenUi = () => {
	return (
		<ForQuery query={inventoryQuery.with('inventoryType').where(({ inventoryType }) => inventoryType === 'oven')}>
			{(oven) => {
				const ovenInventory = ui.sync(() => oven.inventory)
				const addToOven = addToInventory(oven)
				const removeFromOven = removeFromInventory(oven)
				return (
					<div style={{ 'background': 'hsla(0 0% 0% / 20%)', 'place-self': 'center', 'padding': '2rem', 'border-radius': '1rem', 'display': 'grid', 'gap': '2rem' }}>
						<div>
							<Menu inputs={oven.menuInputs}>
								{({ getProps }) => {
									return (
										<div style={{ display: 'grid', gap: '2rem' }}>
											<div>
												<InventoryTitle>Oven</InventoryTitle>
												<div style={{ 'display': 'flex', 'gap': '1rem', 'place-items': 'center' }}>
													<For each={ovenInventory()}>
														{(cauldronSlot, i) => {
															const props = getProps()
															const item = ui.sync(() => cauldronSlot)
															return (
																<div {...props} onClick={() => removeFromOven(cauldronSlot, i())}>
																	<ItemDisplay
																		item={item()}
																		selected={props.selected()}
																	/>
																</div>
															)
														}}
													</For>
												</div>
											</div>
											<div style={{ 'display': 'grid', 'grid-template-columns': 'repeat(8, 1fr)', 'gap': '1rem' }}>
												<InventorySlots getProps={getProps} click={addToOven}></InventorySlots>
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