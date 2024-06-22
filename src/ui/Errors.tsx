import { For } from 'solid-js'
import { errors } from './UI'

export const Errors = () => {
	return (
		<div>
			<For each={errors}>
				{(error) => {
					return <div>{error}</div>
				}}
			</For>
		</div>
	)
}