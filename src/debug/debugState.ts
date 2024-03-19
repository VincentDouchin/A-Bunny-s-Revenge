import { app } from '@/global/states'

interface DebugOptions {
	attackInFarm: boolean
	godMode: boolean
}
export const debugOptions: DebugOptions = {
	attackInFarm: false,
	godMode: false,

}

export const debugState = app.create()
export const editorState = app.create()