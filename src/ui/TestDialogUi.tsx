import { css } from 'solid-styled'
import { assets } from '@/global/init'
import { GoldContainer, OutlineText } from './components/styledComponents'

// assets.emotes.emotes.

function Emote(props: {
	emote: keyof typeof assets['emotes']['emotes']
	container?: keyof typeof assets['emotes']['containers']
}) {
	css/* css */`
	.emote-container{
		position:relative;
		left: 350px;
		top: 100px;
	}
	.container{
		width: 100px;
		
	}
	.emote{
		position: absolute;
		inset:0;
		width: 100px;
	}
	`
	return (
		<>
			<div class="emote-container">
				<img src={assets.emotes.emotes[props.emote]} class="emote" />
				<img src={assets.emotes.containers[props.container ?? 'square']} class="container" />
			</div>
		</>
	)
}

export function TestDialogUi() {
	css/* css */`
	.dialog-container{
		position: fixed;
		top: 65%;
		left: 10rem;
		right: 10rem;
		bottom: 5rem;
	}
	:global(.dialog){
		height: 100%;
		position: relative;
	}
	.name{
		position: absolute;
		left:1rem;
		bottom: calc(100% + 1rem);
	}
	.name2{
		position: absolute;
		right:1rem;
		bottom: calc(100% + 1rem);
		filter: brightness(0.5);
	}
	`
	return (
		<>
			<Emote emote="drops"></Emote>
			<div class="dialog-container">
				<GoldContainer class="dialog">
					<div class="name">
						<GoldContainer padding="1rem">
							<OutlineText textSize="2rem">Gloom</OutlineText>
						</GoldContainer>
					</div>
					<div class="name2">
						<GoldContainer padding="1rem">
							<OutlineText textSize="2rem">Jack</OutlineText>
						</GoldContainer>
					</div>
					<OutlineText textSize="2.5rem">
						I wanted to take a nap. I wonder why he chose us for this mission.
					</OutlineText>
				</GoldContainer>
			</div>
		</>
	)
}