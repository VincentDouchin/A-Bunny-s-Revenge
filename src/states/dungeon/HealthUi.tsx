import Drop from '@assets/icons/droplet-solid.svg'
import type { Accessor } from 'solid-js'
import { For, Show, createEffect, createMemo, onCleanup, onMount } from 'solid-js'
import { css } from 'solid-styled'
import { Transition } from 'solid-transition-group'
import atom from 'solid-use/atom'
import { cauldronQuery } from '../farm/CauldronMinigameUi'
import { ovenQuery } from '../farm/OvenMinigameUi'
import { range } from '@/utils/mapFunctions'
import { useGame } from '@/ui/store'
import { OutlineText } from '@/ui/components/styledComponents'
import { thumbnailRenderer } from '@/lib/thumbnailRenderer'
import { assets, coroutines, save, ui } from '@/global/init'
import { itemsData } from '@/constants/items'

export const MealAmount = (props: { amount: Accessor<number>, size?: 'small' | 'big', extra?: Accessor<number> }) => {
	const small = (props.size ?? 'big') === 'small'
	const reset = atom(true)
	// ! sync animation
	createEffect((prev) => {
		const extra = props.extra ? props.extra() : 0
		if (prev !== extra) {
			reset(false)
			setTimeout(() => reset(true), 10)
		}
		return extra
	}, (props.extra ? props.extra() : 0))
	css/* css */`
	.meal-container{
		display:flex;
		gap: ${small ? '0.5rem' : '1rem'};
	}
	.meal{
		width: ${small ? '2rem' : '4rem'};
		height: ${small ? '1rem' : '2rem'};
		background: var(--black-transparent);
		border-radius: ${small ? '0.25rem' : '0.5rem'};
		overflow:hidden;
		position: relative;
	}
	.pill{
		position:absolute;
		height: 100%;
		box-shadow: inset 0 -.5rem rgba(0,0,0,.3);
	}
	.eaten{
		background: var(--meal-color);
		z-index:1;
	}
	.filled{
		width: 100%;
	}
	@keyframes alert{
		0%{background:red;}
		100%{background:transparent;}
	}
	@keyframes ok{
		0%{background:var(--meal-color);}
		100%{background:transparent;}
	}
	.alert{
		animation-name: alert;
	}
	.ok{
		animation-name: ok;
	}
	.pill.animated{
		animation-duration: 0.5s;
		animation-iteration-count: infinite;
		animation-direction: alternate;
		z-index: 0;
	}
	.half{
		width: 50%;
	}
	`
	const extraTotal = createMemo(() => props.amount() + (props.extra ? props.extra() : 0))
	const pills = createMemo(() => Math.max(5, extraTotal()))
	return (
		<div class="meal-container">
			<For each={range(0, pills(), i => i)}>
				{(i) => {
					return (
						<div class="meal">
							<div
								class="pill eaten"
								classList={{
									filled: props.amount() > i,
									half: props.amount() === (i + 0.5),
								}}
							/>
							<div
								class="pill animated"
								classList={{
									alert: reset() && extraTotal() > 5,
									ok: reset() && extraTotal() <= 5,
									filled: extraTotal() > i,
									half: extraTotal() === (i + 0.5),
								}}
							/>
						</div>
					)
				}}
			</For>
		</div>
	)
}
export const extra = atom(0)
const acornRenderer = thumbnailRenderer(64)
export const amountEaten = createMemo(() => save.modifiers.reduce((acc, v) => acc + (itemsData[v]?.meal ?? 0), 0))
export const HealthUi = () => {
	const context = useGame()

	return (
		<Show when={context?.player()}>
			{(player) => {
				const health = ui.sync(() => `${player().currentHealth / player().maxHealth.value * 100}%`)
				const max = ui.sync(() => Math.floor(player().maxHealth.value))
				const maxWidth = createMemo(() => `${max()}rem`)
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
					border-radius: 1rem; 
					overflow: hidden; 
					background:var(--black-transparent);
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
					background: #ec273f;
					z-index:1;
				}
				.back{
					background: white;
					transition-delay: 0.3s
				}
				.health-text{
					position: absolute;
					color: white;
					top: 50%;
					left: 50%;
					translate: -50% -50%;
					font-size: 2rem;
					white-space: nowrap;
					z-index: 1;
				}
				.acorn {
					padding:0.2rem;
					border-radius: 1rem; 
					display:grid;
					color: white;
					width: fit-content;
					grid-template-columns: auto auto;
					place-items: center;
					gap:1rem;
					padding-right:1rem;
					font-size: 2rem;
					background:var(--black-transparent);
				}
				:global(.acorn canvas){
					width: 4rem !important;
					height: 4rem !important;
				}
				.watering-container{
					width:5rem;
					height: 5rem;
					padding: 1rem;
					display: grid;
					place-items: center;
					border-radius: 100%;
					overflow:hidden;
					position: relative;
					background:var(--black-transparent);
				}
				.watering{
					font-size: 3rem;
					z-index: 1;
					fill: white;
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

				const current = ui.sync(() => Math.floor(player().currentHealth))
				const healthDisplay = createMemo(() => `${current()} / ${max()}`)
				const model = assets.items.acorn.model.clone()
				model.rotateY(Math.PI / 2)
				const { element, setSpinAmount } = acornRenderer.spin(model)
				const acorns = ui.sync(() => save.acorns)
				const clear = coroutines.add(function* () {
					let oldAmount = save.acorns
					while (true) {
						yield
						setSpinAmount((spin) => {
							return Math.max(0, spin + 0.03 * (save.acorns - oldAmount) - 0.0005)
						})
						oldAmount = save.acorns
					}
				})
				const wateringCan = ui.sync(() => player().wateringCan)
				onCleanup(clear)
				const visible = atom(false)
				onMount(() => setTimeout(() => visible(true), 100))
				const isVisible = createMemo(() => ovenQuery().length === 0 && cauldronQuery().length === 0 && visible())

				return (
					<Transition name="traverse-down">
						<Show when={isVisible()}>
							<div class="health-ui">
								<div class="wrapper">
									<div class="health-amount front"></div>
									<div class="health-amount back"></div>
									<div class="health-text">
										<OutlineText>{healthDisplay()}</OutlineText>
									</div>
								</div>
								<MealAmount amount={amountEaten} extra={extra} />
								<div class="acorn">
									{element}
									<OutlineText>{acorns()}</OutlineText>
								</div>
								<Show when={wateringCan()}>
									{(_) => {
										const waterAmount = ui.sync(() => player().wateringCan?.waterAmount)
										return (
											<div class="watering-container">
												<div class="watering"><Drop /></div>
												<div class="water-overlay" style={{ '--water': `${(waterAmount() ?? 0) * 100}%` }}></div>
											</div>
										)
									}}
								</Show>
							</div>
						</Show>
					</Transition>
				) }}
		</Show>
	)
}