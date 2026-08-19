import "dotenv/config"
import { app } from "./app.js"

// Last-resort safety net for errors outside the Express request cycle
// (the error-handling middleware in app.ts covers everything inside it).
// Log instead of letting the process die on a transient failure.
process.on("unhandledRejection", (err) => console.error("Unhandled rejection:", err))
process.on("uncaughtException", (err) => console.error("Uncaught exception:", err))

const port = process.env.PORT ? Number(process.env.PORT) : 4000

app.listen(port, () => {
  console.log(`HDH Toys backend listening on http://localhost:${port}`)
})
