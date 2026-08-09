const { runQuery } = require("../db/dbFunctions");

/**
 * authenticateUser answers "who is this request from?".
 * These answer "is that person allowed to touch this row?".
 *
 * Without them, a signed-in user can read and modify any other user's data
 * just by changing the id in the URL — caseId is a SERIAL, so guessing is
 * counting. Every route that takes a case or criteria id needs one of these
 * after authenticateUser.
 */

// Routes name the parameter either :caseId or :id
const readCaseId = (req) => req.params.caseId ?? req.params.id;

const authorizeCase = async (req, res, next) => {
  const caseId = readCaseId(req);

  if (!/^\d+$/.test(String(caseId))) {
    return res.status(400).json({ message: "Invalid case id" });
  }

  try {
    const result = await runQuery(
      'SELECT 1 FROM cases WHERE "caseId" = $1 AND "userId" = $2',
      [caseId, req.userId]
    );

    // Deliberately 404 rather than 403: telling a stranger "this exists but
    // isn't yours" leaks which ids are real.
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Case not found" });
    }

    req.caseId = Number(caseId);
    next();
  } catch (err) {
    console.error("authorizeCase error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const authorizeCriteria = async (req, res, next) => {
  const { criteriaId } = req.params;

  if (!/^\d+$/.test(String(criteriaId))) {
    return res.status(400).json({ message: "Invalid criteria id" });
  }

  try {
    const result = await runQuery(
      `SELECT c."caseId"
         FROM criterias c
         JOIN cases ca ON ca."caseId" = c."caseId"
        WHERE c."criteriaId" = $1 AND ca."userId" = $2`,
      [criteriaId, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Criteria not found" });
    }

    req.caseId = result.rows[0].caseId;
    next();
  } catch (err) {
    console.error("authorizeCriteria error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { authorizeCase, authorizeCriteria };
