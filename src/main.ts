import { spawnDebugUi } from './debug/debugUi'
import { playAnimations } from './global/animations'
import { initCamera, moveCamera } from './global/camera'
import { time } from './global/init'
import { initThree, render, updateControls } from './global/rendering'
import { app, campState, coreState, dungeonState, gameState, setupState } from './global/states'
import { despawnOfType, hierarchyPlugin } from './lib/hierarchy'
import { updateModels } from './lib/modelsProperties'
import { physicsPlugin } from './lib/physics'
import { addToScene } from './lib/registerComponents'
import { transformsPlugin } from './lib/transforms'
import { rerender } from './lib/uiManager'
import { uiPlugin } from './lib/uiPlugin'
import { updateInputs } from './lib/updateInputs'
import { startTweens, updateTweens } from './lib/updateTween'
import { addCropModel, harvestCrop, plantSeed, spawnCrops } from './states/farm/plantSeed'
import { bobItems, collectItems } from './states/game/items'
import { movePlayer } from './states/game/movePlayer'
import { spawnCharacter, spawnCharacterDungeon } from './states/game/spawnCharacter'
import { collideWithDoor, collideWithDoorCamp, spawnCampDoor, spawnDungeonDoors } from './states/game/spawnDoor'
import { enemyAttackPlayer, spawnEnemy } from './states/game/spawnEnemy'
import { spawnGround, spawnRocks, spawnSkyBox, spawnTrees } from './states/game/spawnGround'
import { spawnLight } from './states/game/spawnLights'
import { target } from './states/game/target'
import { setupGame } from './states/setup/setupGame'

coreState
	.addPlugins(hierarchyPlugin, physicsPlugin, updateInputs('playerControls'), transformsPlugin, addToScene('camera', 'light', 'mesh', 'model'), updateModels, uiPlugin)
	.addSubscriber(...target, startTweens)
	.onEnter(initThree(4), initCamera(false), spawnDebugUi)
	.onUpdate(...playAnimations('playerAnimator'), moveCamera, rerender, updateTweens)
	.onPostUpdate(updateControls, render)
	.enable()
setupState
	.onEnter(setupGame)
	.enable()
gameState
	.onEnter()
	.addSubscriber(bobItems)
	.onUpdate(movePlayer, collectItems)
	.enable()
campState
	.addSubscriber(addCropModel)
	.onEnter(spawnGround(), spawnCharacter, spawnLight, spawnSkyBox, spawnTrees(), spawnRocks(), spawnCampDoor, spawnCrops)
	.onUpdate(collideWithDoorCamp, plantSeed, harvestCrop)
	.onExit(despawnOfType('map'))
dungeonState
	.onEnter(spawnGround(96), spawnLight, spawnSkyBox, spawnTrees(96, 30), spawnRocks(96, 30), spawnDungeonDoors, spawnCharacterDungeon, spawnEnemy(96, 5))
	.onUpdate(collideWithDoor, enemyAttackPlayer)
	.onExit(despawnOfType('map'))

const animate = async () => {
	time.tick()
	app.update()
	requestAnimationFrame(animate)
}

animate()