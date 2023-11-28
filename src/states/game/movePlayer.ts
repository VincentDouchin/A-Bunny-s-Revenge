import { Vector3 } from 'three'
import { ecs, time } from '@/global/init'

const playerQuery = ecs.with('playerControls', 'body', 'playerAnimator', 'rotation')
export const movePlayer = () => {
	for (const { playerControls, body, rotation } of playerQuery) {
		const force = new Vector3()
		force.x += playerControls.get('left').pressed
		force.x -= playerControls.get('right').pressed
		force.z -= playerControls.get('backward').pressed
		force.z += playerControls.get('forward').pressed
		const moving = force.length() > 0
		const forceNormalized = force.normalize()
		if (moving) {
			rotation.setFromAxisAngle(new Vector3(0, 1, 0), Math.atan2(forceNormalized.x, forceNormalized.z))
		}

		const finalForce = forceNormalized.multiplyScalar(50 * time.delta)
		body.applyImpulse(finalForce, true)
	}
}