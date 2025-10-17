import { createMemo, For, Show } from 'solid-js'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { assets, ecs, menuInputs, ui } from '@/global/init'
import { ForQuery } from '@/ui/components/ForQuery'
import { DialogText } from '@/ui/DialogUi'
import { GoldContainer, OutlineText } from '../ui/components/styledComponents'
import { conversationQuery } from './setupConversation'

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

export function ConversationUi() {
	css/* css */`
	.dialog-container{
		position: fixed;
		top: 65%;
		left: 10rem;
		right: 10rem;
		bottom: 5rem;
	}
	.dialog-wrapper{
		display: flex;
	}
	:global(.dialog){
		height: 100%;
		position: relative;
	}
	.name{
		position: absolute;
		bottom: calc(100% + 1rem);
		width: fit-content;
	}
	.name:not(.name-active){
		filter: brightness(0.5);
	}
	.name-left{
		left: 1rem;
	}
	.name-right{
		right: 1rem;
	}
	`
	return (
		<ForQuery query={conversationQuery}>
			{(entity) => {
				const { conversation } = entity
				const index = atom(0)
				const currentLine = createMemo(() => conversation.dialog[index()])
				const finished = atom(false)
				ui.updateSync(() => {
					if (menuInputs.get('validate').justPressed) {
						if (finished()) {
							if (index() === conversation.dialog.length - 1) {
								ecs.remove(entity)
							} else {
								index(index() + 1)
							}
						} else {
							finished(true)
						}
					}
				})
				return (
					<>
						<Show when={currentLine().emote}>
							{(emote) => {
								return <Emote emote={emote()} />
							}}
						</Show>
						<div class="dialog-container">
							<GoldContainer class="dialog">
								<For each={conversation.actor}>
									{actor => (
										<div
											class={`name name-${actor.position}`}
											classList={{ 'name-active': currentLine().speaker === actor.name }}
										>
											<GoldContainer padding="1rem">
												<OutlineText textSize="2rem">{actor.name}</OutlineText>
											</GoldContainer>
										</div>
									)}
								</For>

								<OutlineText textSize="2.5rem">

									<DialogText text={currentLine().en} finished={finished} />
								</OutlineText>
							</GoldContainer>
						</div>
					</>
				)
			}}
		</ForQuery>
	)
}