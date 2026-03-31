import type { Query } from 'miniplex'

export const trackQuery = <T extends object>(query: Query<T>) => {
	const added = new Set<typeof query extends Iterable<infer E> ? E : never>()
	const removed = new Set<typeof query extends Iterable<infer E> ? E : never>()

	query.onEntityAdded.subscribe((e) => added.add(e))
	query.onEntityRemoved.subscribe((e) => removed.add(e))

	return {
		get added() {
			const snapshot = [...added]
			added.clear()
			return snapshot
		},
		get removed() {
			const snapshot = [...removed]
			removed.clear()
			return snapshot
		},
	}
}
