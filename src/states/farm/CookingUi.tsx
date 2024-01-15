import { Show, createMemo } from 'solid-js'
import { Quaternion, Vector3 } from 'three'
import { InventorySlots, ItemDisplay } from './InventoryUi'
import { InventoryTypes, type crops } from '@/global/entity'
import { type Item, itemsData } from '@/constants/items'

import { recipes } from '@/constants/recipes'
import { assets, ecs, ui } from '@/global/init'
import { addItem, removeItem } from '@/global/save'
import { Menu } from '@/ui/components/Menu'
import { Modal } from '@/ui/components/Modal'
import type { FarmUiProps } from '@/ui/types'
import { addItemToPlayer } from '@/utils/dialogHelpers'

const inventoryQuery = ecs.with('inventory', 'openInventory', 'menuInputs', 'inventorySize', 'inventoryId')
export const InventoryTitle = (props: { children: string }) => <div style={{ 'font-size': '3rem', 'color': 'white', 'font-family': 'NanoPlus', 'text-transform': 'capitalize' }}>{props.children}</div>

const cuttingBoardQuery = inventoryQuery.with('size').where(e => e.inventoryType === InventoryTypes.CuttingBoard)
export const displayOnCuttinBoard = () => {
	for (const cuttingBoard of cuttingBoardQuery) {
		const item = cuttingBoard.inventory[0]?.name

		if (item && !cuttingBoard.displayedItem) {
			if (itemsData[item].choppable) {
				const crop = item as crops
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
const openCuttingBoardQuery = cuttingBoardQuery.with('openInventory')
export const CuttingBoardUi = ({ player }: FarmUiProps) => {
	const cuttingBoardEntity = ui.sync(() => openCuttingBoardQuery.first)

	return (
		<Modal open={cuttingBoardEntity()}>
			<Show when={cuttingBoardEntity()}>
				{(cuttingBoard) => {
					const addToCuttingBoard = (item: Item | null) => {
						const filled = cuttingBoard().inventory.filter(Boolean).length
						if (item && filled < cuttingBoard().inventorySize)
							addItem(cuttingBoard(), { name: item.name, quantity: 1 }, filled)
					}
					const removeFromCuttingBoard = (item: Item | null, index: number) => item && removeItem(cuttingBoard(), item, index)
					return (
						<Menu inputs={cuttingBoard().menuInputs}>
							{({ getProps }) => {
								return (
									<div style={{ display: 'grid', gap: '2rem' }}>
										<div>
											<InventoryTitle>Cutting board</InventoryTitle>
											<div style={{ 'display': 'grid', 'gap': '1rem', 'place-items': 'center' }}>
												<InventorySlots
													click={removeFromCuttingBoard}
													getProps={getProps}
													entity={cuttingBoard()}
												/>
											</div>
										</div>
										<div style={{ 'display': 'grid', 'grid-template-columns': 'repeat(8, 1fr)', 'gap': '1rem' }}>
											<InventorySlots
												getProps={getProps}
												click={addToCuttingBoard}
												disabled={item => item?.name && !itemsData[item.name].choppable}
												entity={player}
											/>
										</div>
									</div>
								)
							}}
						</Menu>
					)
				}}
			</Show>
		</Modal>
	)
}
const ovenQuery = inventoryQuery.with('inventoryType').where(({ inventoryType }) => inventoryType === InventoryTypes.Oven)
export const OvenUi = ({ player }: FarmUiProps) => {
	const oven = ui.sync(() => ovenQuery.first)
	const output = createMemo(() => {
		return recipes.find(({ input }) => {
			return input.every((item, i) => oven()?.inventory[i]?.name === item)
		})?.output
	})
	const cook = (output: Item) => {
		const o = oven()
		if (o) {
			addItemToPlayer({ ...output })
			for (let i = 0; i < o.inventorySize; i++) {
				delete o.inventory[i]
			}
		}
	}
	return (
		<Modal open={oven()}>
			<Show when={oven()}>
				{(ovenEntity) => {
					const addToOven = (item: Item | null) => {
						const filled = ovenEntity().inventory.filter(Boolean).length
						if (item && filled < ovenEntity().inventorySize) {
							addItem(ovenEntity(), { name: item.name, quantity: 1 }, filled)
							removeItem(player, { name: item.name, quantity: 1 })
						}
					}
					const removeFromOven = (item: Item | null, index: number) => {
						if (item) {
							addItem(player, item)
							removeItem(ovenEntity(), item, index) }
					}
					return (
						<Menu inputs={ovenEntity().menuInputs}>
							{({ getProps }) => {
								const outputProps = getProps()
								return (
									<div style={{ display: 'grid', gap: '2rem' }}>
										<div>
											<InventoryTitle>Oven</InventoryTitle>
											<div style={{ 'display': 'flex', 'gap': '1rem', 'place-items': 'center' }}>
												<InventorySlots
													click={removeFromOven}
													getProps={getProps}
													entity={ovenEntity()}
												/>
												<Show when={output()}>
													{(output) => {
														return (
															<div {...outputProps} onClick={() => cook(output())}>
																<ItemDisplay item={output()} selected={outputProps.selected()} />
															</div>
														)
													}}
												</Show>
											</div>
										</div>
										<div style={{ 'display': 'grid', 'grid-template-columns': 'repeat(8, 1fr)', 'gap': '1rem' }}>
											<InventorySlots
												getProps={getProps}
												click={addToOven}
												disabled={item => item?.name && !itemsData[item.name].cookable}
												entity={player}
											/>
										</div>
									</div>
								)
							}}
						</Menu>
					)
				}}
			</Show>

		</Modal>
	)
}