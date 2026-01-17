# Seller List Management - Implementation Plan

## Overview

This implementation plan provides a comprehensive roadmap for building the Seller List Management System - a real estate brokerage platform managing 10,000+ seller records with 100+ fields per record, handling ~10 new appraisal requests daily.

**System Scope:**
- Automated property valuation
- Follow-up activity tracking (phone, email, SMS)
- Visit appointment scheduling with Google Calendar integration
- Gmail integration for appraisal emails
- Google Chat notifications
- Google Sheets bidirectional sync
- Duplicate detection
- Activity logging and audit trails

**Technology Stack:**
- Frontend: React + TypeScript + Zustand
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL
- Cache: Redis
- External APIs: Gmail, Google Calendar, Google Chat, Google Sheets

## Implementation Phases

### Phase 1: Foundation (Database & Core Services)
**Goal:** Establish database schema and core business logic

**Tasks:**
1. Database schema migrations (9 tables)
2. Encryption service (AES-256-GCM)
3. Seller number generation service
4. Seller CRUD service
5. Duplicate detection service

**Deliverables:**
- All database tables created with proper indexes
- Seller creation, retrieval, update, deletion working
- Personal information encrypted at rest
- Duplicate detection by phone/email functional

**Checkpoint:** Verify all CRUD operations work correctly with encrypted data

---

### Phase 2: Property & Valuation (Business Logic)
**Goal:** Implement property management and automated valuation

**Tasks:**
1. Property service (CRUD operations)
2. Valuation engine (calculation logic)
3. Valuation service (history tracking)

**Deliverables:**
- Property information storage and retrieval
- Automated valuation calculation for land/buildings
- Valuation history tracking
- Abnormal value detection

**Checkpoint:** Verify valuation calculations produce accurate results

---

### Phase 3: Activity & Communication (Follow-up Management)
**Goal:** Enable activity tracking and communication features

**Tasks:**
1. Activity log service
2. Follow-up service
3. Appointment service
4. Email service
5. Gmail API integration
6. Calendar API integration

**Deliverables:**
- Activity logging for all user actions
- Follow-up scheduling and tracking
- Visit appointment management
- Email sending via Gmail API
- Google Calendar event creation

**Checkpoint:** Verify appointments sync to Google Calendar and emails send successfully

---

### Phase 4: Data Synchronization (Google Sheets Integration)
**Goal:** Implement bidirectional sync with Google Sheets

**Tasks:**
1. Google Sheets client
2. Spreadsheet sync service
3. Column mapper
4. Sync conflict resolution

**Deliverables:**
- Read data from Google Sheets
- Write data to Google Sheets
- Bidirectional sync with conflict detection
- Sync logging and error handling

**Checkpoint:** Verify data syncs correctly in both directions

---

### Phase 5: Backend API (REST Endpoints)
**Goal:** Expose all functionality via REST API

**Tasks:**
1. Seller routes (CRUD + search)
2. Property routes
3. Valuation routes
4. Activity routes
5. Follow-up routes
6. Appointment routes
7. Email routes
8. Sync routes
9. Authentication middleware
10. Validation middleware

**Deliverables:**
- Complete REST API with all endpoints
- Request validation
- Authentication/authorization
- Error handling
- API documentation

**Checkpoint:** Verify all API endpoints work correctly with proper error handling

---

### Phase 6: Frontend Core (UI Components)
**Goal:** Build main user interface components

**Tasks:**
1. Seller list page (with pagination, search, filters)
2. Seller detail page (comprehensive form)
3. New seller page (creation form)
4. Property form and list
5. Valuation form and list
6. Activity log display
7. Follow-up management UI
8. Appointment management UI
9. Email composer

**Deliverables:**
- Complete seller management UI
- Property and valuation management UI
- Activity and communication UI
- Responsive design

**Checkpoint:** Verify all UI components render correctly and handle user interactions

---

### Phase 7: State Management & Integration
**Goal:** Connect frontend to backend with proper state management

**Tasks:**
1. Zustand stores (seller, property, valuation, activity)
2. API client service
3. Error handling
4. Loading states
5. Form validation

**Deliverables:**
- State management for all entities
- API integration with error handling
- Real-time validation
- User feedback (loading, success, error)

**Checkpoint:** Verify data flows correctly between frontend and backend

---

### Phase 8: Security & Performance
**Goal:** Harden security and optimize performance

**Tasks:**
1. Authentication middleware (JWT)
2. Authorization middleware (RBAC)
3. CSRF protection
4. Input sanitization
5. Redis caching
6. Database query optimization
7. Cache invalidation strategy

**Deliverables:**
- Secure authentication/authorization
- Protected against common attacks (XSS, CSRF, SQL injection)
- Optimized database queries
- Caching for frequently accessed data
- Sub-3-second page load times

