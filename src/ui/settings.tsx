import { Show, createMemo, createSignal } from 'solid-js'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { type MenuDir, menuItem } from './components/Menu'
import { OutlineText, SwitchButtons } from './components/styledComponents'
import { useGame } from './store'
import { isStandalone } from '@/states/game/FullscreenUi'
import { save, updateSave } from '@/global/save'
import { assets, ui } from '@/global/init'

// eslint-disable-next-line no-unused-expressions
menuItem

export const Settings = (props: { menu: MenuDir }) => {
	const [mute, setMute] = createSignal(save.settings.mute)
	const context = useGame()
	const inputs = createMemo(() => context?.player().menuInputs)
	// ! VOLUME
	const volumeSelected = atom(false)
	const muteSound = () => {
		setMute(x => !x)
		Howler.mute(mute())
		updateSave(s => s.settings.mute = mute())
	}
	const volume = atom(save.settings.volume)

	const setVolume = (volumeAmount: number) => {
		volume(volumeAmount)
		updateSave(s => s.settings.volume = volumeAmount)
		Howler.volume(volumeAmount / 100)
	}
	// ! FULLSCREEN
	const fullscreenSelected = atom(false)
	const toggleFullscreen = () => {
		updateSave(s => s.settings.fullscreen = !s.settings.fullscreen)
	}
	const fullscreen = ui.sync(() => Boolean(save.settings.fullscreen))
	// ! CONTROLS
	const controlsSelected = atom(false)
	const controls = atom(save.settings.controls)
	const setControls = (selectedControls: 'mouse' | 'keyboard') => {
		updateSave(s => s.settings.controls = selectedControls)
		controls(selectedControls)
	}
	css/* css */`
		.settings-container{
			display: grid;
			grid-template-columns: 1fr 2fr;
			color: white;
			font-size: 2rem;
			height: fit-content;
			align-items: center;
			gap: 1rem 2rem;
		}
		.volume{
			display: grid;
			grid-template-columns: auto 1fr 0.2fr;
			gap: 1rem;
			align-items:center;
		}
		.volume-icon{
			width: 2rem;
			height: 2rem;
			color: white
		}
		.selected{
			border-bottom: solid 0.2rem var(--gold);
		}
		.unselected{
			border-bottom: solid 0.2rem transparent;
		}

	`

	ui.updateSync(() => {
		if (volumeSelected()) {
			if (inputs()?.get('left').justPressed) {
				setVolume(Math.max(volume() - 5, 0))
			}
			if (inputs()?.get('right').justPressed) {
				setVolume(Math.min(volume() + 5, 100))
			}
		}
	})
	return (
		<div class="settings-container">
			<div
				use:menuItem={[props.menu, false, volumeSelected, ['left', 'right']]}
				class={volumeSelected() ? 'selected' : 'unselected'}
				onClick={muteSound}
			>
				<OutlineText>Volume</OutlineText>
			</div>
			<div class="volume">
				<div class="volume-icon" innerHTML={mute() ? assets.icons['volume-xmark-solid'] : assets.icons['volume-high-solid']} onClick={muteSound}></div>
				<input type="range" class="input-range" value={volume()} onChange={e => setVolume(e.target.valueAsNumber)}></input>
				<OutlineText>{String(volume())}</OutlineText>
			</div>
			<Show when={!isStandalone()}>

				<div
					use:menuItem={[props.menu, false, fullscreenSelected, ['left', 'right']]}
					class={fullscreenSelected() ? 'selected' : 'unselected'}
					onClick={toggleFullscreen}
				>
					<OutlineText>
						Auto fullscreen
					</OutlineText>
				</div>
				<input type="checkbox" checked={fullscreen()} onClick={toggleFullscreen}></input>
			</Show>
			<div
				use:menuItem={[props.menu, false, controlsSelected, ['left', 'right']]}
				class={controlsSelected() ? 'selected' : 'unselected'}
				onClick={() => setControls(controls() === 'keyboard' ? 'mouse' : 'keyboard')}
			>
				<OutlineText>Control Preference</OutlineText>

			</div>
			<SwitchButtons
				options={['mouse', 'keyboard']}
				value={controls}
				setValue={setControls}
			/>
		</div>
	)
}