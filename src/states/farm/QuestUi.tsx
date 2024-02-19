import { For, Show } from 'solid-js'
import { ItemDisplay } from './InventoryUi'
import { InventoryTitle } from './CookingUi'
import { quests } from '@/constants/quests'
import type { Quest, QuestName } from '@/constants/quests'

import { assets, ecs, ui } from '@/global/init'
import { save } from '@/global/save'
import { MenuType } from '@/global/entity'
import { Modal } from '@/ui/components/Modal'
import type { FarmUiProps } from '@/ui/types'

const openBulletinBoardQuery = ecs.with('menuType').where(e => e.menuType === MenuType.Quest)

export const QuestUi = ({ player }: FarmUiProps) => {
	const questsToComplete = ui.sync(() => Object.entries(save.quests) as [QuestName, boolean[]][])
	const open = ui.sync(() => openBulletinBoardQuery.first)

	return (
		<Modal open={open()}>
			<Show when={open()}>
				{(board) => {
					ui.updateSync(() => {
						if (player.playerControls.get('pause').justReleased) {
							ecs.removeComponent(board(), 'menuType')
						}
					})
					return (
						<>
							<InventoryTitle>Quests</InventoryTitle>
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
																	<ItemDisplay item={item} selected={() => false}></ItemDisplay>
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
						</>
					)
				}}
			</Show>
		</Modal>
	)
}