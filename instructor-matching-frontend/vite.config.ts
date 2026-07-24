import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 8900,
    proxy: {
      // 브라우저가 API 서버를 직접 찾지 않고 Vite 개발 서버를 거치게 한다.
      // 로컬 환경의 localhost/CORS 차이로 로그인 요청이 실패하는 것을 방지한다.
      '/api': {
        target: 'http://127.0.0.1:8700',
        changeOrigin: true,
      },
    },
  },
})
