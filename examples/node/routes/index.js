const router = require("express").Router();
const { Person } = require("../models/Person");

router.get("/persons", async (req, res) => {
  const persons = await Person.query();
  res.json(persons);
});

router.post("/persons", async (req, res) => {
  const insertedPerson = await Person.query().insert({
    name: req.body.name,
  });
  res.json(insertedPerson);
});

router.put("/person/:id", async (req, res) => {
  const updated = await Person.query()
    .findById(req.params.id)
    .patch({ name: req.body.name });
  res.json({
    updateSuccess: updated,
  });
});

router.delete("/person/:id", async (req, res) => {
  const deleted = await Person.query().findById(req.params.id).delete();
  res.json({
    deletionSuccess: deleted,
  });
});

module.exports = router;
