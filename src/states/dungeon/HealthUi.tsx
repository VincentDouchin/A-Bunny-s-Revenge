import type { With } from 'miniplex'
import { createMemo, onCleanup } from 'solid-js'
import type { Entity } from '@/global/entity'
import { assets, coroutines, ui } from '@/global/init'
import { save } from '@/global/save'
import { thumbnailRenderer } from '@/lib/thumbnailRenderer'

export const HealthUi = (props: { player: With<Entity, 'maxHealth' | 'currentHealth'> }) => {
	const health = ui.sync(() => props.player.currentHealth / props.player.maxHealth.value)
	const max = ui.sync(() => Math.floor(props.player.maxHealth.value))
	const current = ui.sync(() => Math.floor(props.player.currentHealth))
	const healthDisplay = createMemo(() => `${current()} / ${max()}`)
	const acornRenderer = thumbnailRenderer(64)
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
	onCleanup(clear)
	return (

		<>
			<style jsx dynamic>
				{/* css */`
				#health-ui{
					position: fixed;
					top: 1rem;
					left: 1rem;
					display: grid;
					gap: 0.5rem;
				}
				#health-ui .wrapper{
					height: 4rem;
					width: calc(${max()}rem * 2); 
					border-radius: 1.5rem; 
					background: hsl(0,0%, 100%, 30%);
					overflow: hidden; 
					position: relative;
				}
				#health-ui .health-amount{
					height: 100%;
					width: ${health() * 100}%;
					box-shadow: hsl(0,0%,0%, 30%) 0rem -0.5rem 0rem 0rem inset;
					position:absolute;
					top:0;
					left:0;
					transition: width 0.5s ease-in;
				}
				#health-ui .front{
					background: red;
					z-index:1;
				}
				#health-ui .back{
					background: darkred;
					transition-delay: 0.3s
				}
				#health-ui .health-text{
					position: absolute;
					color: white;
					top: 50%;
					left: 50%;
					translate: -50% -50%;
					font-size: 2rem;
					white-space: nowrap;
					z-index: 1;
				}
				#health-ui .acorn {
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
				#health-ui .acorn canvas{
					width: 4rem;
					height: 4rem;
				}
				
			`}
			</style>
			<div id="health-ui">
				<div class="wrapper">
					<div class="health-amount front"></div>
					<div class="health-amount back"></div>
					<div class="health-text">{healthDisplay()}</div>
				</div>
				<div class="acorn">
					{element}
					{acorns()}
				</div>
			</div>
		</>

	)
}