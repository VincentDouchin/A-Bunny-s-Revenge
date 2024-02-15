import { Show } from 'solid-js'
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
	return (
		<StateUi state={openMenuState}>
			<Show when={noPlayer()}>
				<div
					class="fade-in"
					style={{
						'height': 'fit-content',
						'place-self': 'center',
						'background': 'linear-gradient(0deg, transparent, hsl(0, 0%, 0%, 0.4) 20% 80%, transparent)',
						'width': '100%',
						'text-align': 'center',
						'font-size': '9rem',
						'color': 'red',
						'position': 'relative',
					}}
				>
					YOU DIED
					<button
						class="button"
						style={{ margin: 'auto', position: 'absolute', left: '50%', translate: '-50%' }}
						onClick={retry}
					>
						Retry
					</button>
				</div>
			</Show>
		</StateUi>
	)
}