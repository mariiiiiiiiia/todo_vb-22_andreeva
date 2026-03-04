const express = require("express");
const app = express();
const path = require("path");
const router = require("./routes");

const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Логирование всех входящих запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.static(path.join(__dirname, "public")));

app.use("/", router);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message, stack: err.stack });
});

app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});