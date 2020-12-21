const express = require("express");
const Knex = require("knex");
const { Model } = require("objection");

const knexfile = require("./knexfile");
const routes = require("./routes/index");

const app = express();

const knex = Knex(knexfile);
Model.knex(knex);

// Middlewares
app.use(express.json());
app.use(routes);
app.use((req, res) => res.send("Hello Objection.js"));

app.listen(3000, () => console.log("Listening at 3000"));
