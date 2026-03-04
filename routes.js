const express = require("express");
const router = express.Router();
const db = require("./db");

// Получение количества задач
router.get("/tasks/count", (req, res) => {
  const filter = req.query.filter || "all";

  let sql = "SELECT COUNT(*) as count FROM tasks";

  if (filter === "active") {
    sql = sql + " WHERE completed = 0";
  } else if (filter === "completed") {
    sql = sql + " WHERE completed = 1";
  }

  db.get(sql, (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ count: row.count });
  });
});

router.get("/tasks", (req, res) => {
  const filter = req.query.filter || "all";
  const page = req.query.page || 1;
  const limit = req.query.limit || 5;

  let sql = "SELECT * FROM tasks";

  if (filter === "active") {
    sql = sql + " WHERE completed = 0";
  } else if (filter === "completed") {
    sql = sql + " WHERE completed = 1";
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);
  sql = sql + " ORDER BY id DESC LIMIT " + limit + " OFFSET " + offset;

  db.all(sql, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const mappedRows = rows.map((row) => {
      let rawBody = {};
      if (row.raw_body) {
        try {
          rawBody = JSON.parse(row.raw_body);
        } catch (error) {
          rawBody = {};
        }
      }
      return {
        ...rawBody,
        id: row.id,
        text: row.text,
        completed: !!row.completed
      };
    });
    res.json(mappedRows);
  });
});

router.post("/tasks", (req, res) => {
  const requestBody = req.body || {};
  const text = requestBody.text;
  const completed = requestBody.completed ? 1 : 0;
  const rawBody = JSON.stringify(requestBody);

  const sql = "INSERT INTO tasks (text, completed, raw_body) VALUES ('" + text + "', " + completed + ", '" + rawBody + "')";

  db.run(sql, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      ...requestBody,
      id: this.lastID,
      text,
      completed: !!completed
    });
  });
});

router.patch("/tasks/select-all", (req, res) => {
  const completed = req.body.completed ? 1 : 0;
  const sql = "UPDATE tasks SET completed = " + completed;

  db.run(sql, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ status: "ok", updated: this.changes });
  });
});

router.delete("/tasks/completed", (req, res) => {
  const sql = "DELETE FROM tasks WHERE completed = 1";

  db.run(sql, function (err) {
      if (err) {
      return res.status(500).json({ error: err.message });
      }
    res.json({
      status: "ok",
      deleted: this.changes
    });
  });
});

router.patch("/tasks/:id", (req, res) => {
  const id = req.params.id;
  const requestBody = req.body || {};

  const selectSql = "SELECT * FROM tasks WHERE id = " + id;

  db.get(selectSql, (err, task) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!task) {
      return res.status(404).json({ error: "Задача не найдена" });
    }

    let previousRawBody = {};
    if (task.raw_body) {
      try {
        previousRawBody = JSON.parse(task.raw_body);
      } catch (error) {
        previousRawBody = {};
      }
    }

    const mergedRawBody = { ...previousRawBody, ...requestBody };
    const updatedText = requestBody.text !== undefined ? requestBody.text : task.text;
    const updatedCompleted = requestBody.completed !== undefined ? (requestBody.completed ? 1 : 0) : task.completed;

    let updateSql = "UPDATE tasks SET text = '" + updatedText + "', completed = " + updatedCompleted + ", raw_body = '" + JSON.stringify(mergedRawBody) + "'";

    updateSql = updateSql + " WHERE id = " + id;

    db.run(updateSql, function (updateError) {
      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }
      res.json({
        ...mergedRawBody,
        id: Number(id),
        text: updatedText,
        completed: !!updatedCompleted
      });
    });
  });
});

router.delete("/tasks/:id", (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM tasks WHERE id = " + id;

  db.run(sql, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ status: "ok", deleted: this.changes });
  });
});

module.exports = router;