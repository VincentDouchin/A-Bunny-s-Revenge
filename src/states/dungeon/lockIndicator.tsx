import LockIndicatorSVG from '@assets/icons/lockIndicator.svg'
import { For } from 'solid-js'
import { Portal } from 'solid-js/web'
import { css } from 'solid-styled'
import { useQuery } from '@/ui/store'
import { ecs } from '@/global/init'

const lockedOnQuery = useQuery(ecs.with('lockedOn'))
export const LockIndicator = () => {
	css/* css */`
	.indicator{
		fill: white;
		font-size: 3rem;
	}
	`
	return (
		<For each={lockedOnQuery()}>
			{(entity) => {
				return (
					<Portal mount={entity.lockedOn.element}>
						<div class="indicator">
							<LockIndicatorSVG />
						</div>
					</Portal>
				)
			}}
		</For>
	)
}