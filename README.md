# Optimal Decision Maker

A web application for making structured decisions instead of gut-feel ones.

You describe a decision, list the criteria that matter, weight them, score your
options against each criterion, and the app ranks the options for you using a
multi-criteria decision analysis algorithm.

---

## The problem it solves

Most real decisions involve several options judged on several criteria that pull
in different directions. Choosing a laptop means trading price against battery
life against weight. Choosing a job means trading salary against commute against
growth. People do this arithmetic badly in their heads, and they do it
inconsistently.

Multi-Criteria Decision Making (MCDM) is the formal treatment of exactly this
problem. This app implements it as a workflow:

1. **Create a case** — the decision you are trying to make
2. **Define criteria** — what you are judging on, each marked as *beneficial*
   (higher is better, e.g. battery life) or *non-beneficial* (lower is better,
   e.g. price), and each given a weight
3. **Fill the decision matrix** — score every alternative against every criterion
4. **Get a ranking** — scores computed, sorted, and charted

Cases are saved per user, so a decision can be revisited and revised later.

## How the scoring works

The ranking uses **SAW** (Simple Additive Weighting). The interesting part is
that raw criterion values are not comparable — a price in the thousands and a
rating out of five cannot be summed directly — so the matrix is normalized first.

**1. Normalize each column to a 0–1 scale**, with the direction depending on
whether the criterion is beneficial:

```
beneficial      →  value / column_max      (bigger score for bigger values)
non-beneficial  →  column_min / value      (bigger score for smaller values)
```

This is what lets price and battery life be compared on the same axis, and it is
why each criterion has to declare its direction up front.

**2. Apply the weights** — multiply every normalized cell by its criterion weight.

**3. Sum across criteria** — each alternative's weighted scores add up to a single
number.

**4. Rank** — highest total wins, results rendered as a score table and a pie
chart of each criterion's contribution.

The implementation lives in `frontend/src/Pages/Authenticated Pages/Processing Page/Results/MCDM Algorithms/Saw.js`,
behind an abstract `McdmMethods` base class — `normalize()` and `calculate()` are
the extension points, so additional methods (TOPSIS, VIKOR) can be added without
touching the calling code.

## Architecture

```
┌─────────────────────────────┐
│ React SPA                   │   AuthContext + PrivateRoute guard
│                             │   authenticated pages; axios client
│  /my-cases                  │   layer per resource; SAW computed
│  /processing-page/:caseId   │   client-side from the fetched matrix
└──────────────┬──────────────┘
               │  REST + httpOnly cookie
               ▼
┌─────────────────────────────┐
│ Express API                 │   route module per resource,
│  /api/auth                  │   JWT verification middleware,
│  /api/cases                 │   pg connection pool with
│  /api/criterias             │   graceful shutdown on SIGINT
│  /api/decisionMatrix        │
└──────────────┬──────────────┘
               │  SQL (parameterized)
               ▼
┌─────────────────────────────┐
│ PostgreSQL                  │
└─────────────────────────────┘
```

### Authentication

Passwords are hashed with bcrypt at 10 salt rounds. On login the server issues a
JWT and sets it as an **httpOnly, secure, SameSite=None cookie** rather than
returning it in the response body — the token is never reachable from JavaScript,
which closes off token theft via XSS. The client sends it automatically with
`withCredentials`, and an Express middleware verifies it and attaches `userId` to
the request.

## Data model

```
users            userId ─┐ username (unique), email (unique), passwordHash
                         │
cases            caseId ─┼── userId FK          title, description
                         │      ON DELETE CASCADE
criterias                └── caseId FK          criteriaName, dataType,
                                                characteristic, criteriaPoint
                             PK (caseId, criteriaId)

decisionmatrix               caseId FK          criteriaName, alternativeName, value
                             PK (caseId, criteriaName, alternativeName)
```

The decision matrix is stored as one row per cell rather than a wide table, so a
case can have any number of criteria and alternatives without a schema change.
The composite primary key makes each cell unique by construction. Deleting a user
cascades to their cases, and deleting a case cascades to its criteria and matrix
rows, so no orphan rows survive.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Authenticate, set cookie |
| `GET` | `/api/auth/protected` | Verify current session |
| `GET` | `/api/auth/logout` | Clear cookie |
| `GET` | `/api/cases` | List the signed-in user's cases |
| `POST` | `/api/cases` | Create a case |
| `PUT` | `/api/cases/:id` | Update a case |
| `DELETE` | `/api/cases/:id` | Delete a case |
| `GET` | `/api/criterias/:caseId` | Criteria for a case |
| `POST` | `/api/criterias/:caseId` | Add criteria |
| `PUT` | `/api/criterias/:criteriaId` | Update a criterion |
| `DELETE` | `/api/criterias/:caseId` | Clear a case's criteria |
| `GET` | `/api/decisionMatrix/:caseId` | Fetch the matrix |
| `POST` | `/api/decisionMatrix/:caseId` | Insert matrix rows |
| `PUT` | `/api/decisionMatrix/:caseId` | Update matrix rows |
| `DELETE` | `/api/decisionMatrix/:caseId` | Delete matrix rows |
| `GET` | `/healthz` | Health check |

## Stack

| Layer | Technology |
|---|---|
| Frontend | React, React Router, Context API, axios |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL (`pg` connection pool) |
| Auth | bcrypt, JSON Web Tokens, httpOnly cookies |
| Deployment | Render |

## Running it

**Requirements:** Node.js 18+, PostgreSQL 14+

```bash
git clone https://github.com/mehmet-ors68/Optimal-Decision-Maker-App
cd Optimal-Decision-Maker-App
```

Create `backend/.env`:

```
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/mcdm
JWT_SECRET_CODE=your_secret_here
```

Backend:

```bash
cd backend
npm install
npm start          # http://localhost:5000
```

Frontend, in a second terminal:

```bash
cd frontend
npm install
npm start          # http://localhost:3000
```

The schema is created by the `initializeDatabase()` routine in
`backend/src/db/dbFunctions.js`, which issues `CREATE TABLE IF NOT EXISTS` for
all four tables.

## Repository layout

```
backend/
└── src/
    ├── server.js              app setup, CORS, route mounting, graceful shutdown
    ├── db/
    │   ├── dbConfig.js        pg Pool
    │   └── dbFunctions.js     queries and schema initialization
    ├── middleware/
    │   └── authenticateUser.js JWT verification
    └── routes/                auth, cases, criterias, decisionMatrix

frontend/
└── src/
    ├── AuthContext.js         session state
    ├── Routes/                PrivateRoute / NonePrivateRoute guards
    ├── api/                   axios instance and per-resource clients
    └── Pages/
        ├── None Authenticated Pages/   login, register, about, how it works
        └── Authenticated Pages/
            ├── My Cases/               case list
            └── Processing Page/        criteria, decision matrix, results
                └── Results/MCDM Algorithms/Saw.js
```

## Roadmap

- **AHP weight derivation** — replace directly-entered weights with pairwise
  comparison, which is more reliable than asking people for numbers, and gives a
  consistency ratio to catch contradictory judgements
- **Additional MCDM methods** — TOPSIS and VIKOR behind the existing
  `McdmMethods` interface, with side-by-side comparison of their rankings
- **Sensitivity analysis** — show how far a weight can move before the winner changes
- **Move scoring server-side** — currently computed in the browser; on the server
  it could be cached and shared

---

**Mehmet Örs** — [GitHub](https://github.com/mehmet-ors68) · [LinkedIn](https://linkedin.com/in/mehmetors)
