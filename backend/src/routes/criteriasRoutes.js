const express = require('express');
const router = express.Router();
const { getCriteriasByCaseId, insertCriteria, runQuery } = require('../db/dbFunctions');
const authenticateUser = require('../middleware/authenticateUser');
const { authorizeCase, authorizeCriteria } = require('../middleware/authorizeCase');

router.use(authenticateUser);

// GET the criteria of a case the user owns
router.get('/:caseId', authorizeCase, async (req, res) => {
  try {
    const criterias = await getCriteriasByCaseId(req.caseId);
    res.status(200).json(criterias);
  } catch (err) {
    console.error('Error fetching criterias:', err);
    res.status(500).send('Error fetching criterias');
  }
});

// POST add a criterion to a case the user owns.
// authorizeCase already proved the case exists and belongs to them.
router.post('/:caseId', authorizeCase, async (req, res) => {
  const { criteriaName } = req.body;

  if (!criteriaName || !criteriaName.trim()) {
    return res.status(400).json({ message: 'criteriaName is required' });
  }

  try {
    const criteriaId = await insertCriteria(req.caseId, req.body);
    res.status(201).json(criteriaId);
  } catch (err) {
    console.error('Error inserting criteria:', err);
    res.status(500).json({ message: 'Error inserting criteria' });
  }
});

// PUT update a criterion belonging to one of the user's cases
router.put('/:criteriaId', authorizeCriteria, async (req, res) => {
  const { criteriaId } = req.params;
  const { criteriaName, dataType, characteristic, criteriaPoint } = req.body;

  try {
    const result = await runQuery(
      `UPDATE criterias
       SET "criteriaName" = $1,
           "dataType" = $2,
           characteristic = $3,
           "criteriaPoint" = $4
       WHERE "criteriaId" = $5`,
      [criteriaName, dataType, characteristic, criteriaPoint, criteriaId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Criteria not found or no changes made.' });
    }

    res.status(200).json({ message: 'Criteria updated successfully.' });
  } catch (err) {
    console.error('Error updating criteria:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE a criterion belonging to one of the user's cases
router.delete('/:criteriaId', authorizeCriteria, async (req, res) => {
  const { criteriaId } = req.params;
  const { criteriaName } = req.body;

  try {
    const result = await runQuery(
      'DELETE FROM criterias WHERE "criteriaId" = $1',
      [criteriaId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Criteria not found.' });
    }

    // Scope the matrix cleanup to this case. Deleting by criteriaName alone
    // would wipe rows out of every other case that happens to reuse the name.
    if (criteriaName) {
      await runQuery(
        'DELETE FROM decisionmatrix WHERE "criteriaName" = $1 AND "caseId" = $2',
        [criteriaName, req.caseId]
      );
    }

    res.status(200).json({ message: 'Criteria deleted successfully.' });
  } catch (err) {
    console.error('Error deleting criteria:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
