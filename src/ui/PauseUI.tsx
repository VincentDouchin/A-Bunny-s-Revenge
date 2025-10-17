import { onCleanup, Show } from 'solid-js'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { gameInputs, menuInputs, ui } from '@/global/init'
import { app } from '@/global/states'
import { Menu } from './components/Menu'
import { Modal } from './components/Modal'
import { GoldContainer, OutlineText } from './components/styledComponents'
import { Settings } from './settings'
import { useGame } from './store'

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
			<GoldContainer>
				<Show when={!settings()}>
					<div class="container">
						<OutlineText textSize="4rem">Paused</OutlineText>
						<Menu showArrow={true}>
							{MenuItem => (
								<>
									<MenuItem defaultSelected={true} onClick={() => app.disable('paused')}>
										{({ selected }) =>	(
											<OutlineText textSize="2rem" color={selected() ? 'white' : 'var(--grey)'}>
												Resume
											</OutlineText>
										)}
									</MenuItem>
									<MenuItem onClick={() => settings(true)}>
										{({ selected }) =>	(
											<OutlineText textSize="2rem" color={selected() ? 'white' : 'var(--grey)'}>
												Settings
											</OutlineText>
										)}
									</MenuItem>
								</>
							)}
						</Menu>
					</div>
				</Show>
				<Show when={settings()}>
					{(_) => {
						onCleanup(() => settings(false))
						return <Settings></Settings>
					}}
				</Show>
			</GoldContainer>
		</Modal>
	)
}