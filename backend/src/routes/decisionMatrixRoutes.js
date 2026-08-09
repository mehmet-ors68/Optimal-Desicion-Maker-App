const express = require('express');
const router = express.Router();
const {
  getDecisionMatrix,
  insertDecisionMatrixEntity,
  editDecisionMatrixEntity,
  deleteDecisionMatrixEntities,
} = require('../db/dbFunctions');
const authenticateUser = require('../middleware/authenticateUser');
const { authorizeCase } = require('../middleware/authorizeCase');

// Every route here is scoped to a single case, so both checks apply to all of them.
router.use(authenticateUser);
router.use('/:caseId', authorizeCase);

router.get('/:caseId', async (req, res) => {
  try {
    const matrix = await getDecisionMatrix(req.caseId);
    res.status(200).json(matrix);
  } catch (err) {
    console.error('Error fetching decision matrix:', err);
    res.status(500).send('Error fetching decision matrix');
  }
});

router.post('/:caseId', async (req, res) => {
  try {
    await insertDecisionMatrixEntity(req.caseId, req.body);
    res.status(201).send('Decision matrix updated');
  } catch (err) {
    console.error('Error inserting into decision matrix:', err);
    res.status(500).json({ message: 'Error inserting into decision matrix' });
  }
});

router.put('/:caseId', async (req, res) => {
  try {
    await editDecisionMatrixEntity(req.caseId, req.body);
    res.status(200).send('Decision matrix updated');
  } catch (err) {
    console.error('Error updating decision matrix:', err);
    res.status(500).json({ message: 'Error updating decision matrix' });
  }
});

router.delete('/:caseId', async (req, res) => {
  const { deleteAlternativeNames } = req.body;
  try {
    await deleteDecisionMatrixEntities(req.caseId, deleteAlternativeNames);
    res.status(200).send('Alternative deleted');
  } catch (err) {
    console.error('Error deleting from decision matrix:', err);
    res.status(500).json({ message: 'Error deleting from decision matrix' });
  }
});

module.exports = router;
