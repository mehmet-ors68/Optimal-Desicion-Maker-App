const pool = require("./dbConfig");

// General function to run queries
const runQuery = async (query, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result;
  } catch (err) {
    throw err;
  } finally {
    client.release();
  }
};

// 1️⃣ Fetch all cases
const getCases = async () => {
  return (await runQuery("SELECT * FROM cases", [])).rows;
};

// 2️⃣ Fetch a case by ID
const getCaseById = async (id) => {
  return (await runQuery(`SELECT * FROM cases WHERE "caseId" = $1`, [id])).rows[0];
};

const getCasesByUserId = async (userId) => {
  return (await runQuery(`SELECT * FROM cases WHERE "userId" = $1`, [userId])).rows;
};

// 3️⃣ Create a new case
const createCase = async (userId, title, description) => {
  return (await runQuery(
    `INSERT INTO cases (title, description, "userId") VALUES ($1, $2, $3) RETURNING *`,
    [title, description, userId]
  )).rows[0];
};

// 4️⃣ Update a case
const updateCase = async (id, title, description) => {
  return (await runQuery(
    `UPDATE cases SET title = $1, description = $2 WHERE "caseId" = $3 RETURNING *`,
    [title, description, id]
  )).rows[0];
};

// 5️⃣ Delete a case
const deleteCase = async (id) => {
  return (await runQuery(`DELETE FROM cases WHERE "caseId" = $1 RETURNING *`, [id])).rows.length;
};


//criterias table
const getCriteriasByCaseId = async (caseId) => {
  return (await runQuery(`SELECT * FROM criterias WHERE "caseId" = $1 ORDER BY "criteriaId"`, [caseId])).rows;
};

const deleteCriteriasByCaseId = async (caseId) => {
  return await runQuery(`DELETE FROM criterias WHERE "caseId" = $1`, [caseId]);
};

const insertCriterias = async (caseId, criterias) => {
  const values = criterias.map(c => `(${caseId}, '${c.criteriaName}', '${c.dataType}', '${c.characteristic}', ${c.criteriaPoint})`).join(", ");
  return await runQuery(`INSERT INTO criterias ("caseId", "criteriaName", "dataType", characteristic, "criteriaPoint") VALUES ${values}`, []);
};


//criteria single (chatty)
const insertCriteria = async (caseId, criteria) => {
  return (await runQuery(`INSERT INTO criterias ("caseId", "criteriaName", "dataType", characteristic, "criteriaPoint") VALUES ($1, $2, $3, $4, $5) RETURNING "criteriaId"`,
                                                [caseId, criteria.criteriaName, criteria.dataType, criteria.characteristic, criteria.criteriaPoint])).rows[0];
};

const deleteCriteriaByCriteriaId = async (criteriaId) => {
  return await runQuery(`DELETE FROM criteria WHERE "criteriaId" = $1`, [criteriaId]);
};

//decision matrix single chatty
const insertDecisionMatrixEntity = async (caseId, entity) => {
  let values = ``;
   Object.keys(entity).filter(criteriaName => criteriaName !== 'alternativeName')
    .forEach(criteriaName => {
      values += `($1, '${criteriaName}', $2, '${entity[criteriaName]}'),`
      return values
      //         caseId, criteriaName,         alternativeName,                      value
      })
  values = values.slice(0, -1);

  const query = `INSERT INTO decisionmatrix ("caseId", "criteriaName", "alternativeName", value)
  VALUES ` + values
    
  await runQuery(query, [caseId,entity.alternativeName]);
};

const editDecisionMatrixEntity = async (caseId, updatedEntity) => {
  let values = '';
  const criteriaNames = Object.keys(updatedEntity).filter(
    key => key !== 'alternativeName' && key !== 'oldAlternativeName'
  );

  criteriaNames.forEach(criteriaName => {
    values += `(${caseId}, '${criteriaName}', '${updatedEntity.alternativeName}', '${updatedEntity[criteriaName]}'),\n`;
  });

  values = values.slice(0, -2); // remove trailing comma and newline

  const query = `
    INSERT INTO decisionmatrix ("caseId", "criteriaName", "alternativeName", value)
    VALUES ${values}
    ON CONFLICT ("caseId", "criteriaName", "alternativeName")
    DO UPDATE SET 
      value = EXCLUDED.value,
      "alternativeName" = EXCLUDED."alternativeName";
  `;

  await runQuery(query);
};

 /*
  UPDATE decisionmatrix
  SET
    value = CASE "criteriaName"
      WHEN '45ss' THEN '260'
      WHEN 'sd' THEN '510'
      ELSE value
    END,
    "alternativeName" = 'a20'
  WHERE "caseId" = 85 AND "alternativeName" = 'a20';
  */
/*
const editDecisionMatrixEntity = async (caseId, updatedEntity) => {
  let query = `UPDATE decisionmatrix SET\n value = CASE "criteriaName"\n`;
   Object.keys(updatedEntity).forEach(criteriaName => {
    if(criteriaName !== 'alternativeName' && criteriaName !== 'oldAlternativeName') {
      query += `WHEN '${criteriaName}' THEN '${updatedEntity[criteriaName]}'\n`
    }
  })

  query += `ELSE value\n END,\n "alternativeName" = $1 \nWHERE "caseId" = $2 AND "alternativeName" = $3;`
 
  await runQuery(query, [updatedEntity.alternativeName, caseId, updatedEntity.oldAlternativeName]);
};
*/
const deleteDecisionMatrixEntity = async (caseId, alternativeName) => {
  await runQuery(`DELETE FROM decisionmatrix 
    WHERE "caseId" = $1 AND "alternativeName" = $2`, [caseId, alternativeName]);
};

