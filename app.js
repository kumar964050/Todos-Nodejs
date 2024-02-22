require("dotenv").config();
const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const { format } = require("date-fns");

const app = express();
app.use(express.json());

const dbPath = "todoApplication.db";

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    const PORT = process.env.PORT || 3000;
    app.listen(3000, () => {
      console.log(`Server is running at PORT : ${PORT}`);
    });
  } catch (error) {
    console.log(`Error initializing database: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const validStatusValues = ["TO DO", "IN PROGRESS", "DONE"];
const validPriorityValues = ["HIGH", "MEDIUM", "LOW"];
const validCategoryValues = ["WORK", "HOME", "LEARNING"];

const isValidDate = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  return regex.test(dateString);
};

const formattedDate = (due_date) => {
  return format(new Date(due_date), "yyyy-MM-dd");
};

const handleInvalidScenarios = (req, res, next) => {
  const { status, priority, category, dueDate } = req.query;
  if (status && !validStatusValues.includes(status)) {
    return res.status(400).send("Invalid Todo Status");
  }

  if (priority && !validPriorityValues.includes(priority)) {
    return res.status(400).send("Invalid Todo Priority");
  }

  if (category && !validCategoryValues.includes(category)) {
    return res.status(400).send("Invalid Todo Category");
  }

  if (dueDate && !isValidDate(dueDate)) {
    return res.status(400).send("Invalid Due Date");
  }

  next();
};
const handleInvalidScenariosBody = (req, res, next) => {
  const { status, priority, category, dueDate } = req.body;
  if (status && !validStatusValues.includes(status)) {
    return res.status(400).send("Invalid Todo Status");
  }

  if (priority && !validPriorityValues.includes(priority)) {
    return res.status(400).send("Invalid Todo Priority");
  }

  if (category && !validCategoryValues.includes(category)) {
    return res.status(400).send("Invalid Todo Category");
  }

  if (dueDate && !isValidDate(dueDate)) {
    return res.status(400).send("Invalid Due Date");
  }

  next();
};

// API 1
app.get("/todos", handleInvalidScenarios, async (req, res) => {
  const { status, priority, category, search_q, dueDate } = req.query;

  let query = "SELECT * FROM todo WHERE 1=1";
  if (status) query += ` AND status = '${status}'`;
  if (priority) query += ` AND priority = '${priority}'`;
  if (category) query += ` AND category = '${category}'`;
  if (search_q) query += ` AND todo LIKE '%${search_q}%'`;
  if (dueDate) {
    const formattedDueDate = formattedDate(dueDate);
    query += ` AND due_date = '${formattedDueDate}'`;
  }

  const todos = await database.all(query);
  res.send(todos);
});

// API 2
app.get("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  const todo = await database.get(`SELECT * FROM todo WHERE id = ${todoId};`);
  if (!todo) return res.status(404).send("Todo not found");
  res.send(todo);
});

// API 3
app.get("/agenda/", handleInvalidScenarios, async (req, res) => {
  const { date } = req.query;
  if (!date || !isValidDate(date))
    return res.status(400).send("Invalid Due Date");

  const formattedDueDate = formattedDate(date);
  const agenda = await database.all(
    `SELECT * FROM todo WHERE due_date = "${formattedDueDate}"`
  );
  res.send(agenda);
});

// API 4
app.post("/todos/", async (req, res) => {
  const { todo, category, priority, status, dueDate } = req.body;
  if (!isValidDate(dueDate)) {
    return res.status(400).send("Invalid Due Date");
  }
  const todos = await await database.all("select * from todo");
  const id = todos[todos.length - 1].id + 1;
  const formattedDueDate = formattedDate(dueDate);
  await database.run(
    `INSERT INTO todo (id,todo, category, priority, status, due_date) 
     VALUES (
         ${id},
         "${todo}",
         "${category}",
         "${priority}",
         "${status}",
         "${formattedDueDate}");`
  );
  res.send("Todo created successfully");
});

// API 5
app.put("/todos/:todoId/", handleInvalidScenariosBody, async (req, res) => {
  const { todoId } = req.params;
  const { todo, status, priority, category, dueDate } = req.body;

  if (!status && !priority && !category && !dueDate && !todo) {
    return res.status(400).send("No valid parameters provided for update");
  }

  let query = `UPDATE todo SET`;
  if (status) query += ` status = "${status}",`;
  if (priority) query += ` priority = "${priority}",`;
  if (category) query += ` category = "${category}",`;
  if (dueDate) query += ` due_date = "${formattedDate(dueDate)}",`;
  if (todo) query += ` todo = "${todo}"`;
  query += ` WHERE id = ${todoId};`;

  await database.run(query);
  res.send("Todo updated successfully");
});

// API 6
app.delete("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  const result = await database.run(`DELETE FROM todo WHERE id = ${todoId}`);
  if (result.changes > 0) {
    res.send("Todo deleted successfully");
  } else {
    res.status(404).send("Todo not found");
  }
});

module.exports = app;
