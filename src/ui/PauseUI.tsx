import { Show } from 'solid-js'
import { css } from 'solid-styled'
import { Modal } from './components/Modal'
import { GoldContainer, OutlineText } from './components/styledComponents'
import { pausedState } from '@/global/states'
import { ui } from '@/global/init'

export const PauseUi = () => {
	const paused = ui.sync(() => pausedState.enabled)

	css/* css */`
	.container{
		display: grid;
		place-items:center;
	}
	`
	return (
		<Modal open={paused()} showClose={false}>
			<Show when={paused()}>
				<GoldContainer>
					<div class="container">
						<div style={{ 'color': 'white', 'font-size': '4rem', 'text-align': 'center' }}>
							<OutlineText>Paused</OutlineText>
						</div>

						<button class="button" onClick={() => pausedState.disable()}>Resume</button>
					</div>
				</GoldContainer>
			</Show>
		</Modal>
	)
}