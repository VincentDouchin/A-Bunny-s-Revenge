import type { icons } from '@assets/assets'
import { autoUpdate } from '@floating-ui/dom'
import type { With } from 'miniplex'
import { useFloating } from 'solid-floating-ui'
import type { Accessor, JSX, Setter } from 'solid-js'
import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
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
import type { MenuDir } from '@/ui/components/Menu'
import { Menu, menuItem } from '@/ui/components/Menu'
import { Modal } from '@/ui/components/Modal'
import { OutlineText } from '@/ui/components/styledComponents'
import type { FarmUiProps } from '@/ui/types'
import { removeItemFromPlayer } from '@/utils/dialogHelpers'
import { range } from '@/utils/mapFunctions'
// eslint-disable-next-line no-unused-expressions
menuItem
export const InventoryTitle = (props: { children: string }) => {
	css/* css */`
	.inventory-title{
		font-size: 3rem;
		color: white;
		font-family: NanoPlus;
		text-transform: capitalize;
	}	
	`
	return (
		<div class="inventory-title">
			<OutlineText>
				{props.children}
			</OutlineText>
		</div>
	)
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
	const showName = atom(false)
	onMount(() => {
		setTimeout(() => showName(true), 500)
	})
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
	const quantity = ui.sync(() => props.item?.quantity)
	css/* css */`
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
		font-size: 1.5rem;
		white-space: nowrap;
		z-index:1;
		padding: 0.5rem;
	}
	.item {
		width: 80%;
	}
	.item > canvas {
		width: 100% !important;
		height: 100% !important;
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
	`

	return (
		<ItemBox
			selected={isSelected()}
			completed={props.completed}
		>
			<Show when={Boolean(quantity()) && props.item?.name && itemsData[props.item.name]}>
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
									const [reference, setReference] = createSignal<HTMLElement | null>(null)
									const [floating, setFloating] = createSignal<HTMLElement | null>(null)
									const position = useFloating(reference, floating, {
										whileElementsMounted: autoUpdate,
										placement: 'bottom',
										strategy: 'fixed',
									})
									return (
										<>
											<div ref={setReference} class="item">{element}</div>
											<Show when={showName()}>
												<div
													ref={setFloating}
													style={{
														position: position.strategy,
														top: `${position.y}px`,
														left: `${position.x}px`,
													}}
													class="name"
												>
													<OutlineText>{item().name}</OutlineText>
												</div>
											</Show>
										</>
									)
								}}

							</Show>
							<Show when={!(isSelected() && delay())}>
								<img
									src={assets.items[props.item!.name].img}
									style={disabledStyles()}
									class="item"
									classList={{ 'item-selected': isSelected() }}
								>
								</img>
							</Show>
							<div class="quantity">
								<OutlineText>{quantity()}</OutlineText>
							</div>

						</>
					)
				}}
			</Show>

		</ItemBox>
	)
}
export const InventorySlots = ({ first, disabled, click, setSelectedItem, menu, onSelected, inventorySize, inventory }: {
	menu: MenuDir
	setSelectedItem?: Setter<Item | null>
	click?: (item: Item | null, index: number) => void
	disabled?: (item: Item | null) => boolean | undefined
	first?: (item: Item | null) => boolean
	onSelected?: () => void
	inventorySize?: number
	inventory: Accessor <(Item | null)[]>
}) => {
	const size = createMemo(() => inventorySize ?? inventory().length)
	return (
		<For each={range(0, size())}>
			{(_, i) => {
				const itemSynced = ui.sync(() => inventory()[i()])

				const isDisabled = disabled && disabled(itemSynced())
				const selected = atom(false)
				const isFirst = first ? first(inventory()[i()]) : i() === 0
				createEffect(() => {
					if (setSelectedItem && selected()) {
						const item = itemSynced()
						setSelectedItem(item)
					}
				})
				return (
					<div
						use:menuItem={[menu, isFirst, selected]}
						class="item-drag"
						onClick={() => click && !isDisabled && click(itemSynced(), i())}

					>
						<ItemDisplay
							disabled={isDisabled}
							item={itemSynced()}
							onSelected={onSelected}
							selected={selected}
						/>
					</div>
				)
			}}

		</For>
	)
}
type ItemCategory = Exclude<keyof ItemData, 'name'>
const PlayerInventory = ({ player, setSelectedItem, menu }: {
	player: With<Entity, 'inventory' | 'inventoryId'>
	menu: MenuDir
	setSelectedItem: Setter<Item | null>
}) => {
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
						const [ref, setRef] = createSignal<HTMLElement>()
						const select = () => {
							ref()?.scrollIntoView()
						}
						return (
							<div>
								<div ref={setRef}class="category-title">
									<OutlineText>
										{category}
										s
									</OutlineText>
								</div>
								<div class="inventory-category">
									<InventorySlots
										menu={menu}
										first={(item: Item | null) => category === categories()[0] && item === items()[0]}
										inventory={items}
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
								{({ menu }) => {
									return (
										<PlayerInventory
											menu={menu}
											setSelectedItem={setSelectedItem}
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
