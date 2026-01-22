# Requirements Document

## Introduction

This feature addresses a critical bug where valuation appointments assigned to one employee (e.g., Ikuno/生野) are incorrectly created in another employee's calendar (e.g., Kunihiro/国広). The system must ensure that when a user creates an appointment and assigns it to a specific employee using their initials, the calendar event is created in the correct employee's Google Calendar.

## Glossary

- **System**: The real estate CRM application
- **Appointment**: A scheduled valuation visit with a seller
- **Assignee**: The employee (営担) who is assigned to handle the appointment
- **Creator**: The employee who creates the appointment in the system
- **Calendar Event**: An event in Google Calendar corresponding to an appointment
- **Employee Initials**: Short identifier for employees (e.g., "生野" for Ikuno, "国" for Kunihiro)

## Requirements

### Requirement 1

**User Story:** As a user creating an appointment, I want the calendar event to be created in the assigned employee's calendar, so that the correct person receives the notification and sees it in their schedule.

#### Acceptance Criteria

1. WHEN a user creates an appointment with an assigned employee THEN the system SHALL retrieve the correct employee ID from the provided initials
2. WHEN the system creates a Google Calendar event THEN the system SHALL use the assigned employee's email address as the calendar ID
3. WHEN the calendar event is created THEN the system SHALL verify the event was created in the correct employee's calendar
4. WHEN the appointment is saved to the database THEN the system SHALL store the assigned employee ID in the assigned_employee_id field
5. WHEN an appointment creation fails due to incorrect calendar assignment THEN the system SHALL log detailed information about which employee's calendar was used

### Requirement 2

**User Story:** As a developer debugging calendar issues, I want comprehensive logging of calendar operations, so that I can quickly identify where calendar events are being created incorrectly.

#### Acceptance Criteria

1. WHEN the system retrieves an employee's email for calendar operations THEN the system SHALL log the employee ID and email address
2. WHEN the system creates a calendar event THEN the system SHALL log the calendar ID (email) being used
3. WHEN the system completes a calendar event creation THEN the system SHALL log the event ID and confirm which calendar it was created in
4. WHEN an employee lookup fails THEN the system SHALL log the initials provided and the reason for failure

### Requirement 3

**User Story:** As a system administrator, I want to validate that employee data is correctly configured, so that calendar assignments work reliably.

#### Acceptance Criteria

1. WHEN the system looks up an employee by initials THEN the system SHALL verify the employee has an active status
2. WHEN the system retrieves an employee for calendar operations THEN the system SHALL verify the employee has a valid email address
3. WHEN an employee is missing required data THEN the system SHALL return a clear error message indicating what data is missing
4. WHEN multiple employees match the same initials THEN the system SHALL return an error indicating ambiguous initials
