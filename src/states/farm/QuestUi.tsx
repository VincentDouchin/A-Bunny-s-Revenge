import { For, Show, createEffect, createSignal, onMount } from 'solid-js'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { IconDisplay, ItemDisplay } from './InventoryUi'
import { quests } from '@/constants/quests'
import type { Quest, QuestName } from '@/constants/quests'

import { MenuType } from '@/global/entity'
import { ecs, ui } from '@/global/init'
import { save } from '@/global/save'
import { Menu, menuItem } from '@/ui/components/Menu'
import { Modal } from '@/ui/components/Modal'
import type { FarmUiProps } from '@/ui/types'
import { entries } from '@/utils/mapFunctions'
import { GoldContainer, InventoryTitle } from '@/ui/components/styledComponents'
import { useQuery } from '@/ui/store'
// eslint-disable-next-line no-unused-expressions
menuItem
const openBulletinBoardQuery = useQuery(ecs.with('menuType').where(e => e.menuType === MenuType.Quest))

export const QuestUi = ({ player }: FarmUiProps) => {
	return (
		<For each={openBulletinBoardQuery()}>
			{(board) => {
				const visible = atom(false)
				onMount(() => setTimeout(() => visible(true), 100))
				const questsToComplete = entries(save.quests).toReversed() as [QuestName, boolean[]][]
				ui.updateSync(() => {
					if (player.menuInputs.get('cancel').justReleased) {
						ecs.removeComponent(board, 'menuType')
					}
				})
				css/* css */`
				.quest-container{
					max-height: 30rem;
					overflow: hidden;
					display: grid;
					gap: 0.5rem
				}
				.quest{
					color: white;
					background: hsl(0, 0%, 0%, 0.3);
					padding: 1rem;
					border-radius:1rem;
					margin: 0.2rem;
					box-sizing: border-box;
				}	
				.step{
					display: flex;
					gap: 1rem;
				}
				.quest-description{
					font-size: 1.5rem;
				}
				.step-container{
					display: grid;
					gap: 0.5rem;
				}
				`
				return (
					<Modal open={visible()}>
						<Show when={visible()}>
							<GoldContainer>
								<InventoryTitle>Quests</InventoryTitle>
								<div class="quest-container scroll-container">
									<Menu inputs={player.menuInputs}>
										{({ menu }) => {
											return (
												<For each={questsToComplete}>
													{([questName, completedSteps], i) => {
														const quest = quests[questName] as Quest
														const selected = atom(false)
														const [ref, setRef] = createSignal<HTMLElement>()
														createEffect(() => {
															if (selected()) {
																ref()?.scrollIntoView({ behavior: 'smooth' })
															}
														})
														return (
															<div
																ref={setRef}
																class="quest"
																use:menuItem={[menu, i() === 0, selected]}
																style={{ border: `solid 0.2rem ${selected() ? 'white' : 'transparent'}` }}
															>
																<div style={{ 'font-size': '2rem' }}>{quest.name}</div>
																<div class="step-container">
																	<For each={quest.steps}>
																		{(step, i) => {
																			const isCompleted = Boolean(completedSteps[i()])
																			return (
																				<div class="step">
																					<For each={step.items}>
																						{item => (
																							<ItemDisplay
																								completed={isCompleted}
																								item={item}
																								selected={() => false}
																							/>
																						)}
																					</For>
																					<Show when={step.icon}>
																						{icon => <IconDisplay completed={isCompleted} icon={icon()} />}
																					</Show>
																					<Show when={step.description}>
																						{description => <div class="quest-description">{description()}</div>}
																					</Show>
																				</div>
																			)
																		}}
																	</For>
																</div>
															</div>
														)
													}}
												</For>
											)
										}}
									</Menu>
								</div>
							</GoldContainer>

						</Show>
					</Modal>
				)
			}}
		</For>
	)
}
