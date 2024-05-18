import { For, Show, onMount } from 'solid-js'
import { css } from 'solid-styled'
import { Transition } from 'solid-transition-group'
import atom from 'solid-use/atom'
import type { Room } from './generateDungeon'
import { RoomType } from './generateDungeon'
import { entries } from '@/utils/mapFunctions'
import { useQuery } from '@/ui/store'
import type { direction } from '@/lib/directions'
import { assets, ecs } from '@/global/init'

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
		[RoomType.Seller]: assets.icons['store-solid'],
	}
	const connectorSize: Record<direction, any> = {
		north: { width: '0.5rem', height: '1rem', bottom: '100%' },
		south: { width: '0.5rem', height: '1rem', top: '100%' },
		east: { width: '1.1rem', height: '0.5rem', left: '100%' },
		west: { width: '1.1rem', height: '0.5rem', right: '100%' },
	}
	css/* css */`
	.minimap-wrapper{
		--border: solid 0.2rem black;
		width: 3rem;
		height: 2rem;
		background: ${current ? 'yellow' : 'white'};
		border-radius: 0.5rem;
		border: var(--border);
		position: absolute;
		translate: ${offset};
		box-sizing: content-box;
	}
	.minimap-container{
		position: relative;
		display: grid;
		place-items: center;
		height: 100%;
	}
	.minimap-icon{
	 	width: 1.5rem;
		height: 1.5rem;
		color: black;
	}
	.connector{
		position: absolute;
		background: white;
		z-index: 1;
		box-sizing: content-box;
	}
	.corridor{
		position: absolute;
		background: black;
		box-sizing: content-box;
		border: var(--border);
	}
	`
	return (
		<div class="minimap-wrapper">
			<div class="minimap-container">
				<div innerHTML={icons[room.type]} class="minimap-icon"></div>
				<For each={entries(room.doors).filter(x => x[1] && x[1] !== previous)}>
					{([direction, nextRoom]) => {
						return (
							<Show when={nextRoom}>
								{nextRoom => (

									<>
										<div class="connector" style={connectorSize[direction]}></div>
										<div class="corridor" style={connectorSize[direction]}></div>
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

const dungeonQuery = useQuery(ecs.with('dungeon'))
export const MiniMapUi = () => {
	css/* css */`
	.minimap{
		margin: 1rem;
		width: 15rem;
		height: 10rem;
		background: var(--black-transparent);
		border-radius: 1rem;
		display: grid;
		place-items: center;
		overflow: hidden;
		position:relative;
	}
	`
	return (
		<For each={dungeonQuery()}>
			{(dungeon) => {
				const visible = atom(false)
				onMount(() => setTimeout(() => visible(true), 100))
				return (

					<Transition name="traverse-down">
						<Show when={visible()}>
							<div class="minimap">
								<RoomUi room={dungeon.dungeon} current={true} />
							</div>
						</Show>
					</Transition>

				)
			}}
		</For>
	)
}