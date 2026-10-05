<p align="center">
	<img src="public/images/campus-chronicle-banner.svg" alt="Campus Chronicle - stories from campus" width="100%" />
</p>

# Campus Chronicle

A community publishing platform for VIT Chennai, built to share the ideas, people, and stories shaping campus life. This repository contains the backend API, powered by MongoDB and Redis, with RabbitMQ planned for asynchronous messaging.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js with native ES modules |
| HTTP API | Express 5 |
| Primary datastore | MongoDB with Mongoose 9 |
| Cache and in-memory data store | Redis 7 with ioredis |
| Message broker (planned) | RabbitMQ with `rabbitmq-client` |
| Authentication building blocks | bcrypt, JSON Web Token (JWT), cookie-parser |
| Media integration | Cloudinary, Multer |
| Local development | Docker Compose, Nodemon |

## Architecture

```mermaid
flowchart LR
		Client[Web or mobile client] --> API[Express API]
		API --> Mongo[(MongoDB)]
		API --> Cache[(Redis cache)]
		API -->|login: write expiring token sessions| Sessions[(Redis sessions)]
		API -. planned session validation .-> Sessions
		API -. planned domain events .-> Messaging[RabbitMQ]
		API -. media integration .-> Cloudinary[Cloudinary]
```

MongoDB is the source of truth for users and posts. Redis accelerates frequently requested blog data and stores expiring access- and refresh-token session records created during login. Request-time session validation, refresh, logout/revocation, and RabbitMQ messaging are not implemented yet.

## Redis: Cache, Sessions, Messaging

### Blog caching in place

The API uses a cache-aside pattern for blog reads:

- `GET /api/v1/blogs/getPosts` reads `blogs:all` from Redis first, then MongoDB on a cache miss.
- `GET /api/v1/blogs/getBlog/:id` uses a per-post key (`blog:<id>`) so one post cannot be returned for another post's ID.
- Cached values expire after one hour.
- Creating a post invalidates `blogs:all`, preventing the list endpoint from continuing to serve an old collection after a write.

### Login sessions in progress

`POST /api/v1/loginUser/login` checks the user's password, creates access and refresh JWTs with unique `jti` values, writes session metadata to Redis under `session:access:<jti>` and `session:refresh:<jti>`, and sets both tokens in HttpOnly cookies. Redis TTLs and cookie lifetimes are derived from the day-based expiry settings. The login response currently also includes the raw tokens in its JSON body; for production, prefer returning only safe user details and relying on the HttpOnly cookies.

Passwords are hashed with bcrypt and persisted in MongoDB. Redis session records contain user/session metadata, not passwords or password hashes. The records are created at login, but no middleware currently checks them on protected requests, and refresh-token rotation and logout revocation are still to be implemented.

## RabbitMQ: Messaging Roadmap

RabbitMQ is planned for asynchronous application events such as `post.created`, allowing the API to hand off work to independent consumers for notifications, activity-feed updates, or media processing. Exchanges, routing keys, durable queues, publisher confirms, and acknowledgements can provide controlled routing and reliable processing. The `rabbitmq-client` dependency is installed, but broker connection setup, publishers, and consumers have not yet been implemented.

Redis remains responsible for fast blog caching and is the planned store for login-session metadata; RabbitMQ will handle asynchronous message delivery. Keeping those responsibilities separate lets each service address a distinct workload.

## API Routes

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/signUp/register` | Register a user |
| `POST` | `/api/v1/loginUser/login` | Log in; issue access and refresh tokens |
| `GET` | `/api/v1/users/getUsers` | List users |
| `POST` | `/api/v1/create/writePost` | Create a blog post |
| `GET` | `/api/v1/blogs/getPosts` | List blog posts |
| `GET` | `/api/v1/blogs/getBlog/:id` | Fetch a post by MongoDB ID |

## Run Locally

### Requirements

- Node.js and npm
- Docker with the Compose plugin, or a reachable Redis instance
- A reachable MongoDB instance

Create a `.env` file in the project root:

```env
PORT=8000
MONGODB_URI=mongodb://localhost:27017
REDIS_URL=redis://localhost:6379
ACCESS_TOKEN_SECRET=replace-with-a-long-random-secret
REFRESH_TOKEN_SECRET=replace-with-a-different-long-random-secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=10d

# Optional: required only when using Cloudinary uploads
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

The application appends the `blog` database name to `MONGODB_URI`. Use a MongoDB URI without a trailing database name, for example `mongodb://localhost:27017`.

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Alternatively, Docker Compose starts the API and Redis containers:

```bash
docker compose up --build
```

The Compose setup does not include MongoDB; configure `MONGODB_URI` in `.env` to point to a MongoDB instance reachable from the app container. When using a MongoDB service on the host, `localhost` inside the app container refers to the container itself, so use the appropriate host address or add MongoDB to Compose.

## Project Layout

```text
src/
	controllers/   Request handlers for users and posts
	db/            MongoDB connection
	middleware/    Request middleware
	models/        Mongoose user and post schemas
	redis/         Redis connection and shutdown lifecycle
	routes/        Express API routes
	utils/         API response, error, and upload utilities
```

## Current Scope

Implemented: user registration and password hashing, password-based login, access/refresh JWT issuance in cookies, expiring Redis session-record creation at login, post creation and retrieval, MongoDB persistence, Redis-backed blog caching, and graceful Redis shutdown.

Planned: Redis-backed request/session validation, token refresh and rotation, logout/session revocation, protected routes, and RabbitMQ publishers and consumers. Login currently returns the tokens in both cookies and its JSON body; session records are stored but are not yet checked on subsequent requests.

## Roadmap

Campus Chronicle will have a dedicated frontend for people who want to use the application directly. The API will also remain available to run locally for developers and anyone who prefers a self-hosted setup, alongside a planned globally accessible deployment for the hosted frontend. This provides both a ready-to-use web experience and the option to run your own local API instance.
