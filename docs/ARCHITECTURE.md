# Architecture Decision Records

## Database: SQLite with Prisma ORM
**Decision**: SQLite for development, PostgreSQL-ready via Prisma
**Rationale**: Zero-config for reviewers, production-ready abstraction
**Trade-offs**: Limited concurrent writes vs ease of setup

## State Management: Server-Centric with Optimistic UI
**Decision**: Server as source of truth, client-side optimistic updates
**Rationale**: Simplifies state sync, better for collaborative features
**Alternative Considered**: Redux - overkill for current scope

## Algorithm: Critical Path Method Implementation
**Decision**: Two-pass algorithm (forward/backward) with O(V+E) complexity
**Rationale**: Industry-standard for project scheduling
**Optimization**: Memoized calculations to prevent re-computation

## API Design: RESTful with Nested Resources
**Decision**: /api/todos/[id]/dependencies pattern
**Rationale**: Clear resource relationships, follows REST conventions
**Trade-offs**: More endpoints vs GraphQL flexibility

## Image Caching: Multi-Layer Strategy
**Decision**: In-memory + database + CDN caching
**Rationale**: Balances API rate limits with performance
**Implementation**: 10k/month Pexels limit handled gracefully