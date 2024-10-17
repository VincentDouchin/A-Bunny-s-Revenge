import { ui } from '@/global/init'
import { pausedState } from '@/global/states'
import { createEffect, Show } from 'solid-js'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { Menu, menuItem } from './components/Menu'
import { Modal } from './components/Modal'
import { MovingArrows } from './components/MovingArrows'
import { GoldContainer, OutlineText } from './components/styledComponents'
import { Settings } from './settings'
import { useGame } from './store'

menuItem

export const PauseUi = () => {
	const paused = ui.sync(() => pausedState.enabled)
	const context = useGame()
	const settings = atom(false)
	createEffect(() => {
		!paused() && setTimeout(() => settings(paused()))
	})
	css/* css */`
	.container{
		display: grid;
		place-items: center;
	}
	.option{
		position: relative;
	}
	
	`
	return (
		<Show when={context?.player()}>
			{player => (
				<Modal open={paused()} showClose={false}>
					<Menu inputs={player().menuInputs}>
						{({ menu }) => {
							return (
								<>
									<Show when={!settings()}>
										{(_) => {
											const resumeSelected = atom(false)
											const settingsSelected = atom(false)
											return (

												<GoldContainer>
													<div class="container">
														<OutlineText textSize="4rem">Paused</OutlineText>
														<MovingArrows mount={menu.selectedRef} />
														<div>
															<div
																use:menuItem={[menu, true, resumeSelected]}
																onClick={() => pausedState.disable()}
																class="option"
															>
																<OutlineText
																	textSize="2rem"
																	color={resumeSelected() ? 'white' : 'var(--grey)'}
																>
																	Resume
																</OutlineText>
															</div>
															<div
																class="option"
																use:menuItem={[menu, false, settingsSelected]}
																onClick={() => settings(true)}
															>
																<OutlineText
																	color={settingsSelected() ? 'white' : 'var(--grey)'}
																	textSize="2rem"
																>
																	Settings
																</OutlineText>
															</div>
														</div>
														{/* <button class="styled" onClick={() => pausedState.disable()}>Resume</button> */}
													</div>
												</GoldContainer>

											)
										}}
									</Show>
									<Show when={settings()}>
										<GoldContainer>
											<Settings menu={menu}></Settings>
										</GoldContainer>
									</Show>
								</>
							)
						}}
					</Menu>

				</Modal>
			)}
		</Show>
	)
}