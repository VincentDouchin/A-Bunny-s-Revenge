import { assets } from '@/global/init'
import type { soundAssets, sounds } from '@/global/sounds'
import soundsData from '@assets/soundsData.json'
import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js'
import { css } from 'solid-styled'

import { localSoundData, setLocalSoundData } from '@/global/sounds'
import { app } from '@/global/states'
import { windowEvent } from '@/lib/uiManager'
import { entries } from '@/utils/mapFunctions'

export const SoundUi = () => {
	const [showSoundUi, setShowUi] = createSignal(false)
	onMount(() => {
		const listener = windowEvent('keydown', (e) => {
			if (e.key === 'F4') {
				setShowUi(x => !x)
			}
		})
		onCleanup(() => {
			listener()
		})
	})
	const [reactiveSoundData, setReactiveSoundData] = createSignal(localSoundData)
	createEffect(() => {
		setLocalSoundData(() => reactiveSoundData())
	})
	const download = () => {
		const blob = new Blob([JSON.stringify(localSoundData)], { type: 'application/json' })
		const a = document.createElement('a')
		a.download = 'soundsData.json'
		a.href = URL.createObjectURL(blob)
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
	}
	const reset = () => {
		setLocalSoundData(() => soundsData as sounds)
		setReactiveSoundData(localSoundData)
	}
	const soundAssets = ['music', 'ambiance', 'soundEffects'] as const satisfies readonly (keyof soundAssets)[]
	css/* css */`
	.sound-container{
		position: fixed;
		inset:0;
		z-index:10000;
		overflow-y:scroll;
	}
	.first-part{
		display: flex;
		gap:30px;
	}
	.part-container{
		background:hsl(0,0%,0%);
		margin:1rem 10rem;
		border-radius:1rem;
		padding:1rem;
	}
	.part-title{
		font-size:3rem;
		display: inline-block;
		margin-right: 20px;
	}
	.sound-search{
		display: inline-block;	
	}
	.part-list{
		margin-left:1rem;
		font-size: 20px;
		display: grid;
		grid-template-columns: 1fr 60px 100px 1fr;
		gap : 1rem;
	}
	.sound-part{
		display:contents;
	}
	.sound-part input{
		width: 100%
	}
	.sound-part:hover{
		color: grey;
	}

	`
	return (

		<Show when={showSoundUi()}>
			{(_) => {
				onMount(() => {
					app.enable('paused')
				})
				onCleanup(() => {
					app.disable('paused')
				})
				return (
					<div class="sound-container">
						<div class="part-container first-part">
							<button onClick={download}>download</button>
							<button onClick={reset}>reset</button>
							After any changes here a refresh will be necessary so that the volume is affected in game
						</div>
						<For each={soundAssets}>
							{(soundAsset) => {
								const [showPart, setShowPart] = createSignal(false)
								const [filter, setFilter] = createSignal('')
								const sounds = createMemo(() => (entries(assets[soundAsset]) as [string, Howl][]).filter(([k]) => !filter() || k.toLowerCase().includes(filter().toLowerCase())))
								return (
									<div class="part-container">
										<div class="part-title" onClick={() => setShowPart(x => !x)}>{soundAsset}</div>
										<input class="sound-search" placeholder="search sound" value={filter()} onChange={e => setFilter(e.target.value)}></input>

										<div class="part-list">
											<Show when={showPart()}>
												<For each={sounds()}>
													{([key, howl]) => {
														const updateVolume = (volume: number) => setReactiveSoundData((x) => {
															return { ...x, [soundAsset]: { ...x[soundAsset], [key]: { ...(x?.[soundAsset]?.[key] ?? {}), volume } } }
														})
														onMount(() => {
															if (!(key in (reactiveSoundData()[soundAsset] ?? []))) {
																updateVolume(50)
															}
														})
														const [isPlaying, setIsPlaying] = createSignal(false)
														const play = () => {
															if (isPlaying()) {
																howl.pause()
															} else {
																howl.volume(reactiveSoundData()?.[soundAsset]?.[key]?.volume ?? 1)
																howl.play()
																howl.once('end', () => {
																	setIsPlaying(false)
																})
															}
															setIsPlaying(x => !x)
														}

														return (
															<div class="sound-part">
																{key}
																<button onClick={play}>{isPlaying() ? 'pause' : 'play'}</button>
																<input
																	value={reactiveSoundData()?.[soundAsset]?.[key]?.volume ?? 1}
																	onChange={e => updateVolume(e.target.valueAsNumber)}
																	type="number"
																	min="0"
																	max="2"
																	step="0.01"
																>
																</input>
																<input
																	value={reactiveSoundData()[soundAsset]?.[key]?.volume ?? 1}
																	type="range"
																	min="0"
																	max="2"
																	step="0.01"
																	onChange={e => updateVolume(e.target.valueAsNumber)}
																>
																</input>
															</div>
														)
													}}
												</For>
											</Show>
										</div>
									</div>
								)
							}}
						</For>
						<For each={['steps', 'voices'] as const}>
							{(soundAsset) => {
								const keys = Object.keys(assets[soundAsset])
								const updateVolume = (e: Event) => {
									setReactiveSoundData(x => ({
										...x,
										[soundAsset]: {
											...x[soundAsset],
											...Object.keys(assets[soundAsset]).reduce((acc, v) => ({
												...acc,
												[v]: { volume: (e.target as HTMLInputElement).valueAsNumber },
											}), {}),

										},
									}))
								}
								return (
									<div class="part-container">
										<div class="part-title">{soundAsset}</div>
										<input
											value={reactiveSoundData()?.[soundAsset]?.[keys[0]]?.volume ?? 1}
											onChange={updateVolume}
											type="number"
											min="0"
											max="2"
											step="0.01"
										>
										</input>
										<input
											value={reactiveSoundData()?.[soundAsset]?.[keys[0]]?.volume ?? 1}
											type="range"
											min="0"
											max="2"
											step="0.01"
											onChange={updateVolume}
										>
										</input>
									</div>
								)
							}}
						</For>
					</div>
				)
			}}
		</Show>

	)
}