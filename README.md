<p align="center">
	<img src="public/images/campus-chronicle-banner.svg" alt="Campus Chronicle - stories from campus" width="100%" />
</p>

# Campus Chronicle

Campus Chronicle is a community publishing platform for VIT Chennai. This repository contains a Node.js backend API and a small static browser client. The backend handles user accounts, authentication, blog posts, comments, MongoDB persistence, and Redis-backed caching and session revocation.

## Technology Stack

| Layer                   | Technology                                |
| ----------------------- | ----------------------------------------- |
| Runtime                 | Node.js 20, native ES modules             |
| HTTP API and static UI  | Express 5                                 |
| Primary datastore       | MongoDB with Mongoose 9                   |
| Cache and session store | Redis 7 with ioredis                      |
| Authentication          | bcrypt, JSON Web Tokens, HttpOnly cookies |
| Local development       | Docker Compose, Nodemon                   |

## Backend Architecture

The API is organized around Express routes, controller functions, Mongoose models, and shared Redis/database connections:

1. `src/index.js` loads environment variables, connects to MongoDB, connects to Redis, attaches the Redis client to `app.locals`, and starts the HTTP listener.
2. `src/app.js` configures JSON and URL-encoded request parsing, serves `public/`, parses cookies, and mounts the versioned route groups under `/api/v1`.
3. `src/routes/user.routes.js` maps HTTP methods and paths to controller functions. Protected routes run `verifyJWT` before their controller.
4. `src/controllers/user.contollers.js` validates request fields, applies application behavior, reads/writes MongoDB, uses Redis for cache/session operations, and sends JSON responses.
5. `src/models/` defines the MongoDB document shapes, relationships, password hashing, and token/session helpers.

Both MongoDB and Redis must be reachable before the server starts. A failed connection prevents the API from listening. On `SIGINT` or `SIGTERM`, the server stops accepting requests and Redis is closed gracefully.

## Data Model

All schemas use Mongoose timestamps, which add `createdAt` and `updatedAt` fields.

| Model     | Fields and behavior                                                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `User`    | Unique username and email, full name, about text, password hash, and the current raw refresh token. A pre-save hook hashes changed passwords with bcrypt using 10 salt rounds. |
| `Post`    | Title, author reference to `User`, optional subtitle, tag, and body. The schema lowercases title/subtitle/body and uppercases the tag.                                         |
| `Comment` | Required references to a `Post` and `User`, plus required content with a 1,000-character schema maximum.                                                                       |

The comment-list query populates the comment author's username and sorts comments newest first. Post reads currently return the post document without populating its author reference.

## Authentication And Sessions

### Login

The login controller accepts an email or username and a password. It looks up the user, compares the submitted password against the bcrypt hash, then creates access and refresh JWTs. Each token has a random UUID `jti` and a `type` claim; the access token also carries the user's ID, email, username, and full name. Access and refresh tokens use separate signing secrets and expiry settings.

On login, the backend writes session metadata to Redis using keys of the form `session:<type>:<jti>`. Records include the user ID, username, email, full name, token type, token ID, and issue time. Their Redis TTL is calculated from the configured day count. The raw refresh token is also stored on the user's MongoDB document for comparison during refresh.

The response sets `accessToken` and `refreshToken` cookies with `HttpOnly` and `SameSite=Strict`; `Secure` is enabled when `NODE_ENV=production`. The login JSON response also includes both tokens alongside the user details. The browser client sends cookies with API requests, so a future hardening pass could return only the user profile in JSON.

### Access-token validation

`verifyJWT` accepts the access token from the `accessToken` cookie or an `Authorization: Bearer <token>` header. It verifies the signature and expiry, checks that the JWT is typed as an access token and has a `jti`, then requires the matching Redis access-session record to exist and agree on token type, `jti`, and user ID. It finally loads the user without the password or refresh-token fields and attaches that user and the token ID to the request.

This Redis lookup makes deleting a session an immediate way to revoke an otherwise unexpired access token. In the current routes, this middleware protects comment creation and logout.

### Logout

Logout requires a valid access session. It deletes the current access-session key. If a refresh cookie contains a valid refresh JWT for the same user, logout also deletes that refresh-session key. It unsets the user's stored refresh token and clears both cookies.

### Refresh-token status

The refresh endpoint is registered and reads a refresh token from the cookie or request body. Completing the flow will require defining the token IDs before storing sessions and using the helper's `refreshToken` return value. See [Implementation Notes](#implementation-notes).

## Redis Caching

Blog and comment reads use a cache-aside flow: look in Redis first, fetch from MongoDB on a miss, serialize the result into Redis, and return the data. Cached values expire after one hour.

| Data                | Redis key                | Cache fill                                | Invalidation                                    |
| ------------------- | ------------------------ | ----------------------------------------- | ----------------------------------------------- |
| All posts           | `blogs:all`              | `GET /api/v1/blogs/getPosts`              | Cleared after post creation                     |
| One post            | `blog:<postId>`          | `GET /api/v1/blogs/getBlog/:id`           | Cleared when a comment is created for that post |
| Comments for a post | `comments:post:<postId>` | `GET /api/v1/comment/getComments/:postId` | Cleared when a comment is created for that post |

Session keys use a separate namespace, `session:access:<jti>` and `session:refresh:<jti>`, and have token-derived lifetimes rather than the one-hour content-cache lifetime. User-list reads are not cached.

## API Reference

All routes are mounted below `/api/v1`. Request bodies are JSON unless otherwise noted. The server limits JSON and URL-encoded bodies to 16 KB.

