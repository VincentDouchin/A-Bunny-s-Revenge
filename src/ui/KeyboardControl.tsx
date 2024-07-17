import { Show, onMount } from 'solid-js'
import { css } from 'solid-styled'
import { Transition } from 'solid-transition-group'
import atom from 'solid-use/atom'
import { InputIcon } from './InputIcon'
import { getInteractables } from './Interactions'
import { StateUi } from './components/StateUi'
import { OutlineText } from './components/styledComponents'
import { useGame } from './store'
import { campState, dungeonState } from '@/global/states'
import { settings, ui } from '@/global/init'

export const KeyboardControls = () => {
	const context = useGame()
	return (
		<Show when={!context?.usingTouch() && context?.player()}>
			{(player) => {
				const interactables = getInteractables(player())
				const context = useGame()
				css/* css */`
				.controls-container{
					position: fixed;
					bottom:0;
					left: 0;
					margin: 1rem;
					border-radius: 1rem;
					overflow: hidden;
					padding: 1rem;
					gap:1rem;
					background:var(--black-transparent);
				}
				.keyboard-controls{
					font-size:1.5rem;
					display:flex;
					gap:0.5rem;
					color: white;	
				}
				.controls-icons{
					display: flex;
					gap:0.2rem;
				}
				`
				const farm = ui.sync(() => campState.enabled)
				const visible = atom(false)
				onMount(() => setTimeout(() => visible(true), 100))
				const showControls = ui.sync(() => settings.showControls)
				return (
					<Transition name="traverse-up">
						<Show when={showControls() && visible()}>
							<div class="controls-container">
								<div class="keyboard-controls">
									<div class="controls-icons">
										<InputIcon input={player().playerControls.get('forward')}></InputIcon>
										<Show when={context?.usingKeyboard()}>
											<InputIcon input={player().playerControls.get('left')}></InputIcon>
											<InputIcon input={player().playerControls.get('backward')}></InputIcon>
											<InputIcon input={player().playerControls.get('right')}></InputIcon>
										</Show>
									</div>
									<OutlineText>Move</OutlineText>
								</div>
								<div class="keyboard-controls">
									<div class="controls-icons">
										<InputIcon input={player().playerControls.get('pause')}></InputIcon>
									</div>
									<OutlineText>Pause</OutlineText>
								</div>
								<Show when={farm()}>
									<div class="keyboard-controls">
										<div class="controls-icons">
											<InputIcon input={player().playerControls.get('inventory')}></InputIcon>
										</div>
										<OutlineText>Inventory</OutlineText>
									</div>
								</Show>
								<StateUi state={dungeonState}>
									<div class="keyboard-controls">
										<div class="controls-icons">
											<InputIcon input={player().playerControls.get('lock')}></InputIcon>
										</div>
										<OutlineText>Lock on</OutlineText>
									</div>
								</StateUi>
								<Show when={interactables[0]}>
									{(interactable) => {
										return (
											<div class="keyboard-controls">
												<InputIcon input={player().playerControls.get('primary')}></InputIcon>
												<OutlineText>{interactable().text}</OutlineText>

											</div>
										)
									}}
								</Show>
								<Show when={interactables[1]}>
									{(interactable) => {
										return (
											<div class="keyboard-controls">
												<InputIcon input={player().playerControls.get('secondary')}></InputIcon>
												<OutlineText>{interactable().text}</OutlineText>

											</div>
										)
									}}
								</Show>
							</div>
						</Show>
					</Transition>
				)
			}}
		</Show>
	)
}