const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./tasks.db", (err) => {
  if (err) {
    console.error("Ошибка подключения к базе данных:", err.message);
  } else {
    console.log("База SQLite подключена!");

    db.run("CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT, completed INTEGER, raw_body TEXT)");
    db.run("ALTER TABLE tasks ADD COLUMN raw_body TEXT", (alterError) => {
      if (alterError && !alterError.message.includes("duplicate column name")) {
        console.error("Ошибка изменения таблицы:", alterError.message);
      }
    });
  }
});

module.exports = db;