import { getSave } from '@/global/save'
import { campState } from '@/global/states'

export const setupGame = async () => {
	await getSave()
	campState.enable({})
}