import type { With } from 'miniplex'
import type { Accessor } from 'solid-js'
import { For, Show, createEffect, createMemo, createSignal } from 'solid-js'
import { InventoryTitle } from './CookingUi'
import { ItemDisplay } from './InventoryUi'
import { itemsData } from '@/constants/items'
import type { Recipe } from '@/constants/recipes'
import { recipes } from '@/constants/recipes'
import type { Entity } from '@/global/entity'
import { MenuType } from '@/global/entity'
import { assets, ecs, ui } from '@/global/init'
import { removeItem } from '@/global/save'
import { ModType, type Modifier } from '@/lib/stats'
import { InputIcon } from '@/ui/InputIcon'
import { Menu } from '@/ui/components/Menu'
import { Modal } from '@/ui/components/Modal'
import { range } from '@/utils/mapFunctions'

const recipeQuery = ecs.with('menuType', 'menuInputs', 'recipesQueued').where(({ menuType }) => [MenuType.Oven, MenuType.Cauldron].includes(menuType))
const getMenuName = (menuType: MenuType) => {
	switch (menuType) {
		case MenuType.Oven :return 'Oven'
		case MenuType.Cauldron :return 'Cauldron'
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
export const RecipesUi = ({ player }: { player: With<Entity, 'inventory' | 'playerControls' | 'inventoryId' | 'inventorySize' > }) => {
	const recipeEntity = ui.sync(() => recipeQuery.first)
	return (
		<Modal open={recipeEntity()}>
			<Show when={recipeEntity()}>
				{(entity) => {
					ui.updateSync(() => {
						if (player.playerControls.get('pause').justReleased) {
							ecs.removeComponent(entity(), 'menuType')
						}
					})
					const recipeQueued = ui.sync(() => recipeEntity()?.recipesQueued ?? [])
					const recipesFiltered = createMemo(() => recipes.filter(recipe => recipe.processor === entity().menuType))
					const [selectedRecipe, setSelectedRecipe] = createSignal<null | Recipe>(null)

					return (
						<div>
							<InventoryTitle>{getMenuName(entity().menuType)}</InventoryTitle>
							<div style={{ 'display': 'flex', 'gap': '2rem', 'min-height': '20rem' }}>

								<div>
									<Menu inputs={entity().menuInputs}>
										{({ getProps }) => {
											return (
												<div style={{ display: 'grid', gap: '1rem' }}>
													<div style={{ 'display': 'flex', 'gap': '0.5rem', 'background': 'hsl(0,0%,100%,0.3)', 'padding': '0.5rem', 'border-radius': '1rem', 'width': 'fit-content', 'place-self': 'center' }}>
														<For each={range(0, 4, i => i)}>
															{(i) => {
																const props = getProps()
																return (
																	<div style={{ color: 'white' }}>
																		<div {...props} style={{ 'display': 'grid', 'align-items': 'center' }}>
																			<ItemDisplay selected={props.selected} item={recipeQueued()[i]?.output} />
																		</div>
																	</div>
																)
															}}
														</For>
													</div>
													<div style={{ 'display': 'grid', 'gap': '1rem', 'grid-template-columns': '1fr 1fr 1fr 1fr 1fr', 'height': 'fit-content' }}>
														<For each={recipesFiltered()}>
															{(recipe, i) => {
																const props = getProps(i() === 0)
																createEffect(() => {
																	if (props.selected()) {
																		setSelectedRecipe(recipe)
																	}
																})
																return (
																	<div style={{ color: 'white' }}>
																		<div {...props} style={{ 'display': 'grid', 'align-items': 'center' }}>
																			<ItemDisplay selected={props.selected} item={recipe.output} />
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
								<div style={{ 'width': '20rem', 'background': 'hsl(0,0%,100%,0.3)', 'border-radius': '2rem', 'display': 'grid', 'padding': '1rem' }}>
									<Show when={selectedRecipe()}>
										{(recipe) => {
											const output = createMemo(() => itemsData[recipe().output.name])
											const buffs = createMemo(() => output().meal)
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
																		<img style={{ width: '2rem', height: '2rem' }} src={assets.items[input.name].src}></img>
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
						</div>
					)
				}}
			</Show>
		</Modal>
	)
}