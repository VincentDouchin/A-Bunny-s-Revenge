import VolumeOn from '@assets/icons/volume-high-solid.svg'
import VolumeOff from '@assets/icons/volume-xmark-solid.svg'
import { For, Show, createEffect, createMemo, createSignal } from 'solid-js'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { type MenuDir, menuItem } from './components/Menu'
import { CheckBox, OutlineText, SwitchButtons } from './components/styledComponents'
import { useGame } from './store'
import { isStandalone } from '@/states/game/FullscreenUi'
import { setAllMuted } from '@/global/sounds'
import { save, updateSave } from '@/global/save'
import type { SaveData } from '@/global/save'
import { renderer } from '@/global/rendering'
import { ui } from '@/global/init'
// eslint-disable-next-line no-unused-expressions
menuItem

export const Settings = (props: { menu: MenuDir }) => {
	const context = useGame()
	const inputs = createMemo(() => context?.player().menuInputs)
	// ! VOLUME

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
	// ! SHOW CONTROLS
	const showControlsSelected = atom(false)
	const showControls = atom(save.settings.showControls)
	const setShowControl = (show: boolean) => {
		updateSave(s => s.settings.showControls = show)
		showControls(show)
	}
	// ! SHADOWS
	const shadowsSelected = atom(false)
	const shadows = atom(!save.settings.disableShadows)
	const setShadows = (shadowsEnabled: boolean) => {
		shadows(shadowsEnabled)
		updateSave(s => s.settings.disableShadows = !shadowsEnabled)
		renderer.shadowMap.enabled = shadowsEnabled
	}
	// ! LOCK CAMERA
	const lockCameraSelected = atom(false)
	const lockCamera = atom(save.settings.lockCamera)
	const setLockCamera = (locked: boolean) => {
		lockCamera(locked)
		updateSave(s => s.settings.lockCamera = locked)
	}
	// ! UI SCALE
	const uiScaleSelected = atom(false)
	const uiScale = atom(save.settings.uiScale ?? 10)
	const setUiScale = async (scale: number) => {
		uiScale(scale)
		await updateSave(s => s.settings.uiScale = scale)
		ui.setFontSize()
	}
	ui.updateSync(() => {
		if (uiScaleSelected()) {
			if (inputs()?.get('left').justPressed) {
				setUiScale(Math.max(uiScale() - 1, 2))
			}
			if (inputs()?.get('right').justPressed) {
				setUiScale(Math.min(uiScale() + 1, 15))
			}
		}
	})
	// ! UI OPACITY
	const uiOpacitySelected = atom(false)
	const uiOpacity = atom(save.settings.uiOpacity ?? 10)
	const setUiOpacity = async (scale: number) => {
		uiOpacity(scale)
		await updateSave(s => s.settings.uiOpacity = scale)
		ui.setUiOpacity()
	}
	ui.updateSync(() => {
		if (uiOpacitySelected()) {
			if (inputs()?.get('left').justPressed) {
				setUiOpacity(Math.max(uiOpacity() - 10, 0))
			}
			if (inputs()?.get('right').justPressed) {
				setUiOpacity(Math.min(uiOpacity() + 10, 100))
			}
		}
	})
	// ! DIFFICULTY
	const difficultySelected = atom(false)
	const difficulty = atom<'normal' | 'easy'>(save.settings.difficulty ?? 'normal')
	createEffect(() => {
		updateSave(s => s.settings.difficulty = difficulty())
	})
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
	] as const satisfies ReadonlyArray<readonly [string, keyof SaveData['settings'], keyof SaveData['settings'] ]>
	return (
		<div class="settings-container">

			<For each={specificVolumes}>
				{([title, volumeName, muteName]) => {
					const selected = atom(false)
					const volume = atom(save.settings[volumeName])
					const [mute, setMute] = createSignal(save.settings[muteName])
					const muteSound = async () => {
						setMute(x => !x)
						Howler.mute(mute())
						await updateSave(s => s.settings[muteName] = mute())
						setAllMuted()
					}

					const setVolume = (volumeAmount: number) => {
						volume(volumeAmount)
						updateSave(s => s.settings[volumeName] = volumeAmount)
						Howler.volume(volumeAmount / 100)
					}
					ui.updateSync(() => {
						if (selected()) {
							if (inputs()?.get('left').justPressed) {
								setVolume(Math.max(volume() - 5, 0))
							}
							if (inputs()?.get('right').justPressed) {
								setVolume(Math.min(volume() + 5, 100))
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
									{mute() && <VolumeOff />}
									{!mute() && <VolumeOn />}
								</div>
								<input type="range" class="input-range" value={volume()} onChange={e => setVolume(e.target.valueAsNumber)}></input>
								<OutlineText>{String(volume())}</OutlineText>
							</div>
						</>
					)
				}}
			</For>
			<Show when={!isStandalone()}>

				<div
					use:menuItem={[props.menu, false, fullscreenSelected, () => ['left', 'right'], true]}
					class={fullscreenSelected() ? 'selected' : 'unselected'}
					onClick={toggleFullscreen}
				>
					<OutlineText>Auto fullscreen</OutlineText>
				</div>
				<CheckBox value={fullscreen} onClick={toggleFullscreen}></CheckBox>
			</Show>
			<div
				use:menuItem={[props.menu, false, controlsSelected, () => ['left', 'right'], true]}
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
			<div
				use:menuItem={[props.menu, false, showControlsSelected, () => ['left', 'right'], true]}
				class={showControlsSelected() ? 'selected' : 'unselected'}
				onClick={() => setShowControl(!showControls())}
			>
				<OutlineText>Display controls</OutlineText>
			</div>
			<CheckBox value={showControls} onClick={setShowControl}></CheckBox>
			<div
				use:menuItem={[props.menu, false, shadowsSelected, () => ['left', 'right'], true]}
				class={shadowsSelected() ? 'selected' : 'unselected'}
				onClick={() => setShadows(!shadows())}
			>
				<OutlineText>Shadows</OutlineText>
			</div>
			<CheckBox value={shadows} onClick={setShadows}></CheckBox>
			<div
				use:menuItem={[props.menu, false, lockCameraSelected, () => ['left', 'right'], true]}
				class={lockCameraSelected() ? 'selected' : 'unselected'}
				onClick={() => setLockCamera(!lockCamera())}
			>
				<OutlineText>Lock Camera to player</OutlineText>
			</div>
			<CheckBox value={lockCamera} onClick={setLockCamera}></CheckBox>
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
					value={uiScale()}
					min="2"
					max="15"
					onChange={e => setUiScale(e.target.valueAsNumber)}
				>
				</input>
				<OutlineText>{String(Math.min(uiScale() / 10))}</OutlineText>
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
					value={uiOpacity()}
					min="0"
					step={10}
					max="100"
					onChange={e => setUiOpacity(e.target.valueAsNumber)}
				>
				</input>
				<OutlineText>{String(uiOpacity())}</OutlineText>
			</div>
			<div
				use:menuItem={[props.menu, false, difficultySelected, () => ['left', 'right'], true]}
				class={difficultySelected() ? 'selected' : 'unselected'}
				onClick={() => difficulty(difficulty() === 'easy' ? 'normal' : 'easy')}
			>
				<OutlineText>Difficulty</OutlineText>
			</div>
			<SwitchButtons
				options={['easy', 'normal']}
				value={difficulty}
				setValue={difficulty}
			/>
		</div>
	)
}