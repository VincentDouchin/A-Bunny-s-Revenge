import { Show, onCleanup } from 'solid-js'
import { css } from 'solid-styled'
import { Transition } from 'solid-transition-group'
import atom from 'solid-use/atom'
import type { Object3D } from 'three'
import { GoldContainer, OutlineText } from './components/styledComponents'
import { sleep } from '@/utils/sleep'
import { thumbnailRenderer } from '@/lib/thumbnailRenderer'

const keyItem = atom<null | { model: Object3D, name: string }>(null)
export const displayKeyItem = async (modelToDisplay: Object3D, name: string, scale = 1) => {
	const model = modelToDisplay.clone()
	model.scale.setScalar(scale)
	keyItem({ model, name })
	await sleep(5000)
	keyItem(null)
}

const renderer = thumbnailRenderer(128)

export const KeyItem = () => {
	css/* css */`
	@property --angle{
		syntax: '<angle>';
		inherits: false;
		initial-value: 0deg;
	}
	@property --circle {
		syntax: '<percentage>';
		inherits: false;
		initial-value: 60%;
	}
	@keyframes rotate-angle{
		0% {
			--angle: 0deg;
			--circle: 60%;
		}
		50%{
			--circle:100%;
		}
		to {
			--circle:60%;
			--angle: 360deg;
		}
	}
	.key-item-container{
		margin: auto
	}
	.key-item-gradient{
		--circle: 60%;
		--angle: 0deg;
		--color1:hsla(0,0%,100%,0.6);
		animation: rotate-angle 5s linear infinite;
		background-image: conic-gradient(
			from var(--angle),
			var(--color1) 30deg,
			transparent 30deg 60deg,
			var(--color1) 60deg 90deg,
			transparent 90deg 120deg,
			var(--color1) 120deg 150deg,
			transparent 150deg 180deg,
			var(--color1) 180deg 210deg,
			transparent 210deg 240deg,
			var(--color1) 240deg 270deg,
			transparent 270deg 300deg,
			var(--color1) 300deg 330deg,
			transparent 330deg 360deg
		);
		padding: 5rem;
		display:grid;
		place-items:center;
		margin: -2rem;
	}
	@keyframes key-item-appear{
		0%{
			scale:30%;
		}
		100%{
			scale:100%;
		}
	}
	.key-item-model{
		scale:30%;
		animation: key-item-appear forwards 0.5s cubic-bezier(0.74, 0.21, 0.33, 1.76);

	}
	.key-item-text{
		font-size:2.5rem;
		color: white;
	}
	.key-item-name{
		color: #3388de;
	}
	`
	return (
		<Transition name="slide">
			<Show when={keyItem()}>
				{(item) => {
					const { element, clear } = renderer.spin(item().model)
					onCleanup(clear)
					return (
						<div class="key-item-container">
							<GoldContainer>
								<div class="key-item-gradient">
									<div class="key-item-model">{element}</div>
									<div class="key-item-text">
										<OutlineText>
											You found a&nbsp;
											<span class="key-item-name">{item().name}</span>
										&nbsp;!
										</OutlineText>
									</div>
								</div>
							</GoldContainer>
						</div>
					)
				}}
			</Show>
		</Transition>
	)
}