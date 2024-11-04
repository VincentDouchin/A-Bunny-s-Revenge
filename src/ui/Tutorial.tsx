import { showTutorialEvent } from '@/global/events'
import { ui } from '@/global/init'
import { app } from '@/global/states'
import { onCleanup, onMount, Show } from 'solid-js'
import { css } from 'solid-styled'
import { Transition } from 'solid-transition-group'
import atom from 'solid-use/atom'
import { GoldContainer, OutlineText } from './components/styledComponents'
import { InputIcon } from './InputIcon'
import { useGame } from './store'
import { FarmingTutorial } from './tutorials/farming'
import { MovementTutorial } from './tutorials/movement'

export enum TutorialWindow {
	Movement = 'movement',
	Farming = 'farming',
}

export const TutorialUi = () => {
	const context = useGame()
	const showTurorial = atom<null | TutorialWindow>(null)
	onMount(() => {
		const unsub = showTutorialEvent.subscribe((e) => {
			showTurorial(e)
		})
		onCleanup(unsub)
	})
	css/* css */`
	.tutorial-container {
		margin:auto;
		width: 40%;
		
	}

	`
	return (
		<Transition name="slide">
			<Show when={showTurorial()}>
				{(tutorial) => {
					return (
						<Show when={context?.player()}>
							{(player) => {
								const close = () => {
									showTurorial(null)
								}

								ui.updateSync(() => {
									if (player().menuInputs.get('validate').justPressed) {
										close()
									}
								})
								onCleanup(() => {
									app.disable('cutscene')
								})
								return (
									<div class="tutorial-container">
										<GoldContainer>
											<Show when={tutorial() === TutorialWindow.Movement}>
												<MovementTutorial context={context} player={player} />
											</Show>
											<Show when={tutorial() === TutorialWindow.Farming}>
												<FarmingTutorial />
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