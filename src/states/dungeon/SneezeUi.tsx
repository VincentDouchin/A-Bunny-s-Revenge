import type { ComponentsOfType } from '@/global/entity'
import type { Timer } from '@/lib/timer'
import { For, Portal, Show } from 'solid-js/web'
import { css } from 'solid-styled'
import { ui } from '@/global/init'
import { useGame } from '@/ui/store'

export const SneezeUi = () => {
	const context = useGame()!

	return (

		<Show when={context.player()}>
			{(player) => {
				const affect = [
					['sneeze', '#e8d282'],
					['poisoned', '#9DE64E'],
					['sleepy', '#CFE0ED'],
				] as const satisfies ReadonlyArray<readonly [ComponentsOfType<Timer<false>>, string]>
				css/* css */`
				.debuff-wrapper{
					display:grid;
					gap: 0.5rem;
				}
				.debuff-container{
					width:5rem;
					height: 0.5rem;
					background: hsl(0,0%,0%,0.5);
					border-radius:1rem;
					overflow: hidden;
				}
				.debuff{
					height:100%;
					
				}
				`
				return (
					<Portal mount={player().debuffsContainer.element}>
						<div class="debuff-wrapper">
							<For each={affect}>
								{([component, color]) => {
									const affected = ui.sync(() => player()[component].running())
									const sneezePercent = ui.sync(() => player()[component].percent())
									return (
										<Show when={affected()}>
											<div class="debuff-container">
												<div class="debuff" style={{ width: `${sneezePercent() * 100}%`, background: color }}></div>
											</div>
										</Show>
									)
								}}
							</For>
						</div>
					</Portal>
				)
			}}
		</Show>

	)
}