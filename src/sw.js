import { ExpirationPlugin } from 'workbox-expiration'
import { enable as enableNavigationPreload } from 'workbox-navigation-preload'
// src/sw.js
import { precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'

// Enable navigation preload
enableNavigationPreload()

// Precache all assets generated by your build process
precacheAndRoute(globalThis.__WB_MANIFEST)

// Handle navigation requests with proper preload support
const navigationHandler = new NetworkFirst({
	cacheName: 'navigations',
	plugins: [
		new ExpirationPlugin({
			maxEntries: 50,
			maxAgeSeconds: 24 * 60 * 60, // 24 hours
		}),
	],
})

globalThis.addEventListener('activate', (event) => {
	event.waitUntil(enableNavigationPreload())
})

// Register navigation route
registerRoute(
	new NavigationRoute(async (params) => {
		try {
			// Try to get the preloaded response
			const preloadResponse = await params.preloadResponse
			if (preloadResponse) {
				return preloadResponse
			}

			// If no preload response, use the navigation handler
			return await navigationHandler.handle(params)
		} catch (error) {
			console.error(error)
			// If both preload and normal navigation fail, return the offline page
			return navigationHandler.handle(params)
		}
	}),
)

// Images with StaleWhileRevalidate
registerRoute(
	({ request }) => request.destination === 'image',
	new StaleWhileRevalidate({
		cacheName: 'images',
		plugins: [
			new ExpirationPlugin({
				maxEntries: 100,
				maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
			}),
		],
	}),
)

// Cache fonts
registerRoute(
	({ request }) => request.destination === 'font',
	new CacheFirst({
		cacheName: 'fonts',
		plugins: [
			new ExpirationPlugin({
				maxEntries: 10,
				maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
			}),
		],
	}),
)