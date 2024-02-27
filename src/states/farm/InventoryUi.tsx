import type { With } from 'miniplex'
import type { Accessor, Setter } from 'solid-js'
import { For, Show, createEffect, createMemo, createSignal } from 'solid-js'
import { InventoryTitle } from './CookingUi'
import { MealBuffs } from './RecipesUi'
import { type Item, itemsData } from '@/constants/items'

import { type Entity, MenuType } from '@/global/entity'
import { assets, ecs, ui } from '@/global/init'
import { updateSave } from '@/global/save'
import type { Modifier } from '@/lib/stats'
import { addModifier } from '@/lib/stats'
import { thumbnailRenderer } from '@/lib/thumbnailRenderer'
import { InputIcon } from '@/ui/InputIcon'
import type { getProps } from '@/ui/components/Menu'
import { Menu } from '@/ui/components/Menu'
import { Modal } from '@/ui/components/Modal'
import type { FarmUiProps } from '@/ui/types'
import { removeItemFromPlayer } from '@/utils/dialogHelpers'
import { range } from '@/utils/mapFunctions'

const thumbnail = thumbnailRenderer()
export const ItemDisplay = (props: { item: Item | null, selected?: Accessor<boolean>, disabled?: boolean }) => {
	const isDisabled = createMemo(() => props.disabled ?? false)
	const disabledStyles = createMemo(() => {
		return isDisabled()
			? { opacity: '50%' }
			: {}
	})
	const isSelected = createMemo(() => props.selected && props.selected())
	const quantity = createMemo(() => props.item?.quantity)

	return (
		<div style={{ 'border-radius': '1rem', 'background': 'hsla(0 0% 100% / 50%)', 'width': '5rem', 'height': '5rem', 'display': 'grid', 'place-items': 'center', 'position': 'relative', 'border': isSelected() ? 'solid 0.2rem white' : '' }}>
			<Show when={props.item?.name && itemsData[props.item.name]}>
				{(item) => {
					return (
						<>
							<Show when={isSelected()}>
								{(_) => {
									const spin = thumbnail.spin(assets.items[props.item!.name].model)

									return <div class="item">{spin}</div>
								}}
							</Show>
							<Show when={!isSelected()}>
								<img src={assets.items[props.item!.name].img} style={{ width: '80%', ...disabledStyles() }}></img>
							</Show>
							<div style={{ 'color': 'white', 'position': 'absolute', 'width': '1rem', 'bottom': '0.5rem', 'right': '0.5rem', 'text-align': 'center' }}>{quantity()}</div>
							<Show when={isSelected()}>
								<div style={{ 'color': 'white', 'position': 'absolute', 'top': '100%', 'font-size': '1.5rem', 'z-index': 2, 'white-space': 'nowrap' }}>{item().name}</div>
							</Show>
						</>
					)
				}}
			</Show>

		</div>
	)
}

export const InventorySlots = (props: {
	getProps: getProps
	setSelectedItem?: Setter<Item | null>
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
				createEffect(() => {
					if (props.setSelectedItem && slotProps.selected()) {
						const item = itemSynced()
						props.setSelectedItem(item)
					}
				})
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
									if (!(position === i() && id === props.entity.inventoryId)) {
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
									}
								} catch (_) {
								}
							}
						}}
					>
						<ItemDisplay
							disabled={disabled}
							item={itemSynced()}
							selected={slotProps.selected}
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
			ecs.removeComponent(player, 'menuType')
		}
	})
	// const [tab, setTab] = createSignal<'inventory' | 'quests'>('inventory')
	const open = ui.sync(() => player.menuType === MenuType.Player)
	const [selectedItem, setSelectedItem] = createSignal<Item | null>(null)
	const item = createMemo(() => {
		const name = selectedItem()?.name
		return name ? itemsData[name] : null
	})
	const meal = createMemo(() => item()?.meal)
	const consumeMeal = (item: Item, mods: Modifier<'maxHealth' | 'strength'>[]) => {
		if (item) {
			removeItemFromPlayer({ name: item.name, quantity: 1 })
			for (const mod of mods) {
				updateSave(s => s.modifiers.push(mod))
				addModifier(mod, player)
			}
		}
	}

	return (
		<Modal open={open()}>
			<Show when={open()}>
				<div>

					<InventoryTitle>Inventory</InventoryTitle>
					<div style={{ 'display': 'grid', 'grid-template-columns': 'auto 15rem', 'gap': '1rem' }}>
						<div style={{ 'display': 'grid', 'grid-template-columns': 'repeat(8, 1fr)', 'gap': '1rem' }}>
							<Menu
								inputs={player.menuInputs}
							>
								{({ getProps }) => {
									return (
										<>
											<InventorySlots
												getProps={getProps}
												entity={player}
												setSelectedItem={setSelectedItem}
											/>
										</>
									)
								}}
							</Menu>
						</div>
						<div style={{ 'background': 'hsl(0,0%,100%,0.5)', 'padding': '1rem', 'border-radius': '1rem' }}>
							<Show when={selectedItem()}>
								{(item) => {
									const data = createMemo(() => itemsData[item().name])

									return (
										<>
											<div style={{ 'color': 'white', 'text-align': 'center', 'font-size': '1.5rem' }}>
												{data().name}
											</div>
											<Show when={meal()}>
												{(mods) => {
													ui.updateSync(() => {
														if (player.playerControls.get('secondary').justPressed) {
															consumeMeal(item(), mods())
														}
													})
													return (
														<div style={{ 'color': 'white', 'padding': '1rem', 'font-size': '1.3rem' }}>
															<button
																onClick={() => consumeMeal(item(), mods())}
																class="button"
																style={{ 'font-size': '1rem', 'width': '3rem', 'display': 'flex', 'gap': '0.5rem', 'margin': '0 auto' }}
															>
																<InputIcon input={player.playerControls.get('secondary')}></InputIcon>
																Eat
															</button>
															<MealBuffs meals={mods} />
														</div>
													) }}
											</Show>
										</>
									)
								}}
							</Show>
						</div>
					</div>
				</div>
			</Show>
		</Modal>
	)
}
