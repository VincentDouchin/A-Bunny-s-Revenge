import type { With } from 'miniplex'
import { createComputed, createRoot, createSignal } from 'solid-js'
import type { ItemData } from '@/constants/items'
import type { Entity } from '@/global/entity'
import { assets, ecs, ui } from '@/global/init'
import { save } from '@/global/save'
import { menuInputMap } from '@/lib/inputs'
import { textStroke } from '@/lib/uiManager'
import { ForQuery } from '@/ui/ForQuery'
import { Menu } from '@/ui/Menu'
import { range } from '@/utils/mapFunctions'

export const ItemDisplay = (props: { item: ItemData | null; selected: boolean }) => {
	return (
		<div style={{ 'border-radius': '1rem', 'background': 'hsla(0 0% 0% / 50%)', 'width': '5rem', 'height': '5rem', 'display': 'grid', 'place-items': 'center', 'position': 'relative', 'border': props.selected ? 'solid 0.2rem white' : '', 'box-sizing': 'border-box' }}>

			{props.item?.icon && (
				<>
					<img src={assets.items[props.item.icon].src} style={{ width: '80%' }}></img>
					<div style={{ 'color': 'white', 'position': 'absolute', 'width': '1rem', 'bottom': '0.5rem', 'right': '0.5rem', ...textStroke('black'), 'text-align': 'center' }}>{props.item.quantity}</div>
				</>
			)}

		</div>
	)
}

const playerQuery = ecs.with('playerControls', 'openInventory')
export const Inventory = (props: { player: With<Entity, 'playerControls'> }) => {
	const items = ui.sync(() => [...save.items, ...range(save.items.length, 24, () => null)])
	return (
		<div class="slide-in" style={{ 'display': 'grid', 'grid-template-columns': 'repeat(8, 1fr)', 'place-self': 'center', 'gap': '1rem' }}>
			<Menu
				inputs={props.player.menuInputs}
			>
				{({ getProps }) => {
					return items().map((item) => {
						const props = getProps()
						return (
							<div {...props}>
								<ItemDisplay item={item} selected={props.selected()}></ItemDisplay>
							</div>
						)
					})
					 }}
			</Menu>
		</div>
	)
}
export const InventoryUi = () => {
	return (
		<ForQuery query={playerQuery}>
			{entity => <Inventory player={entity}></Inventory>}
		</ForQuery>
	)
}
