import { For, Show } from 'solid-js'
import type { Room } from './generateDungeon'
import { RoomType } from './generateDungeon'
import { assets, ecs } from '@/global/init'
import type { direction } from '@/lib/directions'
import { ForQuery } from '@/ui/components/ForQuery'
import { entries } from '@/utils/mapFunctions'

const RoomUi = ({ room, direction, previous, current }: { room: Room, direction?: direction, previous?: Room, current: boolean }) => {
	const dir: Record<direction, string> = {
		north: '0% calc(-100% - 0.5rem)',
		south: '0% calc(100% + 0.5rem)',
		east: 'calc(100% + 0.5rem) 0%',
		west: 'calc(-100% - 0.5rem) 0%',
	}

	const offset = direction ? dir[direction] : '0% 0%'
	const icons: Record<RoomType, string> = {
		[RoomType.Battle]: assets.icons.sword,
		[RoomType.Boss]: assets.icons.skull,
		[RoomType.Entrance]: assets.icons['door-closed-solid'],
		[RoomType.Item]: assets.icons.pouch,
		[RoomType.NPC]: assets.icons.pawn,
	}
	const borderStyle = 'solid 0.2rem black'
	const connectorSize: Record<direction, any> = {
		north: { width: '0.5rem', height: '1rem', bottom: '100%' },
		south: { width: '0.5rem', height: '1rem', top: '100%' },
		east: { width: '1.1rem', height: '0.5rem', left: '100%' },
		west: { width: '1.1rem', height: '0.5rem', right: '100%' },
	}
	return (
		<div style={{ 'width': '3rem', 'height': '2rem', 'background': current ? 'yellow' : 'white', 'border-radius': '0.5rem', 'border': borderStyle, 'position': 'absolute', 'translate': offset, 'box-sizing': 'content-box' }}>
			<div style={{ 'position': 'relative', 'display': 'grid', 'place-items': 'center', 'height': '100%' }}>
				<div innerHTML={icons[room.type]} style={{ width: '1.5rem', height: '1.5rem', color: 'black' }}></div>
				<For each={entries(room.doors).filter(x => x[1] && x[1] !== previous)}>
					{([direction, nextRoom]) => {
						return (
							<Show when={nextRoom}>
								{nextRoom => (

									<>
										<div style={{ ...connectorSize[direction], 'position': 'absolute', 'background': 'white', 'z-index': 1, 'box-sizing': 'content-box' }}></div>
										<div style={{ ...connectorSize[direction], 'position': 'absolute', 'background': 'black', 'box-sizing': 'content-box', 'border': borderStyle }}></div>
										<RoomUi
											current={false}
											room={nextRoom()}
											direction={direction}
											previous={room}
										/>
									</>
								)}
							</Show>
						)
					}}
				</For>

			</div>
		</div>
	)
}

const dungeonQuery = ecs.with('dungeon')
export const MiniMapUi = () => {
	return (
		<ForQuery query={dungeonQuery}>
			{(dungeon) => {
				return (
					<>
						<style jsx>
							{/* css */`
							.minimap{
								position: fixed;
								top: 0;
								right: 0;
								margin: 2rem;
								width: 15rem;
								height: 10rem;
								background: hsla(0, 0%, 100%, 0.3);
								/* border: 0.5rem solid hsla(0, 0%, 100%, 0.5); */
								border-radius: 2rem;
								display: grid;
								place-items: center;
								overflow: hidden;
							}
						`}

						</style>
						<div class="minimap">
							<RoomUi room={dungeon.dungeon} current={true} />
						</div>
					</>
				)
			}}
		</ForQuery>
	)
}