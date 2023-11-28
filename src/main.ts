import { spawnDebugUi } from './debug/debugUi'
import { playAnimations } from './global/animations'
import { initCamera, moveCamera } from './global/camera'
import { time } from './global/init'
import { initThree, render, updateControls } from './global/rendering'
import { app, campState, coreState, dungeonState, gameState } from './global/states'
import { despawnOfType, hierarchyPlugin } from './lib/hierarchy'
import { updateModels } from './lib/modelsProperties'
import { physicsPlugin } from './lib/physics'
import { addToScene } from './lib/registerComponents'
import { transformsPlugin } from './lib/transforms'
import { rerender } from './lib/uiManager'
import { uiPlugin } from './lib/uiPlugin'
import { updateInputs } from './lib/updateInputs'
import { movePlayer } from './states/game/movePlayer'
import { spawnCharacter, spawnCharacterDungeon } from './states/game/spawnCharacter'
import { collideWithDoor, collideWithDoorCamp, spawnCampDoor, spawnDungeonDoors } from './states/game/spawnDoor'
import { enemyAttackPlayer, spawnEnemy } from './states/game/spawnEnemy'
import { spawnGround, spawnRocks, spawnSkyBox, spawnTrees } from './states/game/spawnGround'
import { spawnLight } from './states/game/spawnLights'

coreState
	.addPlugins(hierarchyPlugin, updateInputs('playerControls'), physicsPlugin, transformsPlugin, addToScene('camera', 'light', 'mesh', 'model'), updateModels, uiPlugin)
	.addSubscriber()
	.onEnter(initThree(4), initCamera(false))
	.onUpdate(...playAnimations('playerAnimator'), moveCamera, rerender)
	.onPostUpdate(updateControls, render)
	.enable()
gameState
	.onEnter()
	.onUpdate(movePlayer)
	.enable()
campState
	.onEnter(spawnGround(), spawnCharacter, spawnLight, spawnSkyBox, spawnTrees(), spawnRocks(), spawnCampDoor)
	.onUpdate(collideWithDoorCamp)
	.onExit(despawnOfType('map'))
	.enable()
dungeonState
	.onEnter(spawnGround(96), spawnLight, spawnSkyBox, spawnTrees(96, 30), spawnRocks(96, 30), spawnDungeonDoors, spawnCharacterDungeon, spawnEnemy(96, 5))
	.onUpdate(collideWithDoor, enemyAttackPlayer)
	.onExit(despawnOfType('map'))
	// .enable({ direction: 'front', door: 3 })

spawnDebugUi()
const animate = async () => {
	time.tick()
	app.update()
	requestAnimationFrame(animate)
}

animate()