import { Show, onCleanup } from 'solid-js'
import { css } from 'solid-styled'
import { Transition } from 'solid-transition-group'
import { InputIcon } from './InputIcon'
import { GoldContainer, OutlineText } from './components/styledComponents'
import { useGame } from './store'
import { MovementTutorial } from './tutorials/movement'
import { FarmingTutorial } from './tutorials/farming'
import { cutSceneState } from '@/global/states'
import { ecs, ui } from '@/global/init'

export enum TutorialWindow {
	Movement,
	Farming,
}

export const TutorialUi = () => {
	const context = useGame()
	css/* css */`
	.tutorial-container {
		margin:auto;
		width: 40%;
		
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
												<MovementTutorial context={context} player={player} />
											</Show>
											<Show when={tutoEntity().tutorial === TutorialWindow.Farming}>
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