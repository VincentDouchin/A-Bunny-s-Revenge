import type { With } from 'miniplex'
import { Show } from 'solid-js'
import { css } from 'solid-styled'
import { InventorySlots, InventoryTitle } from '../farm/InventoryUi'
import type { Item } from '@/constants/items'
import { itemsData } from '@/constants/items'
import type { Entity } from '@/global/entity'
import { MenuType } from '@/global/entity'
import { ecs, ui } from '@/global/init'
import { addItem, removeItem } from '@/global/save'
import { campState } from '@/global/states'
import { Menu } from '@/ui/components/Menu'
import { Modal } from '@/ui/components/Modal'
import { StateUi } from '@/ui/components/StateUi'

const playerToHeal = ecs.with('player', 'currentHealth', 'maxHealth')

const basketQuery = ecs.with('menuType', 'inventory', 'inventoryId', 'inventorySize', 'basket').where(e => e.menuType === MenuType.Basket)
export const BasketUi = ({ player }: { player: With<Entity, 'menuInputs' | 'inventory'> }) => {
	const entity = ui.sync(() => basketQuery.first)
	css/* css */`
	.basket-ui-container{
		display: grid;
		gap: 2rem;
		place-items: center;
	}
	.basket-inventory{
		display: flex;
		gap: 1rem;
	}
	.meals-inventory{
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(8, 1fr)
	}
	`
	return (
		<Modal open={entity()}>
			<Show when={entity()}>
				{(basket) => {
					const playerMeals = ui.sync(() => player.inventory.filter(Boolean).filter(item => itemsData[item.name].meal !== undefined))

					const basketInventory = ui.sync(() => basket().inventory)
					ui.updateSync(() => {
						if (player.menuInputs.get('cancel').justReleased) {
							ecs.removeComponent(basket(), 'menuType')
						}
					})
					const sendMealToBasket = (item: Item | null) => {
						if (item) {
							if (addItem(basket(), { name: item.name, quantity: 1 }, false)) {
								removeItem(basket().basket, { name: item.name, quantity: 1 })
							}
						}
					}
					const removeMealFromBasket = (item: Item | null, index: number) => {
						if (item) {
							if (campState.enabled) {
								addItem(basket().basket, { name: item.name, quantity: 1 })
								removeItem(basket(), { name: item.name, quantity: 1 }, index)
							} else {
								removeItem(basket(), item)
								for (const playerHeal of playerToHeal) {
									playerHeal.currentHealth = playerHeal.maxHealth.value
								}
							}
						}
					}
					return (
						<>
							<InventoryTitle>Basket</InventoryTitle>
							<Menu inputs={player.menuInputs}>
								{({ menu }) => {
									return (
										<div class="basket-ui-container">
											<div class="basket-inventory output">
												<InventorySlots
													menu={menu}
													inventory={basketInventory}
													inventorySize={basket().inventorySize}
													click={removeMealFromBasket}
												/>
											</div>
											<StateUi state={campState}>
												<div class="meals-inventory">
													<InventorySlots
														menu={menu}
														inventory={playerMeals}
														click={sendMealToBasket}
													/>
												</div>
											</StateUi>
										</div>
									)
								}}
							</Menu>
						</>
					)
				}}
			</Show>
		</Modal>

	)
}