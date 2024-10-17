import { ecs } from '@/global/init'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'

const healthBarQuery = ecs.with('healthBar', 'size').without('healthBarContainer')
export const addHealthBarContainer = () => healthBarQuery.onEntityAdded.subscribe((entity) => {
	const healthBarContainer = new CSS2DObject(document.createElement('div'))
	healthBarContainer.position.setY(-entity.size.y / 2)
	ecs.update(entity, { healthBarContainer })
})