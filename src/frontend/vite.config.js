import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { default as monacoEditorPlugin } from 'vite-plugin-monaco-editor'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    UnoCSS(),
    monacoEditorPlugin.default({
      languageWorkers: ['editorWorkerService', 'css', 'html', 'typescript'],
      customWorkers: [
        {
          label: 'markdown',
          entry: 'monaco-editor/esm/vs/basic-languages/markdown/markdown.js'
        }
      ]
    })
  ],
  test: {
    globals: true,
    environment: 'happy-dom',
  }
})