| Method | Route                           | Authentication | Purpose                                                         |
| ------ | ------------------------------- | -------------- | --------------------------------------------------------------- |
| `POST` | `/signUp/register`              | Public         | Create a user                                                   |
| `POST` | `/loginUser/login`              | Public         | Verify credentials, create token sessions, and set auth cookies |
| `POST` | `/logout/logOut`                | Access token   | Revoke the current session and clear cookies                    |
| `POST` | `/tokenRefresh/refresh-token`   | Refresh token  | Reads refresh token from cookie/body                            |
| `GET`  | `/users/getUsers`               | Public         | Return all users                                                |
| `POST` | `/create/writePost`             | Public in API  | Create a post                                                   |
| `GET`  | `/blogs/getPosts`               | Public         | Return all posts, using Redis cache                             |
| `GET`  | `/blogs/getBlog/:id`            | Public         | Return one post, using Redis cache                              |
| `POST` | `/comment/writeComment/:postId` | Access token   | Create a comment for an existing post                           |
| `GET`  | `/comment/getComments/:postId`  | Public         | Return comments for a post, using Redis cache                   |

### Request fields

Registration requires `username`, `email`, `fullName`, `about`, and `password`. Login accepts `email` or `username`, plus `password`.

Post creation requires `postName`, `postAuthor`, `postTag`, and `postContent`; `postSubContent` is optional. The controller resolves `postAuthor` by matching the submitted full name to an existing user. Despite the browser editor's sign-in gate, the API route itself does not currently require an access token.

Comment creation requires a `content` string and a valid access token, supplied through the cookie or bearer header. The route verifies the target post exists and uses the authenticated user's ID as the comment author.

Example comment request:

```http
POST /api/v1/comment/writeComment/POST_ID
Content-Type: application/json
Cookie: accessToken=ACCESS_TOKEN

{"content":"A thoughtful response."}
```

### Response and errors

The response helper provides a JSON envelope containing `success`, `data`, and `message`. Error responses created by `asyncHandler` contain `success: false` and a `message`, with the status taken from `ApiError` or defaulted to 500. Registration and post creation currently pass the human-readable message and resource in the opposite argument order from other handlers, so standardizing this response shape would make client integration more predictable.

## Database And Redis Configuration

The app accepts either `MONGO_URI` or `MONGODB_URI` and appends the database name `blog` when connecting. Provide a MongoDB URI without a database path. `REDIS_URL` is required; Redis connection setup pings the server before the API starts.

Create a root `.env` file with local values such as:

```env
PORT=8000
MONGO_URI=mongodb://localhost:27017
REDIS_URL=redis://localhost:6379
ACCESS_TOKEN_SECRET=replace-with-a-long-random-secret
REFRESH_TOKEN_SECRET=replace-with-a-different-long-random-secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=10d
```

Use separate, high-entropy signing secrets and keep `.env` out of source control. Expiry values should use day-based values such as `1d` and `10d`: JWT signing accepts duration strings, while Redis TTL and cookie max-age are calculated by parsing the leading integer as a count of days.

## Run Locally

Requirements: Node.js 20 or later, npm, a reachable MongoDB instance, and Redis 7.

```bash
npm install
npm run dev
```

The API listens on `PORT`, or port `5000` if `PORT` is unset. The static site is served from `public/` by the same Express server.

### Docker Compose

```bash
docker compose up --build
```

Compose runs the development API on host port `8000` and Redis on host port `6383` (Redis is port `6379` between containers). It does not include MongoDB. Set `MONGO_URI` in `.env` to a database reachable from inside the app container; `localhost` from inside that container refers to the container itself. Compose sets the app's Redis URL to the `redis` service.

The Dockerfile also defines a production image stage, which runs `node src/index.js`; Compose currently targets the development stage.

## Backend Project Layout

```text
src/
  app.js                  Express middleware, static files, and route mounts
  index.js                Environment loading, service startup, shutdown
  constants.js            MongoDB database name
  controllers/
    user.contollers.js    Registration, login, sessions, posts, and comments
  db/index.js             Mongoose connection
  middleware/
    auth.middleware.js    Access JWT and Redis-session validation
    multer.middleware.js  Disk-based upload middleware (not route-wired)
  models/
    user.models.js        User schema, bcrypt, JWT and Redis session helpers
    post.models.js        Post schema
    comment.models.js     Comment schema
  redis/index.js          Redis connect, access, and graceful close helpers
  routes/user.routes.js   Versioned API route handlers
  utils/
    ApiError.js           HTTP status-aware error type
    ApiResponse.js        JSON response envelope helper
    AyncHandler.js        Async controller error wrapper
    Cloudinary.js         Cloudinary upload helper (not route-wired)
public/                   Static browser client served by Express
```

## Frontend Overview

The static client includes a story feed, signup and login forms, a post editor, and a post detail/comments page. Its JavaScript calls the same-origin API and includes cookies in requests. It stores the displayed user profile in browser local storage for UI state; authorization for protected API operations is still performed by the server middleware.

## Implementation Notes

- **Token refresh:** Finish the session-ID and returned-token handling described above so the refresh route can complete the rotation flow.
- **Credential handling:** Signup currently logs the submitted password, and the login response includes token strings in JSON as well as setting HttpOnly cookies. Removing sensitive request logging and preferring cookie-only token delivery are sensible production-hardening steps.
- **Refresh-token storage:** The current refresh JWT is stored directly on the user document. A later security pass could replace it with a digest while preserving revocation behavior.
- **Post authorship:** Post creation currently looks up an author using the submitted full name. When creation is protected, the author can instead come directly from the authenticated user.
