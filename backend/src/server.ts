import "dotenv/config";
import app from "./app";
import { startReminderJob } from "./jobs/reminderJob";

const PORT = parseInt(process.env.PORT || "8000", 10);

app.listen(PORT, () => {
  console.log(`StudioFlow API rodando em http://localhost:${PORT}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || "development"}`);
  startReminderJob();
});
