import { Show, createSignal } from 'solid-js'
import volumeOn from '@assets/icons/volume-high-solid.svg?raw'
import volumeOff from '@assets/icons/volume-xmark-solid.svg?raw'
import { Destination } from 'tone'
import { Modal } from './components/Modal'
import { ui } from '@/global/init'
import { pausedState } from '@/global/states'
import { save, updateSave } from '@/global/save'

export const PauseUI = () => {
	const paused = ui.sync(() => pausedState.enabled)
	const [mute, setMute] = createSignal(save.settings.mute)
	const muteSound = () => {
		setMute(x => !x)
		Destination.mute = mute()
	}
	const setVolume = (volume: number) => {
		updateSave(s => s.settings.volume = volume)
		Destination.volume.value = volume / 100
	}
	return (
		<Modal open={paused()} showClose={false}>
			<Show when={paused()}>
				<div style={{ 'color': 'white', 'font-size': '4rem', 'text-align': 'center' }}>Paused</div>
				<div>
					<div style={{ 'text-align': 'center', 'font-size': '2rem', 'color': 'white' }}>Volume</div>
					<div style={{ 'display': 'grid', 'grid-template-columns': 'auto 1fr', 'gap': '1rem' }}>
						<div style={{ width: '2rem', height: '2rem', color: 'white' }} innerHTML={mute() ? volumeOff : volumeOn} onClick={muteSound}></div>
						<input type="range" class="input-range" value={save.settings.volume} onChange={e => setVolume(e.target.valueAsNumber)}></input>
					</div>
				</div>
				<button class="button" onClick={() => pausedState.disable()}>Resume</button>
			</Show>
		</Modal>
	)
}