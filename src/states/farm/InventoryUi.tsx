import type { With } from 'miniplex'
import type { Accessor, JSX, Setter } from 'solid-js'
import { For, Show, createEffect, createMemo, createSignal, onCleanup } from 'solid-js'
import { css } from 'solid-styled'
import type { icons } from '@assets/assets'
import { MealBuffs } from './RecipesUi'
import { itemsData } from '@/constants/items'
import type { Item, ItemData } from '@/constants/items'

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

export const InventoryTitle = (props: { children: string }) => {
	css/* css */`
	.inventory-title{
		font-size: 3rem;
		color: white;
		font-family: NanoPlus;
		text-transform: capitalize;
	}	
	`
	return <div class="inventory-title outline-text">{props.children}</div>
}
const thumbnail = thumbnailRenderer()
export const ItemBox = (props: { children: JSX.Element, selected?: boolean, completed?: boolean }) => {
	css/* css */`
	.item-display{
		border-radius: 1rem;
		background: var(--black-transparent);
		width: 5rem;
		height: 5rem;
		display: grid;
		place-items: center;
		position: relative;
		box-shadow: 0 0.2rem 0.2rem 0 black;
	}
	.completed{
		position: absolute;
		z-index: 1;
		top: 0.5rem;
		left: 0.5rem;
	}
	`
	return (
		<div
			class="item-display"
			use:solid-styled
			style={{ border: props.selected ? 'solid 0.2rem white' : '' }}
		>
			{props.children}
			<Show when={props.completed !== undefined}>
				<div
					class="completed"
					innerHTML={assets.icons[props.completed ? 'circle-check-solid' : 'circle-xmark-solid']}
					style={{ color: props.completed ? '#33cc33' : 'red' }}
				/>
			</Show>
		</div>
	)
}

export const IconDisplay = (props: { icon: icons, completed?: boolean }) => (
	<ItemBox completed={props.completed}>
		<div
			style={{ width: '80%', display: 'grid' }}
			innerHTML={assets.icons[props.icon]}
		>
		</div>
	</ItemBox>
)

export const ItemDisplay = (props: {
	item: Item | null
	selected?: Accessor<boolean>
	disabled?: boolean
	onSelected?: () => void
	completed?: boolean
}) => {
	const isDisabled = createMemo(() => props.disabled ?? false)
	const disabledStyles = createMemo(() => {
		return isDisabled()
			? { opacity: '50%' }
			: {}
	})
	const [delay, setDelay] = createSignal(false)

	const isSelected = createMemo(() => Boolean(props.selected && props.selected()))
	createEffect(() => {
		if (isSelected()) {
			props.onSelected && props.onSelected()
			setTimeout(() => setDelay(true), 100)
		}
	})
	const quantity = createMemo(() => props.item?.quantity)
	css/* css */`
	@global{
	.quantity{
		color: white;
		position: absolute;
		width: 1rem;
		bottom: 0.5rem;
		right: 0.5rem;
		text-align: center;
	}
	.name{
		color: white;
		position: absolute;
		top: 100%;
		font-size: 1.5rem;
		z-index: 2;
		white-space: nowrap;
	}
	@keyframes item-selected {
		from {
			transform: scale(1.2);
		}
		to {
			transform: scale(1);
		}
	}

	.item-selected {
		animation-name: item-selected;
		animation-duration: 0.4s;
		animation-timing-function: ease-in;
	}
	}
	`

	return (
		<ItemBox
			selected={isSelected()}
			completed={props.completed}
		>
			<Show when={props.item?.name && itemsData[props.item.name]}>
				{(item) => {
					return (
						<>
							<Show when={delay() && isSelected()}>
								{(_) => {
									const { element, clear } = thumbnail.spin(assets.items[props.item!.name].model)

									onCleanup(() => {
										setDelay(false)
										clear()
									})
									return <div class="item">{element}</div>
								}}
							</Show>
							<Show when={!(isSelected() && delay())}>
								<img src={assets.items[props.item!.name].img} style={disabledStyles()} class="item" classList={{ 'item-selected': isSelected() }}></img>
							</Show>
							<div class="quantity">{quantity()}</div>
							<Show when={isSelected()}>
								<div class="name">{item().name}</div>
							</Show>
						</>
					)
				}}
			</Show>

		</ItemBox>
	)
}

