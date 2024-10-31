import { errorEvent } from '@/global/events'
import { For, Show } from 'solid-js'
import { createSet } from 'solid-proxies'
import { css } from 'solid-styled'

export const Errors = () => {
	const errors = createSet<string>([])
	errorEvent.subscribe(error => errors.add(error))
	css/* css */`
	.errors{
		position:fixed;
		inset:0;
		display: flex;
		place-items: center;
		font-size: 3em;
		color: red;
		flex-direction: column;
		margin: auto;
	}
	`
	return (
		<Show when={errors.size > 0}>
			<div class="errors no-events">
				<h2>An error occured: </h2>
				<For each={[...errors]}>
					{(error) => {
						return <div>{error}</div>
					}}
				</For>
			</div>
		</Show>
	)
}