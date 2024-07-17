import type { items } from '@assets/assets'
import Check from '@assets/icons/circle-check-solid.svg'
import Cross from '@assets/icons/circle-xmark-solid.svg'
import { autoUpdate } from '@floating-ui/dom'
import { useFloating } from 'solid-floating-ui'
import type { Accessor, JSX, JSXElement, Setter } from 'solid-js'
import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { MealAmount, amountEaten, extra } from '../dungeon/HealthUi'
import { setInitialHealth } from '../dungeon/health'
import { MealBuffs, RecipeDescription } from './RecipesUi'
import type { Item } from '@/constants/items'
import { isMeal, itemsData } from '@/constants/items'
import type { Recipe } from '@/constants/recipes'
import { recipes } from '@/constants/recipes'
import { MenuType } from '@/global/entity'
import { assets, ecs, save, ui } from '@/global/init'
import { modifiers } from '@/global/modifiers'
import { thumbnailRenderer } from '@/lib/thumbnailRenderer'
import { InputIcon } from '@/ui/InputIcon'
import type { MenuDir } from '@/ui/components/Menu'
import { Menu, menuItem } from '@/ui/components/Menu'
import { Modal } from '@/ui/components/Modal'
import { GoldContainer, InventoryTitle, OutlineText } from '@/ui/components/styledComponents'
import { Tabs } from '@/ui/components/tabs'
import { Settings } from '@/ui/settings'
import { useGame } from '@/ui/store'
import { removeItemFromPlayer } from '@/utils/dialogHelpers'
import { range } from '@/utils/mapFunctions'
// eslint-disable-next-line no-unused-expressions
menuItem

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

					style={{ fill: props.completed ? '#33cc33' : 'red' }}
				>
					{props.completed && <Check />}
					{!props.completed && <Cross />}
				</div>
			</Show>
		</div>
	)
}

export const IconDisplay = (props: { children: () => JSXElement, completed?: boolean }) => (
	<ItemBox completed={props.completed}>
		<div
			style={{ width: '80%', display: 'grid' }}

		>
			<props.children />
		</div>
	</ItemBox>
)

