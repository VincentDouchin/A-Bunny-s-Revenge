import type { With } from 'miniplex'
import { Show } from 'solid-js'
import { InventorySlots } from '../farm/InventoryUi'
import type { Entity } from '@/global/entity'
import { MenuType } from '@/global/entity'
import { ecs, ui } from '@/global/init'
import { Modal } from '@/ui/components/Modal'
import { Menu } from '@/ui/components/Menu'

const basketQuery = ecs.with('menuType', 'inventory', 'inventoryId', 'inventorySize').where(e => e.menuType === MenuType.Basket)
export const BasketUi = ({ player }: { player: With<Entity, 'menuInputs'> }) => {
	const entity = ui.sync(() => basketQuery.first)
	return (
		<Modal open={entity()}>
			<Show when={entity()}>
				{(basket) => {
					ui.updateSync(() => {
						if (player.menuInputs.get('cancel').justReleased) {
							ecs.removeComponent(basket(), 'menuType')
						}
					})
					return (
						<Menu>
							{({ getProps }) => {
								return (
									<div>
										<InventorySlots getProps={getProps} entity={basket()}></InventorySlots>
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