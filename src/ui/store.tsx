import type { Query } from 'miniplex'
import type { Accessor, JSXElement } from 'solid-js'
import { createContext, createMemo, createSignal, useContext } from 'solid-js'
import { inputManager, ui } from '@/global/init'
import { openMenuState, pausedState } from '@/global/states'
import type { ControlType } from '@/lib/inputs'
import { playerInventoryQuery } from '@/utils/dialogHelpers'

const GameContext = createContext<{
	controls: Accessor<ControlType>
	isMenuOpen: Accessor<boolean>
	showTouch: Accessor<boolean>
	usingTouch: Accessor<boolean>
	usingKeyboard: Accessor<boolean>
	usingGamepad: Accessor<boolean>
	isPauseState: Accessor<boolean>
	player: Accessor<typeof playerQuery['entities'][number]>
}>()
const playerQuery = playerInventoryQuery.with('playerControls', 'maxHealth', 'currentHealth', 'maxHealth', 'currentHealth', 'strength', 'menuInputs', 'sneeze', 'debuffsContainer', 'poisoned', 'position', 'sleepy', 'modifiers')
export const useQuery = <T,>(query: Query<T>) => {
	const [entities, setEntities] = createSignal(query.entities, { equals: false })
	query.onEntityAdded.subscribe(() => {
		setEntities(() => query.entities)
	})
	query.onEntityRemoved.subscribe((e) => {
		setEntities(prev => prev.filter(entity => entity !== e))
	})
	return entities
}
export function GameProvider(props: { children: JSXElement | JSXElement[] }) {
	const controls = inputManager.controls
	const isMenuOpen = ui.sync(() => openMenuState.enabled)
	const usingTouch = createMemo(() => inputManager.controls() === 'touch')
	const usingKeyboard = createMemo(() => inputManager.controls() === 'keyboard')
	const usingGamepad = createMemo(() => inputManager.controls() === 'gamepad')
	const isPauseState = ui.sync(() => pausedState.enabled)
	const players = useQuery(playerQuery)
	const player = createMemo(() => players()?.[0])
	const showTouch = createMemo(() => usingTouch() && !isMenuOpen() && !isPauseState())
	const data = {
		player,
		controls,
		showTouch,
		usingKeyboard,
		isMenuOpen,
		usingGamepad,
		usingTouch,
		isPauseState,
	}

	return (
		<GameContext.Provider value={data}>
			{props.children}
		</GameContext.Provider>
	)
}

export const useGame = () => useContext(GameContext)