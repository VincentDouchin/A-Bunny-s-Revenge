import { Show, createSignal } from 'solid-js'
import { Transition } from 'solid-transition-group'
import { save, updateSave } from '@/global/save'

const requestFullScreen = () => {
	document.documentElement.requestFullscreen()
}

export const FullscreenUi = () => {
	const [show, setShow] = createSignal(!window.matchMedia('(display-mode: standalone)').matches && (save.settings.fullscreen === null || save.settings.fullscreen === undefined))
	const enabledFullScreen = () => {
		requestFullScreen()
		updateSave(s => s.settings.fullscreen = true)
		setShow(false)
	}
	const disableFullScreen = () => {
		updateSave(s => s.settings.fullscreen = false)
		setShow(false)
	}
	return (
		<Transition name="slide-down">
			<Show when={show()}>
				<div style={{ 'width': '20rem', 'background': '#242424', 'border-radius': '1rem', 'position': 'fixed', 'top': 0, 'left': 0, 'color': 'white', 'z-index': 1, 'margin': '1rem', 'padding': '1rem', 'display': 'grid', 'justify-content': 'center', 'box-shadow': '0rem 0.5rem 0.5rem 0 hsl(0,0%,0%,50%)' }}>
					<div style={{ 'font-size': '2rem' }}>Enable fullscreen?</div>
					<div style={{ 'display': 'grid', 'gap': '1rem', 'grid-template-columns': '1fr 1fr', 'padding': '1rem' }}>
						<button class="button" onClick={enabledFullScreen}>Yes</button>
						<button class="button" onClick={disableFullScreen}>No</button>
					</div>
				</div>
			</Show>
		</Transition>
	)
}