**Checkpoint:** Verify security measures work and performance targets are met

---

### Phase 9: Monitoring & Operations
**Goal:** Enable production monitoring and operations

**Tasks:**
1. Structured logging
2. Metrics collection
3. Alerting setup
4. API documentation
5. User guide
6. Deployment guide
7. Operations manual

**Deliverables:**
- Comprehensive logging
- Performance metrics dashboard
- Automated alerts
- Complete documentation
- Deployment scripts
- CI/CD pipeline

**Checkpoint:** Verify monitoring captures all critical metrics and alerts fire correctly

---

### Phase 10: Testing & Quality Assurance (Optional but Recommended)
**Goal:** Ensure system reliability through comprehensive testing

**Tasks:**
1. Unit tests for all services
2. Integration tests for workflows
3. Property-based tests (25 properties)
4. Performance tests
5. Security tests
6. Manual testing

**Deliverables:**
- 80%+ code coverage
- All critical paths tested
- Property-based tests (100+ iterations each)
- Performance benchmarks met
- Security vulnerabilities addressed

**Checkpoint:** Verify all tests pass and system meets quality standards

---

## Key Requirements Summary

### Functional Requirements (30 total)

**Core Seller Management (R1-R1.14):**
- Seller registration with personal info
- Unique seller number generation (AA + 5 digits)
- Personal information encryption
- Duplicate detection by phone/email
- Seller search and filtering
- Status management

**Property & Valuation (R2-R3):**
- Property information storage
- Automated valuation calculation
- Valuation history tracking
- Abnormal value detection

**Communication (R4-R7, R13):**
- Activity logging (phone, email, SMS)
- Follow-up scheduling
- Email sending via Gmail
- Email template management

**Appointments (R6, R12):**
- Visit appointment scheduling
- Google Calendar integration
- Appointment notifications

**Data Sync (R8, R14):**
- Google Sheets bidirectional sync
- Manual refresh
- Automatic background sync (5-minute freshness)
- Sync conflict resolution

**Notifications (R15):**
- Google Chat notifications
- Multiple notification types

### Non-Functional Requirements

**Performance:**
- List page load < 3 seconds (10,000+ records)
- Search response < 1 second
- Support 10+ concurrent users

**Security:**
- AES-256-GCM encryption for PII
- Google OAuth 2.0 authentication
- CSRF protection
- Input sanitization
- Audit logging

**Scalability:**
- Handle 10,000+ seller records
- Support ~10 new records daily
- Efficient pagination and lazy loading

**Reliability:**
- Graceful degradation on API failures
- Retry logic with exponential backoff
- Data integrity with transactions
- Optimistic locking for concurrent updates

## Critical Design Decisions

### 1. Encryption Strategy
**Decision:** Field-level encryption for PII using AES-256-GCM
**Rationale:** Protects sensitive data at rest while allowing non-PII fields to be indexed for search
**Impact:** Encrypted fields cannot be used in WHERE clauses; use hashing for searchable encrypted fields

### 2. Seller Number Format
**Decision:** "AA" prefix + 5-digit sequential number (AA00001-AA99999)
**Rationale:** Human-readable, sortable, supports up to 99,999 sellers
**Impact:** Need unique constraint and retry logic for concurrent generation

### 3. Duplicate Detection
**Decision:** Check phone1, phone2, and email on seller creation
**Rationale:** Prevents duplicate entries while allowing legitimate duplicates (e.g., family members)
**Impact:** Requires indexes on phone/email fields; shows warning but allows override

### 4. Caching Strategy
**Decision:** Redis cache with 5-minute TTL, automatic background refresh
**Rationale:** Balances data freshness with performance
**Impact:** Need cache invalidation on updates; background jobs for refresh

### 5. Google Sheets Sync
**Decision:** Bidirectional sync with conflict detection
**Rationale:** Sheets is source of truth for some users; need to support both workflows
**Impact:** Complex conflict resolution; need sync logs and manual resolution UI

### 6. Status-Dependent Required Fields
**Decision:** Competitor information required only for specific statuses
**Rationale:** Reduces data entry burden while ensuring critical info is captured
**Impact:** Dynamic form validation based on status

### 7. Activity Logging
**Decision:** Immutable activity logs with automatic user attribution
**Rationale:** Provides audit trail and accountability
**Impact:** Cannot edit/delete activities; need soft delete for corrections

### 8. API Rate Limiting
**Decision:** Queue emails when Gmail rate limit approached
**Rationale:** Prevents API quota exhaustion
**Impact:** Need background job for queue processing; async email sending

## Data Model Overview

### Core Entities

