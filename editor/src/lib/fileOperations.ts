import type { AssetData, LevelData } from '../types'
import { path } from '@tauri-apps/api'
import { BaseDirectory, exists, mkdir, readDir, readTextFile, remove, writeTextFile } from '@tauri-apps/plugin-fs'

// Bounding box
export const createFolder = async (folder: string) => {
	const folderExists = await exists(folder, { baseDir: BaseDirectory.AppData })
	if (!folderExists) {
		await mkdir(folder, { baseDir: BaseDirectory.AppData, recursive: true })
	}
}

export const isRepoCloned = async (folder: string) => {
	const contents = await readDir(folder, { baseDir: BaseDirectory.AppData })
	return contents.length !== 0
}

const getBoundingBoxPath = (folder: string) => path.join(folder, 'assets', 'boundingBox.json')

export const loadBoundingBox = async (folder: string): Promise<Record<string, Record<string, AssetData>>> => {
	const filePath = await getBoundingBoxPath(folder)
	const fileExists = await exists(filePath, { baseDir: BaseDirectory.AppData })
	if (fileExists) {
		const contents = await readTextFile(filePath, { baseDir: BaseDirectory.AppData })
		return JSON.parse(contents) as Record<string, Record<string, AssetData>>
	} else {
		await writeTextFile(filePath, JSON.stringify({}), { baseDir: BaseDirectory.AppData })
		return {}
	}
}

export const saveBoundingBox = async (folder: string, boundingBox: Record<string, Record<string, AssetData>>) => {
	const filePath = await getBoundingBoxPath(folder)
	await writeTextFile(filePath, JSON.stringify(boundingBox), { baseDir: BaseDirectory.AppData })
}

// Levels
const getLevelsDirPath = (folder: string) => path.join(folder, 'assets', 'levels')
export const loadLevels = async (folder: string) => {
	return readDir(await getLevelsDirPath(folder), { baseDir: BaseDirectory.AppData })
}
export const saveLevel = async (folder: string, levelName: string, level: LevelData) => {
	return writeTextFile(
		await path.join(await getLevelsDirPath(folder), `${levelName}.json`),
		JSON.stringify(level),
		{ baseDir: BaseDirectory.AppData },
	)
}
export const removeLevel = async (folder: string, levelName: string) => {
	remove(
		await path.join(await getLevelsDirPath(folder), `${levelName}.json`),
		{ baseDir: BaseDirectory.AppData },
	)
}
export const loadLevel = async (folder: string, level: string) => {
	const fileContent = await readTextFile(
		await path.join(await getLevelsDirPath(folder), `${level}.json`),
		{ baseDir: BaseDirectory.AppData },
	)
	return JSON.parse(fileContent) as LevelData
}