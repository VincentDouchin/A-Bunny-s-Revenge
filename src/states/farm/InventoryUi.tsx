import { For, Show, createMemo, createSignal } from 'solid-js'
import type { ItemData } from '@/constants/items'
import { assets, ecs, ui } from '@/global/init'
import { save, updateSave } from '@/global/save'
import { textStroke } from '@/lib/uiManager'
import type { getProps } from '@/ui/Menu'
import { Menu } from '@/ui/Menu'
import { Modal } from '@/ui/Modal'
import { range } from '@/utils/mapFunctions'

export const ItemDisplay = (props: { item: ItemData | null, selected: boolean, disabled?: boolean }) => {
	const isDisabled = createMemo(() => props.disabled ?? false)
	const disabledStyles = createMemo(() => {
		return isDisabled()
			? { opacity: '50%' }
			: {}
	})
	return (
		<div style={{ 'border-radius': '1rem', 'background': 'hsla(0 0% 0% / 50%)', 'width': '5rem', 'height': '5rem', 'display': 'grid', 'place-items': 'center', 'position': 'relative', 'border': props.selected ? 'solid 0.2rem white' : '' }}>

			{props.item?.icon && (
				<>
					<img src={assets.items[props.item.icon].src} style={{ width: '80%', ...disabledStyles() }}></img>
					<div style={{ 'color': 'white', 'position': 'absolute', 'width': '1rem', 'bottom': '0.5rem', 'right': '0.5rem', ...textStroke('black'), 'text-align': 'center' }}>{props.item.quantity}</div>
				</>
			)}
			{props.selected && <div style={{ 'color': 'white', 'position': 'absolute', 'top': '100%', 'font-size': '1.5rem', 'z-index': 2 }}>{props.item?.icon}</div>}

		</div>
	)
}
const useItems = () => ui.sync(() => save.items)
const playerQuery = ecs.with('playerControls', 'openInventory')

export const InventorySlots = (props: { getProps: getProps, click?: (item: ItemData | null) => void, disabled?: (item: ItemData | null) => boolean | undefined }) => {
	const items = useItems()
	return (
		<For each={range(0, 24)}>
			{(_, i) => {
				const slotProps = props.getProps(i() === 0)
				const itemSynced = ui.sync(() => items()[i()])
				const disabled = props.disabled && props.disabled(itemSynced())
				const [ref, setRef] = createSignal()
				return (
					<div
						{...slotProps}
						draggable={itemSynced() !== undefined}
						class="item-drag"
						ref={setRef}
						onClick={() => props.click && !disabled && props.click(itemSynced())}
						onDragStart={(e) => {
							e.dataTransfer?.setData('text/plain', JSON.stringify([itemSynced(), i()]))
						}}
						onDragOver={e => e.preventDefault()}
						onDrop={(e) => {
							const data = e.dataTransfer?.getData('text/plain')
							if (data && e.target.closest('.item-drag') === ref()) {
								try {
									const [dataParsed, position]: [ItemData, number] = JSON.parse(data) as any
									if (itemSynced() === undefined) {
										updateSave((s) => {
											delete s.items[position]
											s.items[i()] = dataParsed
										})
									}
									if (dataParsed.icon === itemSynced().icon) {
										updateSave((s) => {
											delete s.items[position]
											s.items[i()].quantity += dataParsed.quantity
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

export const InventoryUi = () => {
	const player = ui.sync(() => playerQuery.first)
	ui.updateSync(() => {
		const p = player()
		if (p?.menuInputs?.get('cancel').justPressed) {
			ecs.removeComponent(p, 'openInventory')
		}
	})
	return (
		<Modal open={player()}>
			<Show when={player()}>
				{player => (
					<div style={{ 'display': 'grid', 'grid-template-columns': 'repeat(8, 1fr)', 'gap': '1rem' }}>
						<Menu
							inputs={player().menuInputs}
						>
							{({ getProps }) => {
								return <InventorySlots getProps={getProps} />
							}}
						</Menu>
					</div>
				)}
			</Show>
		</Modal>
	)
}
