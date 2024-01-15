import type { With } from 'miniplex'
import { For, Show, createMemo, createSignal } from 'solid-js'
import { InventoryTitle } from './CookingUi'
import type { Item } from '@/constants/items'

import type { Entity } from '@/global/entity'
import { assets, ecs, ui } from '@/global/init'
import { updateSave } from '@/global/save'
import { textStroke } from '@/lib/uiManager'
import { IconButton } from '@/ui/components/Button'
import type { getProps } from '@/ui/components/Menu'
import { Menu } from '@/ui/components/Menu'
import { Modal } from '@/ui/components/Modal'
import type { FarmUiProps } from '@/ui/types'
import { range } from '@/utils/mapFunctions'

export const ItemDisplay = (props: { item: Item | null, selected: boolean, disabled?: boolean }) => {
	const isDisabled = createMemo(() => props.disabled ?? false)
	const disabledStyles = createMemo(() => {
		return isDisabled()
			? { opacity: '50%' }
			: {}
	})
	return (
		<div style={{ 'border-radius': '1rem', 'background': 'hsla(0 0% 0% / 50%)', 'width': '5rem', 'height': '5rem', 'display': 'grid', 'place-items': 'center', 'position': 'relative', 'border': props.selected ? 'solid 0.2rem white' : '' }}>

			{props.item?.name && (
				<>
					<img src={assets.items[props.item.name].src} style={{ width: '80%', ...disabledStyles() }}></img>
					<div style={{ 'color': 'white', 'position': 'absolute', 'width': '1rem', 'bottom': '0.5rem', 'right': '0.5rem', ...textStroke('black'), 'text-align': 'center' }}>{props.item.quantity}</div>
				</>
			)}
			{props.selected && <div style={{ 'color': 'white', 'position': 'absolute', 'top': '100%', 'font-size': '1.5rem', 'z-index': 2 }}>{props.item?.name}</div>}

		</div>
	)
}

export const InventorySlots = (props: {
	getProps: getProps
	click?: (item: Item | null, index: number) => void
	disabled?: (item: Item | null) => boolean | undefined
	entity: With<Entity, 'inventorySize' | 'inventory' | 'inventoryId'>
}) => {
	return (
		<For each={range(0, props.entity.inventorySize)}>
			{(_, i) => {
				const slotProps = props.getProps(i() === 0)
				const itemSynced = ui.sync(() => props.entity.inventory[i()])
				const disabled = props.disabled && props.disabled(itemSynced())
				const [ref, setRef] = createSignal()
				return (
					<div
						{...slotProps}
						draggable={itemSynced() !== undefined}
						class="item-drag"
						ref={setRef}
						onClick={() => props.click && !disabled && props.click(itemSynced(), i())}
						onDragStart={(e) => {
							e.dataTransfer?.setData('text/plain', JSON.stringify([itemSynced(), props.entity.inventoryId, i()]))
						}}
						onDragOver={e => e.preventDefault()}
						onDrop={(e) => {
							const item = itemSynced()

							const data = e.dataTransfer?.getData('text/plain')
							if (data && e.target.closest('.item-drag') === ref()) {
								try {
									const [dataParsed, id, position]: [Item, string, number] = JSON.parse(data) as any
									if (item === undefined || item === null) {
										updateSave((s) => {
											delete s.inventories[id][position]
											// s.items[i()] = dataParsed
											s.inventories[props.entity.inventoryId][i()] = dataParsed
										})
									} else if (dataParsed.name === item.name) {
										updateSave((s) => {
											delete s.inventories[id][position]
											s.inventories[props.entity.inventoryId][i()].quantity += dataParsed.quantity
										})
									}
								} catch (_) {
								}
							}
						}}
					>
						<ItemDisplay
							disabled={disabled}
							item={itemSynced()}
							selected={slotProps.selected()}
						/>
					</div>
				)
			}}

		</For>
	)
}

export const InventoryUi = ({ player }: FarmUiProps) => {
	ui.updateSync(() => {
		if (player?.menuInputs?.get('cancel').justReleased) {
			ecs.removeComponent(player, 'menuOpen')
		}
	})
	// const [tab, setTab] = createSignal<'inventory' | 'quests'>('inventory')
	const open = ui.sync(() => player.menuOpen)

	return (
		<Modal open={open()}>
			<Show when={open()}>
				<div>
					{/* <div style={{ display: 'flex', gap: '1rem' }}>
						<IconButton icon="basket-shopping-solid" onClick={() => setTab('inventory')}></IconButton>
						<IconButton icon="list-check-solid" onClick={() => setTab('quests')}></IconButton>
					</div> */}
					<InventoryTitle>Inventory</InventoryTitle>
					{/* <Show when={tab() === 'inventory'}> */}
					<div style={{ 'display': 'grid', 'grid-template-columns': 'repeat(8, 1fr)', 'gap': '1rem' }}>
						<Menu
							inputs={player.menuInputs}
						>
							{({ getProps }) => {
								return <InventorySlots getProps={getProps} entity={player} />
							}}
						</Menu>
					</div>
					{/* </Show> */}
					{/* <Show when={tab() === 'quests'}>

					</Show> */}
				</div>
			</Show>
		</Modal>
	)
}
