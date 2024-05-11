import { Show } from 'solid-js'
import { InventorySlots, InventoryTitle } from './InventoryUi'
import { MenuType } from '@/global/entity'
import { ecs, ui } from '@/global/init'
import { Menu } from '@/ui/components/Menu'
import { Modal } from '@/ui/components/Modal'
import { playerInventoryQuery } from '@/utils/dialogHelpers'

const chestQuery = ecs.with('menuType', 'menuInputs', 'inventory', 'inventorySize', 'inventoryId').where(e => e.menuType === MenuType.Chest)
export const ChestUi = () => {
	const chest = ui.sync(() => chestQuery.first)
	const player = ui.sync(() => playerInventoryQuery.first)
	return (
		<Modal open={chest()}>
			<Show when={chest()}>
				{chest => (
					<Show when={player()}>
						{(player) => {
							return (
								<Menu inputs={chest().menuInputs}>
									{({ menu }) => {
										const inventory = ui.sync(() => chest().inventory)
										const playerInventory = ui.sync(() => player().inventory)
										return (
											<>
												<InventoryTitle>Chest</InventoryTitle>
												<div style={{ 'display': 'grid', 'grid-template-columns': 'repeat(8, 1fr)', 'gap': '1rem' }}>
													<InventorySlots menu={menu} inventory={inventory} inventorySize={chest().inventorySize} />
												</div>
												<div style={{ 'display': 'grid', 'grid-template-columns': 'repeat(8, 1fr)', 'gap': '1rem' }}>
													<InventorySlots menu={menu} inventory={playerInventory} />
												</div>
											</>
										)
									}}
								</Menu>
							)
						}}
					</Show>
				)}
			</Show>
		</Modal>
	)
}