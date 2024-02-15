import data from '@assets/levels/data.json'
import { get } from 'idb-keyval'

import { dataUrlToCanvas } from './assetLoaders'
import type { CollidersData, Level, LevelData, LevelImage, RawLevel } from '@/debug/LevelEditor'

export const loadLevelData = async () => {
	const levelData = data.levelData as unknown as LevelData
	const colliderData = data.colliderData as unknown as CollidersData
	const levelsUrl = data.levels as unknown as RawLevel[]
	Object.assign(levelData, await get('levelData'))
	Object.assign(colliderData, await get('colliderData'))
	Object.assign(levelsUrl, await get('levels'))
	const levels: Level[] = await Promise.all(levelsUrl.map(async (level) => {
		const levelCanvases: LevelImage[] = ['path', 'trees', 'grass', 'heightMap']
		const newLevel: Partial<Level> = {}
		for (const canvas of levelCanvases) {
			newLevel[canvas] = await dataUrlToCanvas(level.size, level[canvas])
		}
		return { ...level, ...newLevel } as Level
	}))
	return { levelData, colliderData, levels }
}