import { Show } from 'solid-js'
import { InventorySlots } from './InventoryUi'
import { InventoryTitle } from './CookingUi'
import { InventoryTypes } from '@/global/entity'
import { ecs, ui } from '@/global/init'
import { Menu } from '@/ui/components/Menu'
import { Modal } from '@/ui/components/Modal'
import { playerInventoryQuery } from '@/utils/dialogHelpers'

const chestQuery = ecs.with('inventoryType', 'openInventory', 'menuInputs', 'inventory', 'inventorySize', 'inventoryId').where(({ inventoryType }) => inventoryType === InventoryTypes.Chest)
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
									{({ getProps }) => {
										return (
											<>
												<InventoryTitle>Chest</InventoryTitle>
												<div style={{ 'display': 'grid', 'grid-template-columns': 'repeat(8, 1fr)', 'gap': '1rem' }}>
													<InventorySlots getProps={getProps} entity={chest()} />
												</div>
												<div style={{ 'display': 'grid', 'grid-template-columns': 'repeat(8, 1fr)', 'gap': '1rem' }}>
													<InventorySlots getProps={getProps} entity={player()} />
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