import VolumeOn from '@assets/icons/volume-high-solid.svg'
import VolumeOff from '@assets/icons/volume-xmark-solid.svg'
import { For, Show, createEffect, createMemo } from 'solid-js'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { type MenuDir, menuItem } from './components/Menu'
import { CheckBox, OutlineText, SwitchButtons } from './components/styledComponents'
import { useGame } from './store'
import { isStandalone } from '@/states/game/FullscreenUi'
import { setAllMuted } from '@/global/sounds'
import { renderer } from '@/global/rendering'
import { settings, ui } from '@/global/init'
// eslint-disable-next-line no-unused-expressions
menuItem

export const Settings = (props: { menu: MenuDir }) => {
	const context = useGame()
	const inputs = createMemo(() => context?.player().menuInputs)
	// ! FULLSCREEN
	const fullscreenSelected = atom(false)
	// ! CONTROLS
	const controlsSelected = atom(false)
	// ! SHOW CONTROLS
	const showControlsSelected = atom(false)
	// ! SHADOWS
	const shadowsSelected = atom(false)
	const setShadows = (shadowsEnabled: boolean) => {
		settings.disableShadows = shadowsEnabled
		renderer.shadowMap.enabled = !shadowsEnabled
	}
	// ! LOCK CAMERA
	const lockCameraSelected = atom(false)
	// ! UI SCALE
	const uiScaleSelected = atom(false)
	createEffect(() => {
		ui.setFontSize(settings.uiScale)
	})
	ui.updateSync(() => {
		if (uiScaleSelected()) {
			if (inputs()?.get('left').justPressed) {
				settings.uiScale = Math.max(settings.uiScale - 1, 2)
			}
			if (inputs()?.get('right').justPressed) {
				settings.uiScale = Math.min(settings.uiScale + 1, 15)
			}
		}
	})
	// ! UI OPACITY
	const uiOpacitySelected = atom(false)
	createEffect(() => {
		ui.setUiOpacity(settings.uiOpacity)
	})
	ui.updateSync(() => {
		if (uiOpacitySelected()) {
			if (inputs()?.get('left').justPressed) {
				settings.uiOpacity = Math.max(settings.uiOpacity - 10, 0)
			}
			if (inputs()?.get('right').justPressed) {
				settings.uiOpacity = Math.min(settings.uiOpacity + 10, 100)
			}
		}
	})
	// ! DIFFICULTY
	const difficultySelected = atom(false)

	css/* css */`
		.settings-container{
			display: grid;
			grid-template-columns: 1fr 2fr;
			color: white;
			font-size: 2rem;
			height: fit-content;
			align-items: center;
			gap: 0.5rem 2rem;
			overflow-y:scroll;
			height: 100%;
			scroll-behavior: smooth;
    		scrollbar-width: none;
		}
		.volume{
			display: grid;
			grid-template-columns: auto 1fr 0.2fr;
			gap: 1rem;
			align-items:center;
			fill:white;
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
		.range-input-container{
			display: grid;
			grid-template-columns: 1fr 5rem;
			gap: 2rem;
			width: 100%;
		}


	`
	const specificVolumes = [
		['Global Volume', 'volume', 'mute'],
		['Music', 'musicVolume', 'musicMute'],
		['Ambiance', 'ambianceVolume', 'ambianceMute'],
		['Sound Effects', 'soundEffectsVolume', 'soundEffectsMute'],
	] as const satisfies ReadonlyArray<readonly [string, keyof typeof settings, keyof typeof settings ]>
	return (
		<div class="settings-container">

			<For each={specificVolumes}>
				{([title, volumeName, muteName]) => {
					const selected = atom(false)
					const muteSound = async () => {
						settings[muteName] = !settings[muteName]

						Howler.mute(settings[muteName])
						setAllMuted()
					}

					const setVolume = (volumeAmount: number) => {
						settings[volumeName] = volumeAmount
						Howler.volume(volumeAmount / 100)
					}
					ui.updateSync(() => {
						if (selected()) {
							if (inputs()?.get('left').justPressed) {
								settings[volumeName] = Math.max(settings[volumeName] - 5, 0)
							}
							if (inputs()?.get('right').justPressed) {
								settings[volumeName] = Math.min(settings[volumeName] + 5, 100)
							}
						}
					})

					return (
						<>
							<div
								use:menuItem={[props.menu, title === 'Global Volume', selected, () => ['left', 'right'], true]}
								class={selected() ? 'selected' : 'unselected'}
								onClick={muteSound}
							>
								<OutlineText>{title}</OutlineText>
							</div>
							<div class="volume">
								<div onClick={muteSound}>
									{settings[muteName] && <VolumeOff />}
									{!settings[muteName] && <VolumeOn />}
								</div>
								<input type="range" class="input-range" value={settings[volumeName]} onChange={e => setVolume(e.target.valueAsNumber)}></input>
								<OutlineText>{String(settings[volumeName])}</OutlineText>
							</div>
						</>
					)
				}}
			</For>
			<Show when={!isStandalone()}>

				<div
					use:menuItem={[props.menu, false, fullscreenSelected, () => ['left', 'right'], true]}
					class={fullscreenSelected() ? 'selected' : 'unselected'}
					onClick={() => settings.fullscreen = !settings.fullscreen}
				>
					<OutlineText>Auto fullscreen</OutlineText>
				</div>
				<CheckBox value={settings.fullscreen ?? false} onClick={() => settings.fullscreen = !settings.fullscreen}></CheckBox>
			</Show>
			<div
				use:menuItem={[props.menu, false, controlsSelected, () => ['left', 'right'], true]}
				class={controlsSelected() ? 'selected' : 'unselected'}
				onClick={() => settings.controls = (settings.controls === 'keyboard' ? 'mouse' : 'keyboard')}
			>
				<OutlineText>Control Preference</OutlineText>

			</div>
			<SwitchButtons
				options={['mouse', 'keyboard']}
				value={settings.controls}
				setValue={controls => settings.controls = controls}
			/>
			<div
				use:menuItem={[props.menu, false, showControlsSelected, () => ['left', 'right'], true]}
				class={showControlsSelected() ? 'selected' : 'unselected'}
				onClick={() => settings.showControls = !settings.showControls}
			>
				<OutlineText>Display controls</OutlineText>
			</div>
			<CheckBox value={settings.showControls} onClick={(show: boolean) => settings.showControls = show}></CheckBox>
			<div
				use:menuItem={[props.menu, false, shadowsSelected, () => ['left', 'right'], true]}
				class={shadowsSelected() ? 'selected' : 'unselected'}
				onClick={() => setShadows(!settings.disableShadows)}
			>
				<OutlineText>Shadows</OutlineText>
			</div>
			<CheckBox value={settings.disableShadows} onClick={setShadows}></CheckBox>
			<div
				use:menuItem={[props.menu, false, lockCameraSelected, () => ['left', 'right'], true]}
				class={lockCameraSelected() ? 'selected' : 'unselected'}
				onClick={() => settings.lockCamera = !settings.lockCamera}
			>
				<OutlineText>Lock Camera to player</OutlineText>
			</div>
			<CheckBox value={settings.lockCamera} onClick={locked => settings.lockCamera = locked}></CheckBox>
			<div
				use:menuItem={[props.menu, false, uiScaleSelected, () => ['left', 'right'], true]}
				class={uiScaleSelected() ? 'selected' : 'unselected'}
			>
				<OutlineText>UI scale</OutlineText>
			</div>
			<div class="range-input-container">
				<input
					type="range"
					class="input-range"
					value={settings.uiScale}
					min="2"
					max="15"
					onChange={e => settings.uiScale = e.target.valueAsNumber}
				>
				</input>
				<OutlineText>{String(Math.min(settings.uiScale / 10))}</OutlineText>
			</div>
			<div
				use:menuItem={[props.menu, false, uiOpacitySelected, () => ['left', 'right'], true]}
				class={uiOpacitySelected() ? 'selected' : 'unselected'}
			>
				<OutlineText>UI Opacity</OutlineText>
			</div>
			<div class="range-input-container">
				<input
					type="range"
					class="input-range"
					value={settings.uiOpacity}
					min="0"
					step={10}
					max="100"
					onChange={e => settings.uiOpacity = e.target.valueAsNumber}
				>
				</input>
				<OutlineText>{String(settings.uiOpacity)}</OutlineText>
			</div>
			<div
				use:menuItem={[props.menu, false, difficultySelected, () => ['left', 'right'], true]}
				class={difficultySelected() ? 'selected' : 'unselected'}
				onClick={() => settings.difficulty = settings.difficulty === 'easy' ? 'normal' : 'easy'}
			>
				<OutlineText>Difficulty</OutlineText>
			</div>
			<SwitchButtons
				options={['easy', 'normal']}
				value={settings.difficulty}
				setValue={difficulty => settings.difficulty = difficulty}
			/>
		</div>
	)
}