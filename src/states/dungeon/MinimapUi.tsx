import type { Room } from './generateDungeon'
import Door from '@assets/icons/door-closed-solid.svg'
import Pawn from '@assets/icons/pawn.svg'
import Pouch from '@assets/icons/pouch.svg'
import Skull from '@assets/icons/skull.svg'
import Store from '@assets/icons/store-solid.svg'
import Sword from '@assets/icons/sword.svg'
import { For, Match, onMount, Show, Switch } from 'solid-js'
import { css } from 'solid-styled'
import { Transition } from 'solid-transition-group'
import atom from 'solid-use/atom'
import { ecs } from '@/global/init'
import { Direction } from '@/lib/directions'
import { useQuery } from '@/ui/store'
import { entries } from '@/utils/mapFunctions'
import { RoomType } from './generateDungeon'

const RoomUi = ({ room, direction, previous, current }: { room: Room, direction?: Direction, previous?: Room, current: boolean }) => {
	const dir: Record<Direction, string> = {
		[Direction.N]: '0% calc(-100% - 0.5rem)',
		[Direction.S]: '0% calc(100% + 0.5rem)',
		[Direction.E]: 'calc(100% + 0.5rem) 0%',
		[Direction.W]: 'calc(-100% - 0.5rem) 0%',
	}

	const offset = direction ? dir[direction] : '0% 0%'

	const connectorSize: Record<Direction, any> = {
		[Direction.N]: { width: '0.5rem', height: '1rem', bottom: '100%' },
		[Direction.S]: { width: '0.5rem', height: '1rem', top: '100%' },
		[Direction.E]: { width: '1.1rem', height: '0.5rem', left: '100%' },
		[Direction.W]: { width: '1.1rem', height: '0.5rem', right: '100%' },
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
	 	font-size: 1.5rem;
		fill: black;
		display: grid;
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
	.east-fade{
		mask-image: linear-gradient(to left, transparent, rgba(0, 0, 0, 1));
		border-right: none;
	}
	.west-fade{
		mask-image: linear-gradient(to right, transparent, rgba(0, 0, 0, 1));
		border-left: none;
	}
	.north-fade{
		mask-image: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 1));
		border-top: none;
	}
	.south-fade{
		mask-image: linear-gradient(to top, transparent, rgba(0, 0, 0, 1));
		border-bottom: none;
	}
	
	`
	return (
		<div class="minimap-wrapper">
			<div class="minimap-container">
				<div class="minimap-icon">
					<Switch>
						<Match when={room.type === RoomType.Battle}>
							<Sword />
						</Match>
						<Match when={room.type === RoomType.Boss}>
							<Skull />
						</Match>
						<Match when={room.type === RoomType.Entrance}>
							<Door />
						</Match>
						<Match when={room.type === RoomType.Item}>
							<Pouch />
						</Match>
						<Match when={room.type === RoomType.NPC}>
							<Pawn />
						</Match>
						<Match when={room.type === RoomType.Seller}>
							<Store />
						</Match>

					</Switch>
				</div>
				<For each={entries(room.doors).filter(x => x[1] !== previous)}>
					{([direction, nextRoom]) => {
						return (
							<>
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
								<Show when={!nextRoom}>
									<div class="connector" classList={{ [`${direction}-fade`]: true }} style={connectorSize[direction]}></div>
									<div class="corridor" classList={{ [`${direction}-fade`]: true }} style={connectorSize[direction]}></div>
								</Show>
							</>
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