export const InventorySlots = (props: {
	getProps: getProps
	setSelectedItem?: Setter<Item | null>
	click?: (item: Item | null, index: number) => void
	disabled?: (item: Item | null) => boolean | undefined
	first?: (item: Item | null) => boolean
	onSelected?: () => void
	entity: With<Entity, 'inventorySize' | 'inventory' | 'inventoryId'>
}) => {
	return (
		<For each={range(0, props.entity.inventorySize)}>
			{(_, i) => {
				const slotProps = props.getProps(props.first ? props.first(props.entity.inventory[i()]) : i() === 0)
				const itemSynced = ui.sync(() => props.entity.inventory[i()])
				const disabled = props.disabled && props.disabled(itemSynced())
				createEffect(() => {
					if (props.setSelectedItem && slotProps.selected()) {
						const item = itemSynced()
						props.setSelectedItem(item)
					}
				})
				return (
					<div
						{...slotProps}
						class="item-drag"
						onClick={() => props.click && !disabled && props.click(itemSynced(), i())}

					>
						<ItemDisplay
							disabled={disabled}
							item={itemSynced()}
							onSelected={props.onSelected}
							selected={slotProps.selected}
						/>
					</div>
				)
			}}

		</For>
	)
}
type ItemCategory = Exclude<keyof ItemData, 'name'>
const PlayerInventory = ({ player, getProps, setSelectedItem }: { player: With<Entity, 'inventory' | 'inventoryId'>, getProps: getProps, setSelectedItem: Setter<Item | null> }) => {
	const inventory = ui.sync(() => player.inventory.filter(Boolean))
	const categories = createMemo(() => ['meal', 'ingredient', 'seed', 'key item'].filter((category) => {
		return inventory().some(item => category in itemsData[item.name])
	}) as ItemCategory[])
	css/* css */`
	.inventory-container{
		height:25rem;
		overflow-y: scroll;
		scroll-behavior:smooth;
		scrollbar-width: none;
		display: grid;
		gap: 1rem;
	}
	.inventory-category{
		display:grid;
		grid-template-columns: repeat(8, 1fr);
		gap: 1rem;
	}
	.category-title{
		font-size:2.1rem;
		color: white;
		text-transform: capitalize;
	}
	`
	return (
		<>

			<div class="inventory-container">
				<For each={categories()}>
					{(category) => {
						const items = createMemo(() => inventory().filter((item) => {
							return category in itemsData[item.name]
						}))
						const fakeEntity = createMemo(() => ({ inventorySize: items().length, inventory: items(), inventoryId: player.inventoryId }))
						const [ref, setRef] = createSignal<HTMLElement>()
						const select = () => {
							ref()?.scrollIntoView()
						}
						return (
							<div>
								<div ref={setRef}class="category-title outline-text">
									{category}
									s
								</div>
								<div class="inventory-category">
									<InventorySlots
										first={(item: Item | null) => category === categories()[0] && item === items()[0]}
										getProps={getProps}
										entity={fakeEntity()}
										onSelected={select}
										setSelectedItem={setSelectedItem}
									/>
								</div>
							</div>
						)
					}}
				</For>
			</div>
		</>
	)
}

export const InventoryUi = ({ player }: FarmUiProps) => {
	ui.updateSync(() => {
		if (player?.menuInputs?.get('cancel').justReleased) {
			ecs.removeComponent(player, 'menuType')
		}
	})
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
				updateSave(s => s.modifiers.push(mod.key))
				addModifier(mod, player, true)
			}
		}
	}
	css/* css */`
	.inventory-container{
		display: grid;
		grid-template-columns: 47rem 15rem;
		gap: 1rem;
	}
		.modal{

		place-self: center;
		padding: 2rem;
		border-radius: 1rem;
		display: grid;
		gap: 2rem;
		position: relative;

	}
	`

	return (

		<Modal open={open()}>
			<Show when={open()}>
				<div>

					<InventoryTitle>Inventory</InventoryTitle>
					<div class="inventory-container">
						<div>
							<Menu
								inputs={player.menuInputs}
							>
								{({ getProps }) => {
									return (
										<PlayerInventory
											setSelectedItem={setSelectedItem}
											getProps={getProps}
											player={player}
										/>
									)
								}}
							</Menu>
						</div>
						<div class="description">
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
																class="styled"
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
