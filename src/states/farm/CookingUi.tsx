// import { Show, createMemo } from 'solid-js'
// import { InventorySlots, ItemDisplay } from './InventoryUi'
// import { type Item, itemsData } from '@/constants/items'
// import { MenuType } from '@/global/entity'

// import { recipes } from '@/constants/recipes'
// import { ecs, ui } from '@/global/init'
// import { addItem, removeItem } from '@/global/save'
// import { Menu } from '@/ui/components/Menu'
// import { Modal } from '@/ui/components/Modal'
// import type { FarmUiProps } from '@/ui/types'
// import { addItemToPlayer } from '@/utils/dialogHelpers'

// const inventoryQuery = ecs.with('inventory', 'menuType', 'menuInputs', 'inventorySize', 'inventoryId')
export const InventoryTitle = (props: { children: string }) => <div style={{ 'font-size': '3rem', 'color': 'white', 'font-family': 'NanoPlus', 'text-transform': 'capitalize' }}>{props.children}</div>

// const ovenQuery = inventoryQuery.with('menuOpen').where(e => e.menuType === MenuType.Oven)
// export const OvenUi = ({ player }: FarmUiProps) => {
// 	const oven = ui.sync(() => ovenQuery.first)
// 	const output = createMemo(() => {
// 		return recipes.find(({ input }) => {
// 			return input.every((item, i) => oven()?.inventory[i]?.name === item)
// 		})?.output
// 	})
// 	const cook = (output: Item) => {
// 		const o = oven()
// 		if (o) {
// 			addItemToPlayer({ ...output })
// 			for (let i = 0; i < o.inventorySize; i++) {
// 				delete o.inventory[i]
// 			}
// 		}
// 	}
// 	return (
// 		<Modal open={oven()}>
// 			<Show when={oven()}>
// 				{(ovenEntity) => {
// 					const addToOven = (item: Item | null) => {
// 						const filled = ovenEntity().inventory.filter(Boolean).length
// 						if (item && filled < ovenEntity().inventorySize) {
// 							addItem(ovenEntity(), { name: item.name, quantity: 1 }, filled)
// 							removeItem(player, { name: item.name, quantity: 1 })
// 						}
// 					}
// 					const removeFromOven = (item: Item | null, index: number) => {
// 						if (item) {
// 							addItem(player, item)
// 							removeItem(ovenEntity(), item, index) }
// 					}
// 					return (
// 						<Menu inputs={ovenEntity().menuInputs}>
// 							{({ getProps }) => {
// 								const outputProps = getProps()
// 								return (
// 									<div style={{ display: 'grid', gap: '2rem' }}>
// 										<div>
// 											<InventoryTitle>Oven</InventoryTitle>
// 											<div style={{ 'display': 'flex', 'gap': '1rem', 'place-items': 'center' }}>
// 												<InventorySlots
// 													click={removeFromOven}
// 													getProps={getProps}
// 													entity={ovenEntity()}
// 												/>
// 												<Show when={output()}>
// 													{(output) => {
// 														return (
// 															<div {...outputProps} onClick={() => cook(output())}>
// 																<ItemDisplay item={output()} selected={outputProps.selected} />
// 															</div>
// 														)
// 													}}
// 												</Show>
// 											</div>
// 										</div>
// 										<div style={{ 'display': 'grid', 'grid-template-columns': 'repeat(8, 1fr)', 'gap': '1rem' }}>
// 											<InventorySlots
// 												getProps={getProps}
// 												click={addToOven}
// 												disabled={item => item?.name && !itemsData[item.name].cookable}
// 												entity={player}
// 											/>
// 										</div>
// 									</div>
// 								)
// 							}}
// 						</Menu>
// 					)
// 				}}
// 			</Show>

// 		</Modal>
// 	)
// }