import { BoxGeometry, Mesh, MeshBasicMaterial, Vector3 } from 'three'
import { ecs } from '@/global/init'

const playerQuery = ecs.with('playerControls', 'sensorCollider')
export const plantSeed = () => {
	for (const { playerControls, sensorCollider } of playerQuery) {
		if (playerControls.get('plant').justPressed) {
			const pos = sensorCollider.translation()
			const position = new Vector3(pos.x, pos.y, pos.z).divideScalar(5).floor().multiplyScalar(5)
			ecs.add({
				position,
				inMap: true,
				mesh: new Mesh(
					new BoxGeometry(2),
					new MeshBasicMaterial({ color: 0x00FF00 }),
				),
			})
		}
	}
}