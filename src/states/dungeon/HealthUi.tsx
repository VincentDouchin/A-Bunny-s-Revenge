import type { With } from 'miniplex'
import { Show, createMemo, onCleanup } from 'solid-js'
import { css } from 'solid-styled'
import type { Entity } from '@/global/entity'
import { assets, coroutines, ui } from '@/global/init'
import { save } from '@/global/save'
import { thumbnailRenderer } from '@/lib/thumbnailRenderer'

const acornRenderer = thumbnailRenderer(64)
export const HealthUi = (props: { player: With<Entity, 'maxHealth' | 'currentHealth'> }) => {
	const health = ui.sync(() => `${props.player.currentHealth / props.player.maxHealth.value * 100}%`)
	const max = ui.sync(() => Math.floor(props.player.maxHealth.value))
	const maxWidth = createMemo(() => `${max()}rem`)
	const current = ui.sync(() => Math.floor(props.player.currentHealth))
	const healthDisplay = createMemo(() => `${current()} / ${max()}`)
	onCleanup(() => {
		acornRenderer.dispose()
	})
	const model = assets.items.acorn.model.clone()
	model.rotateY(Math.PI / 2)
	const { element, setSpinAmount } = acornRenderer.spin(model)
	const acorns = ui.sync(() => save.acorns)
	const clear = coroutines.add(function*() {
		let oldAmount = save.acorns
		while (true) {
			yield
			setSpinAmount((spin) => {
				return Math.max(0, spin + 0.03 * (save.acorns - oldAmount) - 0.0005)
			})
			oldAmount = save.acorns
		}
	})
	const wateringCan = ui.sync(() => props.player.wateringCan)
	onCleanup(clear)
	css/* css */`
	.health-ui{
		position: fixed;
		top: 1rem;
		left: 1rem;
		display: grid;
		gap: 0.5rem;
	}
	.wrapper{
		height: 4rem;
		width: calc(${maxWidth()} * 2); 
		border-radius: 1.5rem; 
		background: hsl(0,0%, 100%, 30%);
		overflow: hidden; 
		position: relative;
	}
	.health-amount{
		height: 100%;
		width: ${health()};
		box-shadow: hsl(0,0%,0%, 30%) 0rem -0.5rem 0rem 0rem inset;
		position:absolute;
		top:0;
		left:0;
		transition: width 0.5s ease-in;
	}
	.front{
		background: red;
		z-index:1;
	}
	.back{
		background: darkred;
		transition-delay: 0.3s
	}
	.health-text{
		position: absolute;
		color: black;
		top: 50%;
		left: 50%;
		translate: -50% -50%;
		font-size: 2rem;
		white-space: nowrap;
		z-index: 1;
	}
	.acorn {
		padding:0.2rem;
		border-radius: 1.5rem; 
		background: hsl(0,0%, 100%, 30%);
		display:grid;
		width: fit-content;
		grid-template-columns: auto auto;
		place-items: center;
		gap:1rem;
		padding-right:1rem;
		font-size: 3rem;
	}
	.acorn canvas{
		width: 4rem;
		height: 4rem;
	}
	.watering-container{
		width:5rem;
		height: 5rem;
		background: hsl(0,0%, 100%, 30%);
		padding: 1rem;
		display: grid;
		place-items: center;
		border-radius: 100%;
		overflow:hidden;
		position: relative;
	}
	.watering{
		width: 90%;
		height: 90%;
		z-index:1;
	}
	.water-overlay{
		background: #36c5f4;
		position: absolute;
		left:0;
		right:0;
		height: var(--water);
		transition: height 1.5s ease;
		bottom:0;
	}
	`
	return (
		<div class="health-ui">
			<div class="wrapper">
				<div class="health-amount front"></div>
				<div class="health-amount back"></div>
				<div class="health-text">{healthDisplay()}</div>
			</div>
			<div class="acorn">
				{element}
				{acorns()}
			</div>
			<Show when={wateringCan()}>
				{
			(_) => {
				const waterAmount = ui.sync(() => props.player.wateringCan?.waterAmount)
				return (
					<div class="watering-container">
						<div class="watering" innerHTML={assets.icons['droplet-solid']} />
						<div class="water-overlay" style={{ '--water': `${(waterAmount() ?? 0) * 100}%` }}></div>
					</div>
				)
			}
}
			</Show>
		</div>
	)
}