// Điểm vào cho Vercel (serverless): bọc nguyên app Express đã build bằng `npm run build`.
// Chạy local/Render vẫn dùng src/server.ts (app.listen) — file này không ảnh hưởng chúng.
import { app } from "../dist/app.js"

export default app
