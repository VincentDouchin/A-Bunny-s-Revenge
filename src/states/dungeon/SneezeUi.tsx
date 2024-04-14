import type { With } from 'miniplex'
import { Portal, Show } from 'solid-js/web'
import type { Entity } from '@/global/entity'
import { ui } from '@/global/init'

export const SneezeUi = ({ player }: { player: With<Entity, 'sneeze' | 'debuffsContainer'> }) => {
	const sneeze = ui.sync(() => player.sneeze.running())
	const sneezePercent = ui.sync(() => player.sneeze.percent())

	return (
		<>
			<style jsx>
				{/* css */`
				.debuff-container{
					width:5rem;
					height: 0.5rem;
					background: hsl(0,0%,0%,0.5);
					border-radius:1rem;
					overflow: hidden;
				}
				.debuff{
					height:100%;
					
				}`}

			</style>
			<Portal mount={player.debuffsContainer.element}>
				<Show when={sneeze()}>
					<div class="debuff-container">
						<div class="debuff" style={{ width: `${sneezePercent() * 100}%`, background: '#e8d282' }}></div>
					</div>
				</Show>
			</Portal>
		</>
	)
}