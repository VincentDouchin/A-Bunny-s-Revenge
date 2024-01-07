import { For, Show, createMemo, createSignal } from 'solid-js'
import { InventoryTitle } from './CookingUi'
import type { ItemData } from '@/constants/items'
import { quests } from '@/constants/quests'
import type { Quest, QuestName } from '@/constants/quests'

import { assets, ecs, ui } from '@/global/init'
import { save, updateSave } from '@/global/save'
import { textStroke } from '@/lib/uiManager'
import { IconButton } from '@/ui/components/Button'
import type { getProps } from '@/ui/components/Menu'
import { Menu } from '@/ui/components/Menu'
import { Modal } from '@/ui/components/Modal'
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
	const [tab, setTab] = createSignal<'inventory' | 'quests'>('inventory')
	const questsToComplete = ui.sync(() => Object.entries(save.quests) as [QuestName, boolean[]][])
	return (
		<Modal open={player()}>
			<Show when={player()}>
				{player => (
					<div style={{ }}>
						<div style={{ display: 'flex', gap: '1rem' }}>
							<IconButton icon="basket-shopping-solid" onClick={() => setTab('inventory')}></IconButton>
							<IconButton icon="list-check-solid" onClick={() => setTab('quests')}></IconButton>
						</div>
						<InventoryTitle>{tab()}</InventoryTitle>
						<Show when={tab() === 'inventory'}>
							<div style={{ 'display': 'grid', 'grid-template-columns': 'repeat(8, 1fr)', 'gap': '1rem' }}>
								<Menu
									inputs={player().menuInputs}
								>
									{({ getProps }) => {
										return <InventorySlots getProps={getProps} />
									}}
								</Menu>
							</div>
						</Show>
						<Show when={tab() === 'quests'}>
							<For each={questsToComplete()}>
								{([questName, compltetedSteps]) => {
									const quest = quests[questName] as Quest
									return (
										<div style={{ 'color': 'white', 'background': 'hsl(0, 0%, 0%, 0.3)', 'padding': '1rem', 'border-radius': '1rem' }}>
											<div style={{ 'font-size': '2rem' }}>{quest.name}</div>
											<For each={quest.steps}>
												{(step, i) => {
													const isCompleted = compltetedSteps[i()]
													return (
														<div>
															{step?.description && <div>{step.description}</div>}
															{step.items?.map(item => (
																<div style={{ position: 'relative' }}>
																	<div innerHTML={assets.icons[isCompleted ? 'circle-check-solid' : 'circle-xmark-solid']} style={{ 'position': 'absolute', 'z-index': 1, 'top': '0.5rem', 'left': '0.5rem', 'color': isCompleted ? '#33cc33' : 'red' }}></div>
																	<ItemDisplay item={item} selected={false}></ItemDisplay>
																</div>
															))}
														</div>
													)
												}}
											</For>
										</div>
									)
								}}
							</For>
						</Show>
					</div>
				)}
			</Show>
		</Modal>
	)
}
