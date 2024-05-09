import type { items } from '@assets/assets'
import { For, Show } from 'solid-js'
import { css } from 'solid-styled'
import { TransitionGroup } from 'solid-transition-group'
import atom from 'solid-use/atom'
import { generateUUID } from 'three/src/math/MathUtils'
import { assets } from '@/global/init'
import { type QuestName, type QuestStep, quests } from '@/constants/quests'

import { itemsData } from '@/constants/items'

type Toast = {
	quest: QuestName
} | {
	removedItem: items
} | {
	addedItem: items
} | {
	step: QuestStep
}
const toasts = atom<(Toast & { id: string })[]>([])
export const addToast = (toast: Toast) => {
	const id = generateUUID()
	toasts([{ ...toast, id }, ...toasts()])
	setTimeout(() => {
		toasts(toasts().filter(t => t.id !== id))
	}, 10000)
}

export const Toaster = () => {
	css/* css */`
	.toast-container{
		position: fixed;
		bottom: 1rem;
		left: 1rem;
		display: flex;
		gap: 1rem;
		flex-direction: column-reverse;
	}
	.toast-icon{
		height: 2rem;
		aspect-ratio: 1;
	}
	.toast{
		color: white;
		font-size: 2rem;
		padding: 1rem 2rem;
		background: var(--black-transparent);
		border-radius: 1rem;
		display: flex;
		gap: 1rem;
		place-items: center;
		transition: all 1s ease;
		width: fit-content;
	}
	`
	return (
		<div class="toast-container">
			<TransitionGroup name="toast">
				<For each={toasts()}>
					{(toast) => {
						return (
							<>
								<Show when={'step' in toast && toast.step}>
									{step => (
										<div class="toast">
											<div class="toast-icon" style={{ color: '#33cc33' }} innerHTML={assets.icons['circle-check-solid']} />
											<div class="outline">{`Completed: ${step().description}`}</div>
										</div>
									)}
								</Show>
								<Show when={'quest' in toast && !('step' in toast) && toast.quest}>
									{quest => (
										<div class="toast">
											<div class="toast-icon" innerHTML={assets.icons['circle-exclamation-solid']} />
											<div class="outline">{`New Quest: ${quests[quest()].name}`}</div>
										</div>
									)}
								</Show>
								<Show when={'removedItem' in toast && toast.removedItem}>
									{item => (
										<div class="toast">
											<img class="toast-icon" src={assets.items[item()].img} />
											<div class="outline">{`Item removed: ${itemsData[item()].name}`}</div>
										</div>
									)}
								</Show>
								<Show when={'addedItem' in toast && toast.addedItem}>
									{item => (
										<div class="toast">
											<img class="toast-icon" src={assets.items[item()].img} />
											<div class="outline">{`Item added: ${itemsData[item()].name}`}</div>
										</div>
									)}
								</Show>
							</>
						)
					}}
				</For>
			</TransitionGroup>
		</div>
	)
}