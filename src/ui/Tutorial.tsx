import { For, Show, onCleanup } from 'solid-js'
import { css } from 'solid-styled'
import { Transition } from 'solid-transition-group'
import { InputIcon } from './InputIcon'
import { GoldContainer, OutlineText, SwitchButtons } from './components/styledComponents'
import { useGame } from './store'
import { cutSceneState } from '@/global/states'
import { playerInputMap } from '@/global/inputMaps'
import { ecs, settings, ui } from '@/global/init'

export enum TutorialWindow {
	Movement,
}

export const TutorialUi = () => {
	const context = useGame()
	css/* css */`
	.tutorial-container {
		margin:auto;
		width: 40%;
		
	}
	.tuto-input-icon{
		font-size:5rem
	}
	.gamepad-controls{
		display:grid;
		grid-template-columns: 1fr 2fr;
		gap: 3rem;
	}
	.control-method{
		
		text-align:center;
		display: grid;
		gap: 1rem;
		place-items:center;
	}
	.controls{
		font-size: 2rem;
		width: 100%;
	}
	.keys{
		display: flex;
		gap:1rem;
	}
	.dpad{
		display:grid;
		grid-template-areas: ". forward ." "left backward right "
	}
	`
	return (
		<Transition name="slide">
			<Show when={context?.tuto()}>
				{(tutoEntity) => {
					return (
						<Show when={context?.player()}>
							{(player) => {
								const close = () => {
									ecs.remove(tutoEntity())
								}

								ui.updateSync(() => {
									if (player().menuInputs.get('validate').justPressed) {
										close()
									}
								})
								onCleanup(() => {
									cutSceneState.disable()
								})
								return (
									<div class="tutorial-container">
										<GoldContainer>
											<Show when={tutoEntity().tutorial === TutorialWindow.Movement}>
												{(_) => {
													const inputMap = playerInputMap()
													return (
														<div>
															<Show when={context?.usingGamepad()}>
																<div class="gamepad-controls">
																	<div class="tuto-input-icon">
																		<InputIcon input={inputMap.playerControls.get('forward')} />
																	</div>
																	<OutlineText textSize="2rem">Use the left joystick to move around</OutlineText>
																</div>
															</Show>
															<Show when={context?.usingKeyboard()}>
																<div class="control-method">
																	<OutlineText textSize="2rem">Do you prefer using the mouse or the keyboard to direct the player?</OutlineText>
																	<div class="controls">
																		<SwitchButtons options={['keyboard', 'mouse']} value={settings.controls} setValue={val => settings.controls = val} />
																	</div>
																	<OutlineText textSize="1.5rem">You can change this option in the settings later</OutlineText>
																	<br />
																	<div class="gamepad-controls">

																		<div class="dpad">
																			<For each={['right', 'left', 'forward', 'backward'] as const}>
																				{dir => <div style={{ 'grid-area': dir }}><InputIcon size={3} input={player().playerControls.get(dir)} /></div>}
																			</For>
																		</div>
																		<OutlineText textSize="2rem">Use the keys to move the player.</OutlineText>
																	</div>
																	<br />
																</div>
															</Show>
														</div>
													)
												}}
											</Show>
											<button class="styled" onClick={close}>
												<InputIcon input={player().menuInputs.get('validate')} />
												<OutlineText>Continue</OutlineText>
											</button>
										</GoldContainer>
									</div>
								)
							}}
						</Show>
					)
				}}
			</Show>
		</Transition>
	)
}