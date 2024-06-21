import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import type { With } from 'miniplex'
import { ecs } from '@/global/init'
import type { Entity } from '@/global/entity'

const playerQuery = ecs.with('player', 'position', 'playerControls')
const enemiesQuery = ecs.with('enemyName', 'position', 'state').where(e => e.state !== 'dying')
const unlock = (e: Entity) => {
	ecs.removeComponent(e, 'lockedOn')
	ecs.removeComponent(e, 'outline')
}
const lockOn = (e: Entity) => {
	const lockedOn = new CSS2DObject(document.createElement('div'))
	lockedOn.position.y = e.size?.y ? e.size?.y + 3 : 10
	ecs.update(e, { lockedOn, outline: true })
}
export const selectNewLockedEnemey = (player?: With<Entity, 'position'>) => {
	player ??= playerQuery.first
	if (!player) return
	const sortedEnemies = enemiesQuery.entities.toSorted((a, b) => {
		return a.position.distanceTo(player.position) - b.position.distanceTo(player.position)
	})
	const newLockedOnEnemey = sortedEnemies[0]
	if (newLockedOnEnemey) {
		lockOn(newLockedOnEnemey)
	}
}
const switchLockOn = (diff = 1 | -1) => {
	const alreadyLocked = enemiesQuery.entities.find(e => e.lockedOn)
	if (alreadyLocked) {
		const lockOnIndex = enemiesQuery.entities.indexOf(alreadyLocked)
		if (lockOnIndex !== -1) {
			const newLockedOn = enemiesQuery.entities.at((lockOnIndex + diff) % enemiesQuery.size)
			if (newLockedOn) {
				unlock(alreadyLocked)
				lockOn(newLockedOn)
			}
		}
	}
}
export const lockOnEnemy = () => {
	for (const player of playerQuery) {
		if (player.playerControls.get('lock').justPressed) {
			const alreadyLocked = enemiesQuery.entities.find(e => e.lockedOn)

			if (alreadyLocked) {
				unlock(alreadyLocked)
			} else {
				selectNewLockedEnemey(player)
			}
		}
		if (player.playerControls.get('lookLeft').justPressed) {
			switchLockOn(-1)
		}
		if (player.playerControls.get('lookRight').justPressed) {
			switchLockOn(1)
		}
	}
}
