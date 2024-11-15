import type { items } from '@assets/assets'
import { itemsData } from '@/constants/items'
import { toastEvent } from '@/global/events'
import { assets, time, ui } from '@/global/init'
import Check from '@assets/icons/circle-check-solid.svg'
import Exclamation from '@assets/icons/exclamation-solid.svg'
import { For, Match, onCleanup, onMount, Switch } from 'solid-js'
import { createArray, createObject, createSet } from 'solid-proxies'
import { css } from 'solid-styled'
import { TransitionGroup } from 'solid-transition-group'
import { OutlineText } from './components/styledComponents'

export type Toast = {
	type: 'quest'
	quest: string
} | {
	type: 'removedItem'
	item: items
	quantity: number
} | {
	type: 'addedItem'
	item: items
	quantity: number
} | {
	type: 'questStep'
	description: string
} | {
	type: 'recipe'
	recipe: items
}

export const Toaster = () => {
	const toasts = createSet<(Toast & { time: number })>([])
	const toastsQueue = createArray<Toast>([])

	const addToast = (toast: Toast) => {
		const existingItem = [...toasts].find(t => t.type === toast.type && 'item' in toast && 'item' in t && t.item === toast.item)
		if (
			(toast.type === 'addedItem' || toast.type === 'removedItem')
			&& (existingItem?.type === 'addedItem' || existingItem?.type === 'removedItem')
			&& existingItem
		) {
			existingItem.time = 10_000
			existingItem.quantity += toast.quantity
		} else if (toasts.size < 5) {
			toasts.add(createObject({ ...toast, time: 10_000 }))
		} else {
			toastsQueue.push(toast)
		}
	}
	onMount(() => {
		const unsub = toastEvent.subscribe(addToast)
		onCleanup(unsub)
	})

	ui.updateSync(() => {
		for (const toast of toasts) {
			toast.time -= time.delta
			if (toast.time <= 0) {
				toasts.delete(toast)
				if (toastsQueue.length > 0) {
					const lateToast = toastsQueue.shift()
					if (lateToast) {
						addToast(lateToast)
					}
				}
			}
		}
	})
	css/* css */`
	.toast-container{
		display: flex;
		gap: 1rem;
		flex-direction: column-reverse;
		z-index:1;
		padding: 1rem;
		align-items: flex-end;
	}
	.toast-icon{
		height: 1.5rem;
		aspect-ratio: 1;
		color:white;
		fill:white;
	}
	.toast{
		color: white;
		font-size: 1.5rem;
		padding: 0.5rem 1rem;
		background: var(--black-transparent);
		border-radius: 1rem;
		display: flex;
		gap: 1rem;
		place-items: center;
		transition: all 1s ease;
		width: fit-content;
	}
	.toast-enter-active,
	.toast-exit-active {
		transition: all 1s ease;
	}
	.toast-enter {
		transform: translateY(-100%);
	}
	.toast-exit-to {
		transform: translateY(100%);
		opacity: 0;
	}

	`

	return (
		<div class="toast-container">
			{/* @ts-expect-error wrong props */}
			<TransitionGroup name="toast" mode="outin">
				<For each={[...toasts]}>
					{(toast) => {
						return (
							<Switch>
								<Match when={toast.type === 'questStep' && toast}>
									{step => (
										<div class="toast">
											<div class="toast-icon" style={{ color: '#33cc33' }}><Check /></div>
											<OutlineText>{`Completed: ${step().description}`}</OutlineText>
										</div>
									)}
								</Match>
								<Match when={toast.type === 'quest' && toast}>
									{quest => (
										<div class="toast">
											<div class="toast-icon"><Exclamation /></div>
											<OutlineText>{`New Quest: ${quest().quest}`}</OutlineText>
										</div>
									)}
								</Match>
								<Match when={toast.type === 'removedItem' && toast}>
									{item => (
										<div class="toast">
											<img class="toast-icon" src={assets.items[item().item].img} />
											<OutlineText>{`Item removed: ${item().quantity} ${itemsData[item().item].name}`}</OutlineText>
										</div>
									)}
								</Match>
								<Match when={toast.type === 'addedItem' && toast}>
									{item => (
										<div class="toast">
											<img class="toast-icon" src={assets.items[item().item].img} />
											<OutlineText>{`Item added: ${item().quantity} ${itemsData[item().item].name}`}</OutlineText>
										</div>
									)}
								</Match>
								<Match when={'recipe' in toast && toast.recipe}>
									{item => (
										<div class="toast">
											<img class="toast-icon" src={assets.items[item()].img} />
											<div>
												<OutlineText>{`Recipe unlocked: ${itemsData[item()].name}`}</OutlineText>
											</div>
										</div>
									)}
								</Match>
							</Switch>
						)
					}}
				</For>
			</TransitionGroup>
		</div>
	)
}