import VolumeOn from '@assets/icons/volume-high-solid.svg'
import VolumeOff from '@assets/icons/volume-xmark-solid.svg'
import { createEffect, For, Show } from 'solid-js'
import { css } from 'solid-styled'
import { settings, ui } from '@/global/init'
import { renderer } from '@/global/rendering'
import { setAllMuted } from '@/global/sounds'
import { isStandalone } from '@/states/game/FullscreenUi'
import { Menu } from './components/Menu'
import { CheckBox, InventoryTitle, OutlineText, SwitchButtons } from './components/styledComponents'

export const Settings = () => {
	const setShadows = (shadowsEnabled: boolean) => {
		settings.disableShadows = shadowsEnabled
		renderer.shadowMap.enabled = !shadowsEnabled
	}
	createEffect(() => {
		ui.setFontSize(settings.uiScale)
	})

	createEffect(() => {
		ui.setUiOpacity(settings.uiOpacity)
	})

	css/* css */`
		.settings-container{
			display: grid;
			grid-template-columns: 1fr 2fr;
			color: white;
			width: 50dvw;
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
		<>
			<InventoryTitle>Settings</InventoryTitle>
			<Menu>
				{MenuItem =>	(
					<div>
						<div class="settings-container">
							<For each={specificVolumes}>
								{([title, volumeName, muteName], index) => {
									const muteSound = async () => {
										settings[muteName] = !settings[muteName]
										if (title === 'Global Volume') {
											Howler.mute(settings[muteName])
											setAllMuted()
										}
									}
									const setVolume = (volumeAmount: number) => {
										settings[volumeName] = volumeAmount
										if (title === 'Global Volume') {
											Howler.volume(volumeAmount / 100)
										}
									}
									return (
										<>
											<MenuItem
												defaultSelected={index() === 0}
												onClick={muteSound}
												onLeft={() => settings[volumeName] = Math.max(settings[volumeName] - 5, 0)}
												onRight={() => settings[volumeName] = Math.min(settings[volumeName] + 5, 100)}
											>
												{({ selected }) => (
													<div
														class={selected() ? 'selected' : 'unselected'}
														onClick={muteSound}
													>
														<OutlineText>{title}</OutlineText>
													</div>
												)}
											</MenuItem>
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
								<MenuItem
									onClick={() => settings.fullscreen = !settings.fullscreen}
								>
									{({ selected }) => (
										<div class={selected() ? 'selected' : 'unselected'}>
											<OutlineText>Auto fullscreen</OutlineText>
										</div>
									)}
								</MenuItem>
								<CheckBox value={settings.fullscreen ?? false} onClick={() => settings.fullscreen = !settings.fullscreen}></CheckBox>
							</Show>
							<MenuItem
								onClick={() => settings.controls = (settings.controls === 'keyboard' ? 'mouse' : 'keyboard')}
							>
								{({ selected }) => (
									<div class={selected() ? 'selected' : 'unselected'}>
										<OutlineText>Control Preference</OutlineText>
									</div>
								)}
							</MenuItem>
							<SwitchButtons
								options={['mouse', 'keyboard']}
								value={settings.controls}
								setValue={controls => settings.controls = controls}
							/>
							<MenuItem
								onClick={() => settings.showControls = !settings.showControls}
							>
								{({ selected }) =>	(
									<div class={selected() ? 'selected' : 'unselected'}>
										<OutlineText>Display controls</OutlineText>
									</div>
								)}
							</MenuItem>
							<CheckBox value={settings.showControls} onClick={(show: boolean) => settings.showControls = show}></CheckBox>
							<MenuItem>
								{({ selected }) =>	(
									<div
										class={selected() ? 'selected' : 'unselected'}
										onClick={() => setShadows(!settings.disableShadows)}
									>
										<OutlineText>Shadows</OutlineText>
									</div>
								)}
							</MenuItem>
							<CheckBox value={settings.disableShadows} onClick={setShadows}></CheckBox>
							<MenuItem
								onClick={() => settings.lockCamera = !settings.lockCamera}
							>
								{({ selected }) => (
									<div class={selected() ? 'selected' : 'unselected'}>
										<OutlineText>Lock Camera to player</OutlineText>
									</div>
								)}
							</MenuItem>
							<CheckBox value={settings.lockCamera} onClick={locked => settings.lockCamera = locked}></CheckBox>
							<MenuItem
								onLeft={() => settings.uiScale = Math.max(settings.uiScale - 1, 2)}
								onRight={() => settings.uiScale = Math.min(settings.uiScale + 1, 15)}
							>
								{({ selected }) =>	(
									<div
										class={selected() ? 'selected' : 'unselected'}
									>
										<OutlineText>UI scale</OutlineText>
									</div>
								)}
							</MenuItem>
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
							<MenuItem
								onLeft={() => settings.uiOpacity = Math.max(settings.uiOpacity - 10, 0)}
								onRight={() => settings.uiOpacity = Math.min(settings.uiOpacity + 10, 100)}
							>
								{({ selected }) => (
									<div
										class={selected() ? 'selected' : 'unselected'}
									>
										<OutlineText>UI Opacity</OutlineText>
									</div>
								)}
							</MenuItem>
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
							<MenuItem
								onClick={() => settings.difficulty = settings.difficulty === 'easy' ? 'normal' : 'easy'}
							>
								{({ selected }) =>	(
									<div class={selected() ? 'selected' : 'unselected'}>
										<OutlineText>Difficulty</OutlineText>
									</div>
								)}
							</MenuItem>
							<SwitchButtons
								options={['easy', 'normal']}
								value={settings.difficulty}
								setValue={difficulty => settings.difficulty = difficulty}
							/>
						</div>
					</div>
				)}
			</Menu>
		</>
	)
}