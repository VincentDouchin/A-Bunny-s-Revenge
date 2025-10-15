import { onCleanup, Show } from 'solid-js'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { gameInputs, menuInputs, ui } from '@/global/init'
import { app } from '@/global/states'
import { Menu, menuItem } from './components/Menu'
import { Modal } from './components/Modal'
import { MovingArrows } from './components/MovingArrows'
import { GoldContainer, OutlineText } from './components/styledComponents'
import { Settings } from './settings'
import { useGame } from './store'

menuItem

export const PauseUi = () => {
	const context = useGame()
	const settings = atom(false)
	ui.updateSync(() => {
		if (app.isDisabled('menu')) {
			if (gameInputs.get('pause').justPressed) {
				if (app.isDisabled('menu') && app.isDisabled('paused')) {
					app.enable('paused')
				} else {
					app.disable('paused')
				}
			}
			if (menuInputs.get('cancel').justPressed) {
				if (app.isEnabled('paused')) {
					app.disable('paused')
				}
			}
		}
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
		<Modal open={context?.isPauseState()} showClose={settings()}>
			<Menu inputs={menuInputs}>
				{({ menu }) => {
					onCleanup(() => {
						settings(false)
					})
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
														onClick={() => app.disable('paused')}
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
	)
}