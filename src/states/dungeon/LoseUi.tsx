import { Show } from 'solid-js'
import { css } from 'solid-styled'
import { ecs, ui } from '@/global/init'
import { campState, openMenuState } from '@/global/states'
import { StateUi } from '@/ui/components/StateUi'

const playerUi = ecs.with('player')
export const LoseUi = () => {
	const noPlayer = ui.sync(() => playerUi.size === 0)
	const retry = () => {
		openMenuState.disable()
		campState.enable({})
	}
	css/* css */`
	.losing{
		height: fit-content;
		place-self: center;
		background: linear-gradient(0deg, transparent, hsla(0, 0%, 0%, 0.4) 20% 80%, transparent);
		width: 100%;
		text-align: center;
		font-size: 9rem;
		color: red;
		position: relative;
	}
	.losing-button{
		margin: auto;
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
}
	`
	return (
		<StateUi state={openMenuState}>
			<Show when={noPlayer()}>
				<div
					class="fade-in losing"
				>
					YOU DIED
					<button
						class="button losing-button"
						onClick={retry}
					>
						Retry
					</button>
				</div>
			</Show>
		</StateUi>
	)
}