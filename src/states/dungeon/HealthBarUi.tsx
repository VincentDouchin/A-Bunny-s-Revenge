import { Portal } from 'solid-js/web'
import { ecs, ui } from '@/global/init'
import { ForQuery } from '@/ui/components/ForQuery'

const healthBarQuery = ecs.with('healthBarContainer', 'maxHealth', 'currentHealth')

export const HealthBarUi = () => {
	return (
		<ForQuery query={healthBarQuery}>
			{(entity) => {
				const healthPercent = ui.sync(() => Math.max(0, entity.currentHealth / entity.maxHealth.value))
				return (
					<Portal mount={entity.healthBarContainer.element}>
						<div style={{ 'width': '10rem', 'height': '0.5rem', 'background': 'hsl(0,0%,0%,50%)', 'border-radius': '1rem' }}>
							<div style={{ 'width': `${(healthPercent()) * 100}%`, 'background': '#ec273f', 'height': '100%', 'border-radius': '1rem' }}></div>
						</div>
					</Portal>
				)
			}}
		</ForQuery>
	)
}