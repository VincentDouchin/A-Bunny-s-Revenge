import type { Atom } from 'solid-use/atom'
import type { LevelData } from '../types'
import { faArrowRotateBack, faTrash } from '@fortawesome/free-solid-svg-icons'
import { del } from 'idb-keyval'

import Fa from 'solid-fa'
import { For, Show } from 'solid-js'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { removeLevel, saveLevelFile } from '../lib/fileOperations'

export function LevelSelector({ loadLevel, selectedLevel, folder, fetchLevels, levels }: {
	loadLevel: (levelName: string) => void
	selectedLevel: Atom<string | null>
	folder: string
	fetchLevels: (folder: string) => void
	levels: Atom<string[]>
}) {
	css/* css */`
	.level-selector{
		display: grid;
		background: var(--color-1);
	}
	.no-levels{
		display: grid;
		place-content: center;
		padding: 1rem;
	}
	.level{
		display: grid;
		grid-template-columns: 1fr auto auto;

	}
	.add-level{
		display: grid;
		grid-template-columns: 1fr auto;
	}
	`

	const addLevel = atom(false)
	const levelName = atom('')
	const reset = async (level: string) => {
		await del(level)
		loadLevel(level)
	}
	const createLevel = async () => {
		const emptyMap = document.createElement('canvas')
		emptyMap.width = 100
		emptyMap.height = 100
		const url = emptyMap.toDataURL()
		const ctx = emptyMap.getContext('2d')!
		ctx.fillStyle = 'black'
		ctx.fillRect(0, 0, 100, 100)
		const heightMap = emptyMap.toDataURL()
		const levelTemplate: LevelData = {
			displacementScale: 10,
			entities: {},
			grassMap: url,
			heightMap,
			pathMap: url,
			waterMap: url,
			treeMap: url,
			sizeX: 100,
			sizeY: 100,
		}
		await saveLevelFile(folder, levelName(), levelTemplate)
		loadLevel(levelName())
		addLevel(false)
		fetchLevels(folder)
	}
	const deleteLevel = async (levelName: string) => {
		await removeLevel(folder, levelName)
		fetchLevels(folder)
	}
	return (
		<section class="level-selector">
			<div class="title">Levels</div>
			<Show when={levels().length === 0}>
				<div class="no-levels">No levels present</div>
			</Show>
			<For each={levels()}>
				{(level) => {
					return (
						<div class="level button-group">
							<button classList={{ selected: selectedLevel() === level }} onClick={() => loadLevel(level)}>{level}</button>
							<button onClick={() => deleteLevel(level)}><Fa icon={faTrash} /></button>
							<button onClick={() => reset(level)}><Fa icon={faArrowRotateBack} /></button>
						</div>
					)
				}}
			</For>
			<Show when={addLevel()}>
				<div class="add-level">
					<input onInput={e => levelName(e.target.value)}></input>
					<button disabled={!levelName()} onClick={createLevel}>Create</button>
				</div>
			</Show>
			<Show when={!addLevel()}><button onClick={() => addLevel(true)}>Create new level</button></Show>
		</section>
	)
}