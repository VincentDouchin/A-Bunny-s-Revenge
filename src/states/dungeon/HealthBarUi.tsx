import { Portal, Show } from 'solid-js/web'
import { ecs, ui } from '@/global/init'
import { ForQuery } from '@/ui/components/ForQuery'
import { enemyData } from '@/constants/enemies'

const healthBarQuery = ecs.with('healthBarContainer', 'maxHealth', 'currentHealth', 'enemyName')

export const HealthBarUi = () => {
	return (
		<ForQuery query={healthBarQuery}>
			{(entity) => {
				const healthPercent = ui.sync(() => Math.max(0, entity.currentHealth / entity.maxHealth.value))
				return (
					<>
						<style jsx dynamic>
							{/* css */`
							.enemy-health-bar{
								width: 10rem;
								height: 0.5rem;
								background: hsl(0, 0%, 0%, 50%);
								border-radius: 1rem;
							}
							.boss-health-container{
								position: fixed;
								bottom: 3rem;
								left: 50%;
								transform: translateX(-50%);
							}
							.boss-name{
								color: white;
								font-size:2rem;
							}
							.boss-health-bar{
								width: 50vw;
								height: 2rem;
								background: hsl(0, 0%, 0%, 50%);
								border-radius: 1rem;
							}
							.health-bar-inner{
								background: #ec273f;
								height: 100%;
								border-radius: 1rem;
							}
							`}
						</style>
						<Show when={!entity.boss}>
							<Portal mount={entity.healthBarContainer.element}>
								<div class="enemy-health-bar">
									<div class="health-bar-inner" style={{ width: `${healthPercent() * 100}%` }}></div>
								</div>
							</Portal>
						</Show>
						<Show when={entity.boss}>
							<div class="boss-health-container">
								<div class="boss-name">{enemyData[entity.enemyName].name}</div>
								<div class="boss-health-bar">
									<div class="health-bar-inner" style={{ width: `${healthPercent() * 100}%` }}></div>
								</div>
							</div>
						</Show>
					</>
				)
			}}
		</ForQuery>
	)
}