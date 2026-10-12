<p align="center">
	<img src="public/images/campus-chronicle-banner.svg" alt="Campus Chronicle - stories from campus" width="100%" />
</p>

# Campus Chronicle

A backend API for a community publishing platform for VIT Chennai. It provides user registration and login, blog posts, comments, and Redis-backed caching and login sessions.

## Technology Stack

| Layer                   | Technology                                |
| ----------------------- | ----------------------------------------- |
| Runtime                 | Node.js with native ES modules            |
| HTTP API                | Express 5                                 |
| Primary datastore       | MongoDB with Mongoose 9                   |
| Cache and session store | Redis 7 with ioredis                      |
| Authentication          | bcrypt, JSON Web Tokens, HttpOnly cookies |
| Local development       | Docker Compose, Nodemon                   |

## What It Does

MongoDB stores users, posts, and comments. Redis caches blog and comment reads for one hour and stores expiring login-session records. Creating a post clears the all-posts cache; creating a comment clears that post's comment and detail caches. Passwords are hashed with bcrypt. Access tokens are checked against Redis, and the authenticated comment and logout routes require a valid access token.

## API Routes

| Method | Route                                  | Purpose                                                                    |
| ------ | -------------------------------------- | -------------------------------------------------------------------------- |
| `POST` | `/api/v1/signUp/register`              | Register a user                                                            |
| `POST` | `/api/v1/loginUser/login`              | Log in and issue access and refresh tokens                                 |
| `POST` | `/api/v1/logout/logOut`                | Revoke the current session and clear auth cookies; requires authentication |
| `POST` | `/api/v1/tokenRefresh/refresh-token`   | Refresh tokens; currently incomplete (see Limitations)                     |
| `GET`  | `/api/v1/users/getUsers`               | List users                                                                 |
| `POST` | `/api/v1/create/writePost`             | Create a blog post                                                         |
| `GET`  | `/api/v1/blogs/getPosts`               | List blog posts                                                            |
| `GET`  | `/api/v1/blogs/getBlog/:id`            | Fetch a post by MongoDB ID                                                 |
| `POST` | `/api/v1/comment/writeComment/:postId` | Create a comment; requires authentication                                  |
| `GET`  | `/api/v1/comment/getComments/:postId`  | Fetch comments for a post                                                  |

## Run Locally

### Requirements

- Node.js 20 or later and npm
- A reachable MongoDB instance
- Redis 7, either installed locally or started with Docker Compose

Create a `.env` file in the project root. Set MongoDB to a URI without a database name; the app appends `blog` when it connects.

```env
PORT=8000
MONGO_URI=mongodb://localhost:27017
REDIS_URL=redis://localhost:6379
ACCESS_TOKEN_SECRET=replace-with-a-long-random-secret
REFRESH_TOKEN_SECRET=replace-with-a-different-long-random-secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=10d
```

Keep `.env` private and do not commit credentials. The app accepts either `MONGO_URI` or `MONGODB_URI`.

Install dependencies and start the API:

```bash
npm install
npm run dev
```

The API uses port `5000` if `PORT` is unset. To start the API and Redis with Docker Compose instead:

```bash
docker compose up --build
```

Compose maps the API to port `8000` and starts Redis, but does not start MongoDB. Configure `MONGO_URI` in `.env` to point to a MongoDB instance reachable from inside the app container. In Compose, the app's Redis connection is configured to use the `redis` service.

## Project Layout

```text
src/
  app.js                  Express app and route mounting
  index.js                Database connections and server lifecycle
  constants.js            MongoDB database name
  controllers/            User, post, and comment handlers
  db/                     MongoDB connection
  middleware/             Authentication and upload middleware
  models/                 User, post, and comment schemas
  redis/                  Redis connection and shutdown lifecycle
  routes/                 API route definitions
  utils/                  API response, error, and Cloudinary helpers
public/                   Static files
```

## Limitations

The refresh-token route is present but its current handler references token IDs before defining them and does not correctly return the generated refresh token, so refresh requests are not reliable. Post creation and user listing are not currently protected by authentication. The login response includes the access and refresh tokens in its JSON body as well as setting cookies; review this behavior before deploying publicly.