export const ItemDisplay = (props: {
	item: Item | null
	selected?: Accessor<boolean>
	disabled?: boolean
	onSelected?: () => void
	completed?: boolean
	hidden?: boolean
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
	.hidden{
		filter: contrast(0%) brightness(0%);
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
											<div ref={setReference} class="item" classList={{ hidden: props.hidden }}>{element}</div>
											<Show when={!props.hidden && showName()}>
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
									classList={{ 'item-selected': isSelected(), 'hidden': props.hidden }}
								>
								</img>
							</Show>
							<Show when={!props.hidden}>
								<div class="quantity">
									<OutlineText>{quantity()}</OutlineText>
								</div>
							</Show>

						</>
					)
				}}
			</Show>

		</ItemBox>
	)
}
export const InventorySlots = ({ first, disabled, click, setSelectedItem, menu, onSelected, inventorySize, inventory, hidden }: {
	menu: MenuDir
	setSelectedItem?: Setter<Item | null>
	click?: (item: Item | null, index: number) => void
	disabled?: (item: Item | null) => boolean | undefined
	first?: (item: Item | null) => boolean
	onSelected?: () => void
	inventorySize?: number
	inventory: Accessor <(Item | null)[]>
	hidden?: (item: Item | null) => boolean
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
				const isHidden = hidden ? hidden(itemSynced()) : false
				return (
					<div
						use:menuItem={[menu, isFirst, selected]}
						class="item-drag"
						onClick={() => click && !isDisabled && click(itemSynced(), i())}
					>
						<ItemDisplay
							hidden={isHidden}
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

const ItemCategories = <T,>({ items, setSelectedItem, menu, categories, filter, categoryName, hidden }: {
	items: Accessor<Item[]>
	menu: MenuDir
	setSelectedItem: Setter<Item | null>
	categories: Accessor<T[]>
	filter: (category: T, item: Item) => boolean
	categoryName?: (category: T) => string
	hidden?: (item: Item | null) => boolean
}) => {
	const getName = categoryName ?? ((key: T) => `${key}s`)
	css/* css */`
	.inventory-container{
		overflow-y: scroll;
		scroll-behavior:smooth;
		scrollbar-width: none;
		display: grid;
		gap: 1rem;
	}
	.inventory-category{
		display:grid;
		grid-template-columns: repeat(6, 5rem);
		gap: 1rem;
	}
	.category-title{
		font-size:2.1rem;
		color: white;
		text-transform: capitalize;
	}
	`
	return (
		<div class="inventory-container">
			<For each={categories()}>
				{(category) => {
					const categoryItems = createMemo(() => items().filter((item) => {
						return filter(category, item)
					}))
					const [ref, setRef] = createSignal<HTMLElement>()
					const select = () => {
						ref()?.scrollIntoView()
					}
					return (
						<div>
							<div ref={setRef}class="category-title">
								<OutlineText>
									{getName(category)}
								</OutlineText>
							</div>
							<div class="inventory-category">
								<InventorySlots
									menu={menu}
									hidden={hidden}
									first={(item: Item | null) => category === categories()[0] && item === categoryItems()[0]}
									inventory={categoryItems}
									onSelected={select}
									setSelectedItem={setSelectedItem}
								/>
							</div>
						</div>
					)
				}}
			</For>
		</div>
	)
}
export const isRecipeHidden = (i: Item | null) => i?.name ? !save.unlockedRecipes.includes(i.name) : false
export const InventoryUi = () => {
	const context = useGame()

	css/* css */`
	.container{
		width: 56rem;
		height: 25rem;
	}
	.inventory-container{
		display: grid;
		grid-template-columns: calc(6 * 5rem + 5 * 1rem) 20rem;
		gap: 1rem;
		height:25rem;
	}
	.modal{
		place-self: center;
		padding: 2rem;
		border-radius: 1rem;
		display: grid;
		gap: 2rem;
		position: relative;
	}
	.item-name{
		color: white;
		text-align: center;
		font-size: 1.5rem;
	}
	.eating-button-container{
	 	color: white;
		padding: 1rem;
		font-size: 1.3rem;
	}
	.disabled{
		color:grey;
	}
	.tabs-container{
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		padding: 0 1rem;
		position: relative;
	}
	.tab{
		border-left: solid 0.3rem var(--gold-tarnished);
		border-right: solid 0.3rem var(--gold-tarnished);
		border-top: solid 0.3rem var(--gold-tarnished);
		border-radius: 1rem 1rem 0 0;
		background:color-mix(in srgb, var(--brown-dark), black 50%);
		padding: 0.5rem;
		transition: all 0.5s ease;
		position: relative;
		flex:1;
	}
	.tab-selected{
		position: relative;
	}
	.tab-selected::before{
		content: '';
		position: absolute;
		bottom:0;
		width: 100%;
		height: 0.2rem;
		background: var(--gold);
	}
	.active{
		background:var(--brown-dark);
		border-color:var(--gold);
	}
	.active::after{
		position: absolute;
		content: '';
		width: 100%;
		height: 2rem;
		top: 100%;
		transform: translate(-0.5rem,0rem);
		background:var(--brown-dark)
	}
	.category{
		display:grid;
		grid-template-columns: repeat(8, 1fr);
		gap: 1rem;
	}
	`

	return (

		<Show when={context?.player()}>
			{(player) => {
				ui.updateSync(() => {
					if (player()?.menuInputs?.get('cancel').justReleased) {
						ecs.removeComponent(player(), 'menuType')
					}
				})
				const open = ui.sync(() => player().menuType === MenuType.Player)
				const [selectedItem, setSelectedItem] = createSignal<Item | null>(null)

				const meal = createMemo(() => {
					const name = selectedItem()?.name
					if (name && isMeal(name)) {
						return {
							amount: itemsData[name].meal,
							mods: modifiers[name].mods,
						}
					}
				})
				const tabs = ['inventory', 'recipes', 'settings']
				const selectedTab = atom('inventory')
				const recipesOutput = createMemo(() => recipes.map(r => r.output))
				const playerInventory = ui.sync(() => player().inventory.filter(Boolean))
				const categories = createMemo(() => ['meal', 'ingredient', 'seed', 'key item'].filter((category) => {
					return playerInventory().some(item => category in itemsData[item.name])
				}))
				const selectedRecipe = atom<null | Recipe>(null)
				return (
					<Modal open={open()}>
						<Show when={open()}>
							<Menu
								inputs={player().menuInputs}
							>
								{({ menu }) => {
									return (
										<>
											<div class="tabs-container">
												<Tabs tabs={tabs} menu={menu} selectedTab={selectedTab}>
													{(tab, selected) => (
														<div class="tab" classList={{ active: selectedTab() === tab }}>
															<OutlineText>
																<InventoryTitle color={selectedTab() === tab ? 'white' : 'grey'}>
																	<div classList={{ 'tab-selected': selected }}>{tab}</div>
																</InventoryTitle>
															</OutlineText>
														</div>
													)}
												</Tabs>
											</div>
											<GoldContainer>
												<div class="container">
													<Show when={selectedTab() === 'inventory'}>
														<div class="inventory-container">
															<ItemCategories
																items={playerInventory}
																setSelectedItem={setSelectedItem}
																categories={categories}
																menu={menu}
																filter={(c, i) => c in itemsData[i.name]}
															/>
															<div class="description">
																<Show when={selectedItem()}>
																	{(item) => {
																		const data = createMemo(() => itemsData[item().name])
																		return (
																			<>
																				<OutlineText><div class="item-name">{data().name}</div></OutlineText>
																				<Show when={meal()}>
																					{(meal) => {
																						const disabled = ui.sync(() => (amountEaten() + meal().amount) > 5)
																						const consumeMeal = (itemName: items) => {
																							if (!disabled() && isMeal(itemName)) {
																								removeItemFromPlayer({ name: itemName, quantity: 1 })
																								save.modifiers.push(itemName)
																								player().modifiers.addModifier(itemName)
																								setInitialHealth()
																							}
																						}
																						ui.updateSync(() => {
																							if (player().playerControls.get('secondary').justPressed) {
																								consumeMeal(item().name)
																							}
																						})
																						createEffect(() => extra(meal().amount))
																						onCleanup(() => extra(0))
																						const modifiers = createMemo(() => meal().mods)
																						const amount = createMemo(() => meal().amount)
																						return (
																							<>
																								<div class="eating-button-container">
																									<MealAmount size="small" amount={amount} />
																									<button
																										onPointerDown={() => consumeMeal(item().name)}
																										class="styled"
																										classList={{ disabled: disabled() }}
																									>
																										<InputIcon input={player().playerControls.get('secondary')}></InputIcon>
																										Eat
																									</button>
																									<MealBuffs meals={modifiers} />
																								</div>
																							</>
																						)
																					}}
																				</Show>
																			</>
																		)
																	}}
																</Show>
															</div>
														</div>
													</Show>
													<Show when={selectedTab() === 'recipes'}>
														<div class="inventory-container">
															<ItemCategories
																items={recipesOutput}
																setSelectedItem={i => selectedRecipe(recipes.find(r => r.output === i) ?? null)}
																categories={() => [MenuType.Oven, MenuType.Cauldron]}
																menu={menu}
																filter={(c, i) => recipes.find(r => r.output === i)?.processor === c}
																categoryName={(c) => {
																	switch (c) {
																		case MenuType.Oven:return 'Oven'
																		case MenuType.Cauldron:return 'Cauldron'
																		default: return ''
																	}
																}}
																hidden={isRecipeHidden}
															/>
															<div class="description">
																<Show when={!isRecipeHidden(selectedRecipe()?.output ?? null) && selectedRecipe()}>
																	{(recipe) => {
																		return <RecipeDescription recipe={recipe} />
																	}}
																</Show>
															</div>
														</div>
													</Show>
													<Show when={selectedTab() === 'settings'}>
														<Settings menu={menu} />
													</Show>
												</div>
											</GoldContainer>
										</>
									)
								}}
							</Menu>
						</Show>
					</Modal>
				) }}
		</Show>
	)
}
