import { color, mix, screenUV, uniform, vec3 } from 'three/tsl'
import { MeshBasicNodeMaterial, Vector2 } from 'three/webgpu'
import { cnoise } from './lib/cnoise'

export class MainMenuBackgroundMaterial extends MeshBasicNodeMaterial {
	time = uniform(0)
	constructor() {
		super()

		const color1 = color('#228399')
		const color2 = color('#041B38')
		const color3 = color('#145D87')

		const resolution = uniform(new Vector2(window.innerWidth, window.innerHeight))

		const coords = screenUV.mul(resolution).div(100)
		const t = this.time.div(4000)

		const cx = coords.x
		const cy = coords.y

		const n1 = cnoise(vec3(t, cx.add(t), cy))

		const n2 = cnoise(vec3(t, cx, cy.add(t)))

		const c1 = mix(color2, color1, n1.add(n2))

		const n3 = cnoise(vec3(t.div(2), cx.add(t), cy.add(t)))

		const colorNode = c1.add(color3.mul(n3))

		this.colorNode = colorNode
	}
}
