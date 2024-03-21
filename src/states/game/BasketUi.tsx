import type { With } from 'miniplex'
import { Show, createMemo } from 'solid-js'
import { InventorySlots } from '../farm/InventoryUi'
import { InventoryTitle } from '../farm/CookingUi'
import type { Entity } from '@/global/entity'
import { MenuType } from '@/global/entity'
import { ecs, ui } from '@/global/init'
import { Modal } from '@/ui/components/Modal'
import { Menu } from '@/ui/components/Menu'
import type { Item } from '@/constants/items'
import { itemsData } from '@/constants/items'
import { addItem, removeItem } from '@/global/save'
import { campState } from '@/global/states'
import { StateUi } from '@/ui/components/StateUi'

const playerToHeal = ecs.with('player', 'currentHealth', 'maxHealth')

const basketQuery = ecs.with('menuType', 'inventory', 'inventoryId', 'inventorySize', 'basket').where(e => e.menuType === MenuType.Basket)
export const BasketUi = ({ player }: { player: With<Entity, 'menuInputs' | 'inventory'> }) => {
	const entity = ui.sync(() => basketQuery.first)
	return (
		<Modal open={entity()}>
			<Show when={entity()}>
				{(basket) => {
					const playerInventory = ui.sync(() => basket().basket.inventory)
					const playerMeals = createMemo(() => playerInventory().filter(Boolean).filter(item => itemsData[item.name].meal !== undefined))
					const playerEntity = createMemo(() => ({ inventoryId: basket().basket.inventoryId, inventory: playerMeals(), inventorySize: playerMeals().length }))
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
							<style jsx>
								{/* css */`
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
								`}
							</style>
							<InventoryTitle>Basket</InventoryTitle>
							<Menu inputs={player.menuInputs}>
								{({ getProps }) => {
									return (
										<div class="basket-ui-container">
											<div class="basket-inventory">
												<InventorySlots getProps={getProps} entity={basket()} click={removeMealFromBasket} />
											</div>
											<StateUi state={campState}>
												<div class="meals-inventory">
													<InventorySlots getProps={getProps} entity={playerEntity()} click={sendMealToBasket} />
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