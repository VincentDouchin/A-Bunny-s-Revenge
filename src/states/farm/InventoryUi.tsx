import { For, createMemo } from 'solid-js'
import type { ItemData } from '@/constants/items'
import { assets, ecs, ui } from '@/global/init'
import { save } from '@/global/save'
import { textStroke } from '@/lib/uiManager'
import { ForQuery } from '@/ui/ForQuery'
import type { getProps } from '@/ui/Menu'
import { Menu } from '@/ui/Menu'
import { range } from '@/utils/mapFunctions'

export const ItemDisplay = (props: { item: ItemData | null, selected: boolean, disabled?: boolean }) => {
	const isDisabled = createMemo(() => props.disabled ?? false)
	const disabledStyles = createMemo(() => {
		return isDisabled()
			? { opacity: '50%' }
			: {}
	})
	return (
		<div style={{ 'border-radius': '1rem', 'background': 'hsla(0 0% 0% / 50%)', 'width': '5rem', 'height': '5rem', 'display': 'grid', 'place-items': 'center', 'position': 'relative', 'border': props.selected ? 'solid 0.2rem white' : '', 'box-sizing': 'border-box' }}>

			{props.item?.icon && (
				<>
					<img src={assets.items[props.item.icon].src} style={{ width: '80%', ...disabledStyles() }}></img>
					<div style={{ 'color': 'white', 'position': 'absolute', 'width': '1rem', 'bottom': '0.5rem', 'right': '0.5rem', ...textStroke('black'), 'text-align': 'center' }}>{props.item.quantity}</div>
				</>
			)}
			{props.selected && <div style={{ color: 'white', position: 'absolute', top: '100%' }}>{props.item?.icon}</div>}

		</div>
	)
}
const useItems = () => ui.sync(() => [...save.items, ...range(save.items.length, 24, () => null)])
const playerQuery = ecs.with('playerControls', 'openInventory')

export const InventorySlots = (props: { getProps: getProps, click?: (item: ItemData | null) => void, disabled?: (item: ItemData | null) => boolean | undefined }) => {
	const items = useItems()
	return (
		<For each={items()}>
			{(item, i) => {
				const slotProps = props.getProps(i() === 0)
				const itemSynced = ui.sync(() => item)
				const disabled = props.disabled && props.disabled(item)
				return (
					<div {...slotProps} onClick={() => props.click && !disabled && props.click(item)}>
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
	return (
		<ForQuery query={playerQuery}>
			{player => (
				<div class="slide-in" style={{ 'display': 'grid', 'grid-template-columns': 'repeat(8, 1fr)', 'place-self': 'center', 'gap': '1rem' }}>
					<Menu
						inputs={player.menuInputs}
					>
						{({ getProps }) => {
							return <InventorySlots getProps={getProps} />
						}}
					</Menu>
				</div>
			)}
		</ForQuery>
	)
}
