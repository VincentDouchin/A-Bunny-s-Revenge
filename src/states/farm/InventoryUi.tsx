import type { With } from 'miniplex'
import { createComputed, createRoot, createSignal } from 'solid-js'
import type { ItemData } from '@/constants/items'
import type { Entity } from '@/global/entity'
import { assets, ecs, ui } from '@/global/init'
import { save } from '@/global/save'
import { textStroke } from '@/lib/uiManager'
import { ForQuery } from '@/ui/ForQuery'
import { range } from '@/utils/mapFunctions'

const ItemDisplay = (props: { item: ItemData | null }) => {
	return (
		<div style={{ 'border-radius': '1rem', 'background': 'hsla(0 0% 0% / 50%)', 'width': '5rem', 'height': '5rem', 'display': 'grid', 'place-items': 'center', 'position': 'relative' }}>

			{props.item && (
				<>
					<img src={assets.items[props.item.icon].src} style={{ width: '80%' }}></img>
					<div style={{ 'color': 'white', 'position': 'absolute', 'width': '1rem', 'bottom': '0.5rem', 'right': '0.5rem', ...textStroke('black'), 'text-align': 'center' }}>{props.item.quantity}</div>
				</>
			)}

		</div>
	)
}

const playerQuery = ecs.with('playerControls')
const Inventory = (props: { player: With<Entity, 'playerControls'> }) => {
	const inputs = ui.sync(() => props.player.playerControls.get('inventory').justPressed)
	const [active, setActive] = createSignal('slide')
	createComputed(() => {
		if (inputs()) {
			const a = createRoot(() => active())
			setActive(() => a === 'slide-in' ? 'slide-out' : 'slide-in')
		}
	})
	const items = ui.sync(() => [...save.items, ...range(save.items.length, 24, () => null)])
	return (
		<div class={active()} style={{ 'display': 'grid', 'grid-template-columns': 'repeat(8, 1fr)', 'place-self': 'center', 'gap': '1rem' }}>
			{items()?.map((item) => {
				return <ItemDisplay item={item}></ItemDisplay>
			})}

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