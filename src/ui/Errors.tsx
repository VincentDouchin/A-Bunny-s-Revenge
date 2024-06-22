import { For } from 'solid-js'
import { css } from 'solid-styled'
import { errors } from './UI'

export const Errors = () => {
	css/* css */`
	.errors{
		position:fixed;
		inset:0;
	}
	`
	return (
		<div class="errors">
			<For each={errors}>
				{(error) => {
					return <div>{error}</div>
				}}
			</For>
		</div>
	)
}