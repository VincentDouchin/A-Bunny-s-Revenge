import type { Accessor } from 'solid-js'
import type { Recipe } from '@/constants/recipes'
import type { Modifier } from '@/global/modifiers'
import { createEffect, createMemo, createSignal, For, Show } from 'solid-js'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { isMeal, itemsData } from '@/constants/items'
import { recipes } from '@/constants/recipes'
import { MenuType } from '@/global/entity'
import { assets, ecs, save, ui } from '@/global/init'
import { modifiers } from '@/global/modifiers'
import { ModType } from '@/lib/stats'
import { Menu, menuItem } from '@/ui/components/Menu'
import { Modal } from '@/ui/components/Modal'
import { GoldContainer, InventoryTitle, OutlineText } from '@/ui/components/styledComponents'
import { InputIcon } from '@/ui/InputIcon'
import { useGame, useQuery } from '@/ui/store'
import { removeItemFromPlayer } from '@/utils/dialogHelpers'
import { range } from '@/utils/mapFunctions'
import { MealAmount } from '../dungeon/HealthUi'
import { isRecipeHidden, ItemDisplay } from './InventoryUi'

menuItem
export const recipeQuery = useQuery(ecs.with('menuType', 'recipesQueued').where(({ menuType }) => [MenuType.Oven, MenuType.Cauldron, MenuType.Bench].includes(menuType)))
const getMenuName = (menuType: MenuType) => {
	switch (menuType) {
		case MenuType.Oven :return 'Oven'
		case MenuType.Cauldron :return 'Cauldron'
		case MenuType.Bench :return 'Cutting Board'
	}
	return ''
}
export const MealBuffs = ({ meals }: { meals: Accessor<Modifier[]> }) => {
	return (
		<For each={meals()}>
			{mod => (
				<div>
					{Math.sign(mod.value) > 0 && <span>+</span>}
					<span>{mod.value * (mod.type === ModType.Percent ? 100 : 1)}</span>
					{mod.type === ModType.Percent && <span>%</span>}
					<span>
						{' '}
						{mod.stat}
					</span>
				</div>
			)}
		</For>
	)
}

export const RecipeDescription = ({ recipe, onClick }: {
	recipe: Accessor<Recipe>
	onClick?: () => void
}) => {
	const context = useGame()
	const name = createMemo(() => itemsData[recipe().output.name].name)
	const output = createMemo(() => {
		const itemName = recipe().output.name
		if (isMeal(itemName)) {
			return {
				modifiers: modifiers[itemName].mods,
				amount: itemsData[itemName].meal,

			}
		}
	})
	css/* css */`
	.meal-description-container{
		font-size: 1.5rem;
		display: grid;
		height: fit-content;
	}
	.description-items{
		display: grid;
		gap:1rem;
		justify-content:center;
	}
	.meal-amount{
		margin: auto;
	}
	.name{
		text-align: center;
		display: grid;
		font-size:2rem;
		padding-bottom:1.5rem;
	}
	.ingredients-container{
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap:0.5rem 2rem;
		width: 100%;
	}
	.ingredient{
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.ingredient-img{
		width: 2rem;
		height: 2rem;
	}
	.ingredient-name{
		font-size: 1.5rem;
	}
	`
	return (
		<div class="meal-description-container">
			<div class="name">{name()}</div>
			<Show when={output()}>
				{(output) => {
					const amount = createMemo(() => output().amount)
					const modifiers = createMemo(() => output().modifiers)
					return (

						<div class="description-items">
							<div class="meal-amount">
								<MealAmount amount={amount} size="small" />
							</div>
							<div class="ingredients-container">
								<For each={recipe().input}>
									{(input) => {
										const amount = ui.sync(() => context?.player().inventory.reduce((acc, v) => v?.name === input.name ? acc + v.quantity : acc, 0) ?? 0)
										const color = createMemo(() => amount() < input.quantity ? { color: 'red' } : {})
										return (
											<div class="ingredient">
												<img class="ingredient-img" src={assets.items[input.name].img}>{ }</img>
												<span class="ingredient-name" style={color()}>{` X ${input.quantity} (${amount()})`}</span>
											</div>
										)
									}}
								</For>
							</div>
							<div>
								<MealBuffs meals={modifiers} />
							</div>
						</div>
					) }}
			</Show>

			<Show when={onClick}>
				<button onClick={onClick} style={{ 'font-size': '1.2rem', 'display': 'flex', 'gap': '0.5rem', 'justify-self': 'center' }} class="button">
					<InputIcon input={context!.player().playerControls.get('secondary')} />
					Cook
				</button>
			</Show>

		</div>
	)
}
export const RecipesUi = () => {
	const recipeEntity = createMemo(() => recipeQuery()?.[0])
	const context = useGame()
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
	.input-icon{
		font-size: 1.5rem;
		color: white;
		position: absolute;
		margin-top: 1rem;
		top: 100%;
		right: 0.5rem;
		display:flex;
	}
	`

	return (
		<Modal open={recipeEntity()}>
			<Show when={recipeEntity()}>
				{(entity) => {
					ui.updateSync(() => {
						if (context?.player().menuInputs.get('cancel').justReleased) {
							ecs.removeComponent(entity(), 'menuType')
						}
					})
					const recipeQueued = ui.sync(() => recipeEntity()?.recipesQueued ?? [])
					const recipesFiltered = createMemo(() => recipes.filter(recipe => recipe.processor === entity().menuType))
					const [selectedRecipe, setSelectedRecipe] = createSignal<null | Recipe>(null)
					const cook = () => {
						const recipe = selectedRecipe()

						if (recipe) {
							const hasIngredients = recipe.input.every(input => context?.player().inventory.some((item) => {
								return item?.name === input.name && item.quantity >= input.quantity
							}))
							const isUnlocked = save.unlockedRecipes.includes(recipe.output.name)
							if (hasIngredients && isUnlocked) {
								if (recipeQueued().length < 4) {
									for (const input of recipe.input) {
										removeItemFromPlayer(input)
									}
									recipeEntity()?.recipesQueued.push(recipe)
								}
							}
						}
					}
					ui.updateSync(() => {
						if (context?.player().playerControls.get('secondary').justReleased) {
							cook()
						}
					})
					const showRecipe = createMemo(() => {
						const recipe = selectedRecipe()
						if (recipe && !isRecipeHidden(recipe.output)) {
							return recipe
						}
					})
					return (
						<GoldContainer>
							<InventoryTitle>{getMenuName(entity().menuType)}</InventoryTitle>
							<div class="recipes-container">

								<div>
									<Menu inputs={context?.player().menuInputs}>
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
																const hidden = !save.unlockedRecipes.includes(recipe.output.name)
																const canCraft = createMemo(() => {
																	if (recipe.input.some((item) => {
																		return !context?.player().inventory.find((playerItem) => {
																			return playerItem?.name === item.name && playerItem.quantity >= item.quantity
																		})
																		&& !hidden
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
																				hidden={hidden}
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
									<Show when={showRecipe()}>
										{(recipe) => {
											return (
												<RecipeDescription
													recipe={recipe}
													onClick={cook}
												/>
											)
										}}
									</Show>

								</div>
							</div>
							<Show when={!context?.usingTouch() && context?.player()}>
								{(player) => {
									return (
										<div class="input-icon">
											<InputIcon input={player().menuInputs.get('cancel')} />
											<OutlineText>Close</OutlineText>
										</div>
									)
								}}
							</Show>
						</GoldContainer>
					)
				}}
			</Show>
		</Modal>
	)
}
