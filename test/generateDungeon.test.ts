import { beforeEach, describe, expect, it, vi } from 'vitest'
import { World } from 'miniplex'
import levelsData from '../assets/levels/data.json'
import { RoomType, genDungeon } from '../src/states/dungeon/generateDungeon'

describe('dungeon generator', () => {
	beforeEach(() => {
		vi.mock('@/global/init', () => ({ levelsData, ecs: new World() }))
	})
	it('doesn\'t throw an error', () => {
		for (let i = 0; i < 1000; i++) {
			genDungeon(5, false)
		}
	})
	it('generates an end and start room', () => {
		for (const size of [10, 20, 30]) {
			for (let i = 0; i < 100; i++) {
				const rooms = genDungeon(size, true)
				expect(rooms.some(r => r.type === RoomType.Entrance)).toBe(true)
				expect(rooms.some(r => r.type === RoomType.Boss)).toBe(true)
			}
		}
	})
	it('places a npc', () => {
		for (const size of [10, 20, 30]) {
			for (let i = 0; i < 100; i++) {
				const rooms = genDungeon(size, true)
				expect(rooms.some(r => r.type === RoomType.NPC)).toBe(true)
			}
		}
	})
})