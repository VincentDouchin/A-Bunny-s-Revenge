import type { Accessor } from 'solid-js'
import type { Atom } from 'solid-use/atom'
import type { ConversationLine } from './setupConversation'
import type { EmoteContainer } from '@/global/entity'
import { createMemo, For, onMount, Show } from 'solid-js'
import { Portal } from 'solid-js/web'
import { css } from 'solid-styled'
import { Transition } from 'solid-transition-group'
import atom from 'solid-use/atom'
import { assets, ecs } from '@/global/init'

import { ForQuery } from '@/ui/components/ForQuery'
import { Menu } from '@/ui/components/Menu'
import { DialogText } from '@/ui/DialogUi'
import { GoldContainer, OutlineText } from '../ui/components/styledComponents'
import { conversationQuery } from './setupConversation'

function Emote(props: {
	emote: keyof typeof assets['emotes']['emotes']
	container?: keyof typeof assets['emotes']['containers']
	emoteContainer: EmoteContainer
}) {
	css/* css */`
	.emote-container{
		position:relative;
		top: 10%;
	}
	.emote-container.left{
		left: 
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
	const visible = atom(false)
	onMount(() => {
		setTimeout(() => visible(true), 10)
	})
	return (
		<div>
			<div>ok</div>
			<Portal mount={props.emoteContainer.element}>
				<Transition name="bounce">
					<Show when={visible()}>
						<div class="emote-container">
							<img src={assets.emotes.emotes[props.emote]} class="emote" />
							<img src={assets.emotes.containers[props.container ?? 'square']} class="container" />
						</div>
					</Show>
				</Transition>
			</Portal>
		</div>
	)
}

function ConversationLineDisplay({ line, finished, onSelected }: {
	line: Accessor<ConversationLine>
	finished: Atom<boolean>
	onSelected: (branch?: string) => void
}) {
	css/* css */`
	.selected::before {
		content: "";
		top: 95%;
		height: 0.1rem;
		background: var(--gold);
		width: 100%;
		position: absolute;
		border-bottom: solid 0.1rem var(--gold-tarnished);
	}
	.dialog-option{
		margin-left: 3rem;
		width: fit-content;
	}
	.options{
		display: grid;
    	height: 100%;
		align-items: center;
	}
	`
	const showArrow = createMemo(() => 'choice' in line())
	return (
		<Menu showArrow={showArrow}>
			{(MenuItem) => {
				return (
					<>
						<Show when={'choice' in line()}>
							<div class="options">
								<For each={Object.entries(line().choice)}>
									{([name, choice], index) => {
										return (
											<div class="dialog-option">
												<MenuItem onClick={() => onSelected(name)} defaultSelected={index() === 0}>
													{({ selected }) => (
														<div classList={{ selected: selected() && finished() }}>
															<DialogText text={choice.en} finished={finished} />
														</div>
													)}
												</MenuItem>
											</div>
										)
									}}
								</For>
							</div>
						</Show>
						<Show when={!('choice' in line())}>
							<MenuItem onClick={onSelected} defaultSelected={true}>
								{() => (
									<DialogText text={line().en} finished={finished} />
								)}
							</MenuItem>
						</Show>
					</>
				)
			}}
		</Menu>
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
				const currentBranch = atom('main')
				const currentDialog = createMemo(() => conversation.dialog[currentBranch()])
				const currentLine = createMemo(() => currentDialog()[index()])
				const finished = atom(false)
				const onSelected = (branch?: string) => {
					if (!finished()) {
						finished(true)
					} else if (branch) {
						index(0)
						currentBranch(branch)
					} else if (index() === currentDialog().length - 1) {
						ecs.remove(entity)
					} else {
						index(index() + 1)
					}
				}
				return (
					<>
						<Show when={currentLine().emote}>
							{(emote) => {
								return (
									<ForQuery query={ecs.with('emoteContainer')}>
										{(entity) => {
											return (
												<Show when={entity.emoteContainer.name === currentLine().speaker}>
													<Emote emote={emote()} emoteContainer={entity.emoteContainer} />
												</Show>
											)
										}}
									</ForQuery>
								)
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

								<OutlineText textSize="2rem">
									<ConversationLineDisplay
										finished={finished}
										line={currentLine}
										onSelected={onSelected}
									/>
								</OutlineText>
							</GoldContainer>
						</div>
					</>
				)
			}}
		</ForQuery>
	)
}