**Seller** (100+ fields)
- Identification: id, seller_number
- Personal Info (encrypted): name, address, phone1, phone2, email
- Property Info: property_type, property_address, land_area, building_area, structure
- Valuation: valuation1-3, post_visit_valuation, fixed_asset_tax_road_price
- Inquiry: inquiry_site, inquiry_date, inquiry_reason
- Follow-up: status, confidence, next_call_date, unreachable
- Visit: visit_date, visit_time, visit_assignee, visit_notes
- Assignment: appraisal_assignee, phone_assignee
- Competitor: competitor_name, loss_factors, loss_countermeasures
- Metadata: created_at, updated_at, created_by, last_modified_by

**Property**
- seller_id (FK)
- property_type, address, land_area, building_area, structure, build_year
- seller_situation

**Valuation**
- seller_id (FK)
- amount1, amount2, amount3
- calculation_method, calculation_basis
- is_post_visit

**Activity**
- seller_id (FK)
- activity_type, timestamp, performed_by
- Type-specific data (phone, email, SMS, visit)

**Follow-up**
- seller_id (FK)
- follow_up_date, follow_up_type, notes, completed

**Appointment**
- seller_id (FK)
- appointment_date, location, assignee
- google_calendar_event_id

**Email**
- seller_id (FK)
- subject, body, sent_at, gmail_message_id

**Sync Log**
- sync_type, status, records_updated, error_message

**Audit Log**
- table_name, record_id, action, old_values, new_values

## Testing Strategy

### Unit Tests (Optional but Recommended)
- Test individual services in isolation
- Mock external dependencies
- Target: 80%+ code coverage
- Focus on business logic and error handling

### Integration Tests (Optional but Recommended)
- Test service interactions
- Test database transactions
- Test API integrations (with test accounts)
- Test end-to-end workflows

### Property-Based Tests (Optional but Recommended)
- 25 properties defined in design document
- Minimum 100 iterations per property
- Use fast-check library
- Test universal invariants

### Manual Testing (Required)
- UI/UX testing checklist
- Integration testing checklist
- Business logic testing checklist

## Error Handling Patterns

### Validation Errors
- Display inline error messages
- Prevent form submission
- Provide helpful examples

### Integration Errors
- Exponential backoff retry
- User-friendly error messages
- Manual retry options
- Detailed error logging

### Data Integrity Errors
- Database transactions
- Optimistic locking
- Conflict resolution UI
- Audit logs

### Performance Errors
- Request timeouts
- Pagination for large results
- Cache fallback
- Graceful degradation

## Deployment Checklist

### Pre-Deployment
- [ ] All database migrations tested
- [ ] Environment variables configured
- [ ] External API credentials verified
- [ ] SSL certificates installed
- [ ] Backup strategy in place

### Deployment
- [ ] Run database migrations
- [ ] Deploy backend (zero-downtime)
- [ ] Deploy frontend (CDN cache invalidation)
- [ ] Run smoke tests
- [ ] Monitor error rates

### Post-Deployment
- [ ] Verify all integrations working
- [ ] Check monitoring dashboards
- [ ] Review error logs
- [ ] Test critical user workflows
- [ ] Prepare rollback if needed

## Success Criteria

### Functional
- [ ] All 30 requirements implemented
- [ ] All CRUD operations working
- [ ] All integrations functional (Gmail, Calendar, Chat, Sheets)
- [ ] Duplicate detection working
- [ ] Encryption/decryption working

### Performance
- [ ] List page loads in < 3 seconds
- [ ] Search responds in < 1 second
- [ ] Supports 10+ concurrent users
- [ ] Handles 10,000+ records efficiently

### Security
- [ ] PII encrypted at rest
- [ ] Authentication/authorization working
- [ ] Protected against common attacks
- [ ] Audit logging functional

### Quality
- [ ] All critical paths tested
- [ ] Documentation complete
- [ ] Monitoring and alerting configured
- [ ] Deployment process documented

## Next Steps

1. **Review this plan** with stakeholders
2. **Confirm priorities** - which phases are must-have vs nice-to-have
3. **Allocate resources** - developers, timeline, budget
4. **Set up development environment** - databases, APIs, tools
5. **Begin Phase 1** - database schema and core services

## Questions for Stakeholder Review

1. **Scope:** Are all 30 requirements in scope for initial release, or can some be deferred?
2. **Testing:** Should we implement the optional testing tasks (unit, integration, property-based)?
3. **Timeline:** What is the target launch date?
4. **Resources:** How many developers are available?
5. **Priorities:** Which features are most critical for launch?
6. **External APIs:** Are Google API credentials and test accounts ready?
7. **Data Migration:** Is there existing data that needs to be migrated?
8. **Training:** Will users need training on the new system?

---

**Document Status:** Ready for Review
**Last Updated:** 2026-01-03
**Version:** 1.0