const deleteDecisionMatrixEntities = async (caseId, deleteAlternativeNames) => {
  let stringNames = `(`
  deleteAlternativeNames.map((alternativeName) => {
    stringNames += "'" + alternativeName + "'" + ','
  })
  stringNames = stringNames.slice(0, -1);
  stringNames += ')';
  const query = `DELETE FROM decisionmatrix 
  WHERE "caseId" = $1 AND "alternativeName" IN ` + stringNames
  console.log("sto: ", query)

  await runQuery(query, [caseId]);
};


//decision matrix
const getDecisionMatrix = async (caseId) => {
//    SELECT * FROM decisionmatrix WHERE "caseId" = $1

  const query = `
    SELECT 
    "criteriaName",
    "alternativeName",
    "value"
    FROM 
      decisionmatrix 
    WHERE 
      "caseId" = $1;
  `;

  return (await runQuery(query, [caseId])).rows;
};

const insertDecisionMatrix = async (caseId, decisionMatrix) => {
  const query = `INSERT INTO decisionmatrix ("caseId", "criteriaName", "alternativeName", value)
  VALUES ${decisionMatrix.map((alternative) => {
    let values = ``;
    Object.keys(alternative).filter(key => key !== 'alternativeName' && key !== 'id')
    .forEach(criteriaName => {
       values += `($1, '${criteriaName}', '${alternative.alternativeName}', '${alternative[criteriaName]}'),`
      //         caseId, criteriaName,         alternativeName,                      value
      })
      return values.substring(0, values.length - 1);
  })}`

  await runQuery(query, [caseId]);
};





//auth
// Check if a username exists
const doesUsernameExist = async (username) => {
  const result = await runQuery("SELECT * FROM users WHERE username = $1", [username]);
  return result.rows.length > 0;
};

// Check if an email exists
const doesEmailExist = async (email) => {
  const result = await runQuery("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows.length > 0;
};

//get user
const getUserByUsername = async (username) => {
  return (await runQuery("SELECT * FROM users WHERE username = $1", [username])).rows[0];
};

/*
{
  issue_at: 12,
  rows: [
    {
    user_id: 68,
    username: "bny"
    password: "sdfgsdfg",
    },
    {
    user_id: 58,
    username: "bny"
    password: "sdasadffgsdfg"
  }
  ]
}
*/


//register
const createNewUser = async (username, hashedPassword, email) => {
  return await runQuery(`INSERT INTO users (username, "passwordHash", email) VALUES ($1, $2, $3) RETURNING "userId"`,
                                 [username, hashedPassword, email]);
};


// Export all functions
module.exports = {
  getCases,
  getCaseById,
  getCasesByUserId,
  createCase,
  updateCase,
  deleteCase,
  getCriteriasByCaseId,
  deleteCriteriasByCaseId,
  insertCriterias,
  insertCriteria,
  runQuery,
  insertDecisionMatrix,
  getDecisionMatrix,
  insertDecisionMatrixEntity,
  editDecisionMatrixEntity,
  deleteDecisionMatrixEntity,
  deleteDecisionMatrixEntities,
  doesUsernameExist,
  doesEmailExist,
  createNewUser,
  getUserByUsername,
  initializeDatabase
};


//table creations:

/*

CREATE TABLE IF NOT EXISTS users (
  "userId" SERIAL PRIMARY KEY,
  "username" VARCHAR(255) UNIQUE NOT NULL,
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

 CREATE TABLE IF NOT EXISTS cases (
        "caseId" SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        "userId" INT,
        FOREIGN KEY ("userId") REFERENCES users("userId") ON DELETE CASCADE
      );

DROP TABLE criterias;
CREATE TABLE IF NOT EXISTS criterias (
        "caseId" INT,
         "criteriaId" SERIAL KEY,
        "criteriaName" VARCHAR(255) NOT NULL,
        "dataType" VARCHAR(20),
        characteristic VARCHAR(20),
        "criteriaPoint" NUMERIC,
        PRIMARY KEY ("caseId", "criteriaId"),
        FOREIGN KEY ("caseId") REFERENCES cases("caseId") ON DELETE CASCADE
      );

CREATE TABLE decisionmatrix (
  "caseId" INT NOT NULL,
  "criteriaName" VARCHAR(255) NOT NULL,  -- not a foreign key, just a value
  "alternativeName" VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,

  -- Composite primary key ensures uniqueness
  PRIMARY KEY ("caseId", "criteriaName", "alternativeName"),

  -- Foreign key only on caseId for referential integrity
  FOREIGN KEY ("caseId") REFERENCES cases("caseId") ON DELETE CASCADE
);
*/
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        "userId" SERIAL PRIMARY KEY,
        "username" VARCHAR(255) UNIQUE NOT NULL,
        "email" VARCHAR(255) UNIQUE NOT NULL,
        "passwordHash" TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cases (
        "caseId" SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        "userId" INT,
        FOREIGN KEY ("userId") REFERENCES users("userId") ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS criterias (
        "caseId" INT,
        "criteriaId" SERIAL,
        "criteriaName" VARCHAR(255) NOT NULL,
        "dataType" VARCHAR(20),
        characteristic VARCHAR(20),
        "criteriaPoint" NUMERIC,
        PRIMARY KEY ("caseId", "criteriaId"),
        FOREIGN KEY ("caseId") REFERENCES cases("caseId") ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS decisionmatrix (
        "caseId" INT NOT NULL,
        "criteriaName" VARCHAR(255) NOT NULL,
        "alternativeName" VARCHAR(255) NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY ("caseId", "criteriaName", "alternativeName"),
        FOREIGN KEY ("caseId") REFERENCES cases("caseId") ON DELETE CASCADE
      );
    `);

    console.log('✅ Database tables created or already exist.');
  } catch (err) {
    console.error('❌ Error initializing database:', err);
  }
}
