# Campus Blog API

A backend for the VIT Chennai community to publish and discover campus stories. The project pairs a MongoDB document store with Redis for low-latency reads, and is structured to grow into a session-aware, event-driven service.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js with native ES modules |
| HTTP API | Express 5 |
| Primary datastore | MongoDB with Mongoose 9 |
| Cache and in-memory data store | Redis 7 with ioredis |
| Authentication building blocks | bcrypt, JSON Web Token (JWT), cookie-parser |
| Media integration | Cloudinary, Multer |
| Local development | Docker Compose, Nodemon |

## Architecture

```mermaid
flowchart LR
		Client[Web or mobile client] --> API[Express API]
		API --> Mongo[(MongoDB)]
		API --> Cache[(Redis cache)]
		API -. planned session validation .-> Sessions[(Redis sessions)]
		API -. planned domain events .-> Messaging[Redis Pub/Sub or Streams]
		API -. media integration .-> Cloudinary[Cloudinary]
```

MongoDB is the source of truth for users and posts. Redis accelerates frequently requested blog data; authentication-session storage and messaging are documented as extension points and are not wired into the current API yet.

## Redis: Cache, Sessions, Messaging

### Blog caching in place

The API uses a cache-aside pattern for blog reads:

- `GET /api/v1/blogs/getPosts` reads `blogs:all` from Redis first, then MongoDB on a cache miss.
- `GET /api/v1/blogs/getBlog/:id` uses a per-post key (`blog:<id>`) so one post cannot be returned for another post's ID.
- Cached values expire after one hour.
- Creating a post invalidates `blogs:all`, preventing the list endpoint from continuing to serve an old collection after a write.

### Session management direction

JWT and bcrypt dependencies are available, but login, refresh, logout, and Redis-backed session validation have not yet been implemented. A planned design is to store a short-lived session record in Redis for each login, keyed by a unique session ID and expiring with the refresh-token lifetime. HttpOnly cookies can carry the access and refresh tokens; middleware can verify the access JWT and confirm its session remains active in Redis. Refresh-token rotation and deleting the Redis session on logout enable revocation before token expiry.

Passwords should be hashed with bcrypt and persisted in MongoDB. Redis should contain session metadata only, never passwords or password hashes. Checking Redis on authenticated requests enables immediate revocation, with the tradeoff that protected endpoints depend on Redis availability.

### Pub/Sub and messaging direction

Redis Pub/Sub can distribute lightweight events such as `post.created` to independent consumers for notifications, activity feeds, or cache coordination. Publishers and subscribers should use separate Redis connections. Pub/Sub is at-most-once: a disconnected subscriber misses messages. For events that must survive restarts or be processed later, use Redis Streams (or a durable broker such as RabbitMQ or Kafka) with consumer groups instead.

## API Routes

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/signUp/register` | Register a user |
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

Implemented: user registration, post creation and retrieval, MongoDB persistence, Redis-backed blog caching, and graceful Redis shutdown.

Planned: password-based login, JWT cookie issuance and refresh, Redis session revocation, protected routes, and Redis Pub/Sub or Streams consumers. The presence of authentication libraries in the dependency list does not mean those flows are active yet.

## Roadmap

The current focus is the backend API. A dedicated frontend with a complete UI/UX is coming next, followed by deployment so the application can be used beyond a local development environment.
