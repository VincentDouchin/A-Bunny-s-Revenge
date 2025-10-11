import type { With } from 'miniplex'
import type { Entity } from '@/global/entity'
import { onMount, Show } from 'solid-js'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { gameOverEvent } from '@/global/events'
import { ecs, save, ui } from '@/global/init'
import { menuInputMap } from '@/global/inputMaps'
import { playSound } from '@/global/sounds'
import { app } from '@/global/states'
import { inMap } from '@/lib/hierarchy'
import { InputIcon } from '@/ui/InputIcon'
import { useGame } from '@/ui/store'

export const LoseUi = () => {
	const gameOver = atom(false)
	onMount(() => {
		gameOverEvent.subscribe(gameOver)
	})
	const retry = () => {
		app.disable('menu')
		app.enable('farm', { door: 'clearing' })
		save.modifiers = []
		gameOver(false)
	}

	css/* css */`
	.losing{
		height: fit-content;
		place-self: center;
		background: linear-gradient(0deg, transparent, hsla(0, 0%, 0%, 0.4) 20% 80%, transparent);
		width: 100%;
		text-align: center;
		font-size: 9rem;
		color: red;
		position: relative;

	}
	.losing-button{
		margin: auto;
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 1rem;
}
	`
	return (
		<Show when={gameOver()}>
			{(_) =>	{
				const context = useGame()
				const controls = atom<null | With<Entity, 'menuInputs'>>(null)
				onMount(() => {
					playSound('losing_musical')
					controls(ecs.add({
						...menuInputMap(),
						...inMap(),
					}))
				})
				ui.updateSync(() => {
					if (controls()?.menuInputs.get('validate').justPressed) {
						retry()
					}
				})
				return (
					<div
						class="fade-in losing"
					>
						YOU DIED
						<button
							class="button losing-button"
							onClick={retry}
						>
							<Show when={!context?.usingTouch() && controls()}>
								{controls => <InputIcon input={controls().menuInputs.get('validate')} />}
							</Show>
							{' '}
							Retry
						</button>
					</div>
				) }}
		</Show>
	)
}