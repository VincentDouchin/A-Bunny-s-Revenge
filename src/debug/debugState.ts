import { app } from '@/global/states'

interface DebugOptions {
	attackInFarm: boolean
}
export const debugOptions: DebugOptions = {
	attackInFarm: false,
}

export const debugState = app.create()
export const editorState = app.create()