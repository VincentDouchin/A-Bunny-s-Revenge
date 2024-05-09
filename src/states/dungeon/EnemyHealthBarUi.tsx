import { createMemo } from 'solid-js'
import { Portal, Show } from 'solid-js/web'
import { css } from 'solid-styled'
import { enemyData } from '@/constants/enemies'
import { ecs, ui } from '@/global/init'
import { ForQuery } from '@/ui/components/ForQuery'

const healthBarQuery = ecs.with('healthBarContainer', 'maxHealth', 'currentHealth', 'enemyName')

export const EnemyHealthBarUi = () => {
	css/* css */`
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
	.enemy-health-bar{
		width: 10rem;
		height: 0.5rem;
		background: hsl(0, 0%, 0%, 50%);
		border-radius: 1rem;
		position:relative;
	}
	.health-bar-inner{
		position:absolute;
		background: #ec273f;
		height: 100%;
		border-radius: 1rem;
		transition: width 0.2s ease-in;
		z-index: 1;
	}
	.health-bar-back {
		background: white;
		transition-delay: 500ms;
		z-index: 0;
	}
	@keyframes disappear{
		from{
			opacity: 1;
		}
		to{
			opacity:0;
		}
	}
	.enemy-health-bar.disappear{
		animation-name: disappear;
		animation-duration: 1s;
		animation-fill-mode: forwards;
	}`
	return (
		<ForQuery query={healthBarQuery}>
			{(entity) => {
				const healthPercent = ui.sync(() => Math.max(0, entity.currentHealth / entity.maxHealth.value))
				const dead = createMemo(() => healthPercent() === 0)

				return (
					<>
						<Show when={!entity.boss}>
							<Portal mount={entity.healthBarContainer.element}>
								<div class="enemy-health-bar" classList={{ disappear: dead() }}>
									<div class="health-bar-inner" style={{ width: `${healthPercent() * 100}%` }}></div>
									<div class="health-bar-inner health-bar-back" style={{ width: `${healthPercent() * 100}%` }}></div>
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