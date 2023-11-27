import { params } from '@/global/context'
import { ecs } from '@/global/init'
import { renderer } from '@/global/rendering'

export const DebugUi = () => {
	const updatePixelation = (e: Event) => {
		const target = e.target as HTMLInputElement
		const val = target.valueAsNumber
		params.pixelation = val
		renderer.setSize(window.innerWidth / val, window.innerHeight / val)
	}
	return (
		<>
			<div>
				Pixelation
				<input
					type="number"
					value={params.pixelation}
					onChange={updatePixelation}
				>
				</input>
			</div>
			<div>
				Camera Offset Y
				<input
					type="number"
					value={params?.cameraOffsetY}
					onChange={e => params.cameraOffsetY = e.target.valueAsNumber}
				>
				</input>
			</div>
			<div>
				Camera Offset Z
				<input
					type="number"
					value={params?.cameraOffsetZ}
					onChange={e => params.cameraOffsetZ = e.target.valueAsNumber}
				>
				</input>
			</div>
		</>
	)
}
export const spawnDebugUi = () => {
	ecs.add({
		template: DebugUi,
	})
}