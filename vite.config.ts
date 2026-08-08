import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import electron from 'vite-plugin-electron/simple'

export default defineConfig(async () => ({
	plugins: [
		preact(),
		...(await electron({
			main: {
				entry: 'electron/main.js'
			},
			preload: {
				input: 'electron/preload.cjs',
				vite: {
					build: {
						// Sandboxed preload scripts must stay CommonJS, so force the .cjs
						// extension — the default .mjs would be parsed as ESM.
						rolldownOptions: {
							output: {
								format: 'cjs',
								entryFileNames: '[name].cjs',
								chunkFileNames: '[name].cjs'
							}
						}
					}
				}
			}
		}))
	],
	base: './'
}))