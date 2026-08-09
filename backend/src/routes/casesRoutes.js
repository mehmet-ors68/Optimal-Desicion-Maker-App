const express = require('express');
const router = express.Router();
const { getCasesByUserId, createCase, updateCase, deleteCase } = require('../db/dbFunctions');
const authenticateUser = require('../middleware/authenticateUser');
const { authorizeCase } = require('../middleware/authorizeCase');

// Every route below requires a valid session.
router.use(authenticateUser);

// GET the signed-in user's cases
router.get('/', async (req, res) => {
  try {
    const cases = await getCasesByUserId(req.userId);
    res.json(cases);
  } catch (err) {
    console.error('Error fetching cases:', err);
    res.status(500).send('Error fetching cases');
  }
});

// POST create a new case
router.post('/', async (req, res) => {
  const { title, description } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ message: 'Title is required' });
  }

  try {
    const createdRow = await createCase(req.userId, title, description);
    res.status(201).json(createdRow);
  } catch (err) {
    console.error('Error creating case:', err);
    res.status(500).send('Error creating case');
  }
});

// PUT update a case the user owns
router.put('/:id', authorizeCase, async (req, res) => {
  const { title, description } = req.body;
  try {
    const updatedCase = await updateCase(req.caseId, title, description);
    if (!updatedCase) {
      return res.status(404).send('Case not found');
    }
    res.status(200).json(updatedCase);
  } catch (err) {
    console.error('Error updating case:', err);
    res.status(500).send('Error updating case');
  }
});

// DELETE a case the user owns
router.delete('/:id', authorizeCase, async (req, res) => {
  try {
    const deletedCase = await deleteCase(req.caseId);
    if (!deletedCase) {
      return res.status(404).send('Case not found');
    }
    res.status(200).send(`Case with id ${req.caseId} deleted`);
  } catch (err) {
    console.error('Error deleting case:', err);
    res.status(500).send('Error deleting case');
  }
});

module.exports = router;
