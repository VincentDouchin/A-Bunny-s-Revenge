import type { Accessor } from 'solid-js'
import { For, Show, createEffect, createMemo, createSignal } from 'solid-js'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { InventoryTitle, ItemDisplay } from './InventoryUi'
import { itemsData } from '@/constants/items'
import type { Recipe } from '@/constants/recipes'
import { recipes } from '@/constants/recipes'
import { MenuType } from '@/global/entity'
import { assets, ecs, ui } from '@/global/init'
import { removeItem } from '@/global/save'
import { ModType, type Modifier } from '@/lib/stats'
import { InputIcon } from '@/ui/InputIcon'
import { Menu, menuItem } from '@/ui/components/Menu'
import { Modal } from '@/ui/components/Modal'
import type { FarmUiProps } from '@/ui/types'
import { range } from '@/utils/mapFunctions'
import { GoldContainer } from '@/ui/components/styledComponents'

// eslint-disable-next-line no-unused-expressions
menuItem
const recipeQuery = ecs.with('menuType', 'menuInputs', 'recipesQueued').where(({ menuType }) => [MenuType.Oven, MenuType.Cauldron, MenuType.Bench].includes(menuType))
const getMenuName = (menuType: MenuType) => {
	switch (menuType) {
		case MenuType.Oven :return 'Oven'
		case MenuType.Cauldron :return 'Cauldron'
		case MenuType.Bench :return 'Cutting Board'
	}
	return ''
}
export const MealBuffs = ({ meals }: { meals: Accessor<Modifier<any>[]> }) => {
	return (
		<For each={meals()}>
			{mod => (
				<div>
					{Math.sign(mod.value) > 0 && <span>+</span>}
					<span>{mod.value}</span>
					{mod.type === ModType.Percent && <span>%</span>}
					<span>
						{' '}
						{mod.name}
					</span>
				</div>
			)}
		</For>
	)
}
export const RecipesUi = ({ player }: FarmUiProps) => {
	const recipeEntity = ui.sync(() => recipeQuery.first)
	css/* css */`
	.recipes-container{
		display: flex;
		gap: 2rem;
		min-height: 20rem;
	}
	.output{
		display: flex;
		gap: 0.5rem;
		width: fit-content;
		place-self: center;
	}
	.recipes{
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(5, 1fr);
		height: fit-content;
	}
	.description{
		width: 20rem
	}
	`
	return (
		<Modal open={recipeEntity()}>
			<Show when={recipeEntity()}>
				{(entity) => {
					ui.updateSync(() => {
						if (player.menuInputs.get('cancel').justReleased) {
							ecs.removeComponent(entity(), 'menuType')
						}
					})
					const recipeQueued = ui.sync(() => recipeEntity()?.recipesQueued ?? [])
					const recipesFiltered = createMemo(() => recipes.filter(recipe => recipe.processor === entity().menuType))
					const [selectedRecipe, setSelectedRecipe] = createSignal<null | Recipe>(null)

					return (
						<GoldContainer>
							<InventoryTitle>{getMenuName(entity().menuType)}</InventoryTitle>
							<div class="recipes-container">

								<div>
									<Menu inputs={entity().menuInputs}>
										{({ menu }) => {
											return (
												<div style={{ display: 'grid', gap: '1rem' }}>
													<div class="output">
														<For each={range(0, 4, i => i)}>
															{(i) => {
																const selected = atom(false)
																return (
																	<div style={{ color: 'white' }}>
																		<div use:menuItem={[menu, false, selected]} style={{ 'display': 'grid', 'align-items': 'center' }}>
																			<ItemDisplay
																				selected={selected}
																				item={recipeQueued()[i]?.output}
																			/>
																		</div>
																	</div>
																)
															}}
														</For>
													</div>
													<div class="recipes">
														<For each={recipesFiltered()}>
															{(recipe, i) => {
																const selected = atom(false)
																createEffect(() => {
																	if (selected()) {
																		setSelectedRecipe(recipe)
																	}
																})
																const canCraft = createMemo(() => {
																	if (recipe.input.some((item) => {
																		return !player.inventory.find((playerItem) => {
																			return playerItem?.name === item.name && playerItem.quantity >= item.quantity
																		})
																	})) {
																		return { completed: false }
																	}
																	return {}
																})
																return (
																	<div style={{ color: 'white' }}>
																		<div use:menuItem={[menu, i() === 0, selected]} style={{ 'display': 'grid', 'align-items': 'center' }}>
																			<ItemDisplay
																				selected={selected}
																				item={recipe.output}
																				{...canCraft()}
																			/>
																		</div>
																	</div>
																)
															}}
														</For>
													</div>
												</div>
											)
										}}
									</Menu>
								</div>
								<div class="description">
									<Show when={selectedRecipe()}>
										{(recipe) => {
											const output = createMemo(() => itemsData[recipe().output.name])
											const buffs = createMemo(() => output().meal?.modifiers)
											const cook = () => {
												if (recipe().input.every(input => player.inventory.some((item) => {
													return item?.name === input.name && item.quantity >= input.quantity
												}))) {
													if (recipeQueued().length < 4) {
														for (const input of recipe().input) {
															removeItem(player, input)
														}
														recipeEntity()?.recipesQueued.push(recipe())
													}
												}
											}
											ui.updateSync(() => {
												if (player.playerControls.get('secondary').justReleased) {
													cook()
												}
											})
											return (
												<div style={{ 'font-size': '1.5rem', 'display': 'grid', 'height': 'fit-content' }}>
													<div style={{ 'text-align': 'center', 'display': 'grid' }}>{output().name}</div>
													<div style={{ 'display': 'grid', 'grid-template-columns': '1fr 1fr' }}>
														<For each={recipe().input}>
															{(input) => {
																const amount = ui.sync(() => player.inventory.reduce((acc, v) => v?.name === input.name ? acc + v.quantity : acc, 0))
																const color = createMemo(() => amount() < input.quantity ? { color: 'red' } : {})
																return (
																	<div style={{ 'display': 'flex', 'align-items': 'center', 'gap': '1rem' }}>
																		<img style={{ width: '2rem', height: '2rem' }} src={assets.items[input.name].img}>{}</img>
																		<span style={{ 'font-size': '1.5rem', ...color() }}>{` X ${input.quantity} (${amount()})`}</span>
																	</div>
																)
															}}
														</For>
													</div>
													<div>
														<Show when={buffs()}>
															{mods => <MealBuffs meals={mods} />}
														</Show>
													</div>
													<button onClick={() => cook()} style={{ 'font-size': '1.2rem', 'display': 'flex', 'gap': '0.5rem', 'justify-self': 'center' }} class="button">
														<InputIcon input={player.playerControls.get('secondary')} />
														Cook
													</button>

												</div>
											)
										}}
									</Show>

								</div>
							</div>
						</GoldContainer>
					)
				}}
			</Show>
		</Modal>
	)
}