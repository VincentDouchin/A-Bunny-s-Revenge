import { Show } from 'solid-js'
import { Modal } from './components/Modal'
import { ui } from '@/global/init'
import { pausedState } from '@/global/states'

export const PauseUI = () => {
	const paused = ui.sync(() => pausedState.enabled)
	return (
		<Modal open={paused()} showClose={false}>
			<Show when={paused()}>
				<div style={{ 'font-family': 'NanoPlus', 'color': 'white', 'font-size': '4rem' }}>Paused</div>
				<button onClick={() => pausedState.disable()}>Resume</button>
			</Show>
		</Modal>
	)
}