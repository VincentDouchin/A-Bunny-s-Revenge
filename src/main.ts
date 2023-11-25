import { playAnimations } from './global/animations'
import { initCamera, moveCamera } from './global/camera'
import { initThree, render, updateControls } from './global/rendering'
import { coreState, gameState } from './global/states'
import { addChildren, despanwChildren, removeChildren } from './lib/hierarchy'
import { physicsPlugin } from './lib/physics'
import { addToScene } from './lib/registerComponents'
import { State } from './lib/state'
import { time } from './lib/time'
import { transformsPlugin } from './lib/transforms'
import { updateInputs } from './lib/updateInputs'
import { movePlayer } from './states/game/movePlayer'
import { spawnCharacter } from './states/game/spawnCharacter'
import { spawnGround, spawnSkyBox, spawnTrees } from './states/game/spawnGround'
import { spawnLight } from './states/game/spawnLights'

coreState
	.addPlugins(updateInputs('playerControls'), physicsPlugin, transformsPlugin, addToScene('camera', 'light', 'mesh', 'model'))
	.addSubscribers(addChildren, despanwChildren, removeChildren)
	.onEnter(initThree(4), initCamera(false))
	.onUpdate(...playAnimations('playerAnimator'), moveCamera)
	.onPostUpdate(updateControls, render)
	.enable()
gameState
	.onEnter(spawnCharacter, spawnLight, spawnGround, spawnSkyBox, spawnTrees)
	.onUpdate(movePlayer)
	.enable()

const animate = async (delta: number) => {
	time.tick(delta)
	State.update()
	requestAnimationFrame(animate)
}

animate(performance.now())