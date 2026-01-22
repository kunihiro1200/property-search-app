# Requirements Document

## Introduction

This feature enables the system to create calendar events in the assigned employee's Google Calendar instead of always using the logged-in user's calendar. When creating an appointment and assigning it to a specific employee (営担), the system should create the calendar event in that employee's Google Calendar.

## Glossary

- **System**: The real estate CRM application
- **Employee**: A user of the system who can be assigned appointments
- **Assigned Employee**: The employee (営担) who is assigned to handle a specific appointment
- **Calendar Event**: An event in Google Calendar representing an appointment
- **OAuth Token**: Authentication credentials for accessing a user's Google Calendar
- **Primary Calendar**: The default calendar in a user's Google Calendar account

## Requirements

### Requirement 1

**User Story:** As a user creating an appointment, I want the calendar event to be created in the assigned employee's calendar, so that the right person receives the notification and can see it in their schedule.

#### Acceptance Criteria

1. WHEN a user creates an appointment and assigns it to an employee THEN the system SHALL create the calendar event in the assigned employee's Google Calendar
2. WHEN the assigned employee has not connected their Google Calendar THEN the system SHALL prevent appointment creation and display an error message
3. WHEN the assigned employee's OAuth token is expired THEN the system SHALL refresh the token automatically before creating the event
4. WHEN the assigned employee's OAuth token cannot be refreshed THEN the system SHALL notify the user that the assigned employee needs to reconnect their Google Calendar

### Requirement 2

**User Story:** As an employee, I want to connect my Google Calendar to the system, so that appointments assigned to me are automatically added to my calendar.

#### Acceptance Criteria

1. WHEN an employee connects their Google Calendar THEN the system SHALL store their OAuth tokens securely
2. WHEN an employee's OAuth tokens are stored THEN the system SHALL associate them with the employee's account
3. WHEN an employee disconnects their Google Calendar THEN the system SHALL remove their stored OAuth tokens
4. WHEN an employee views their profile THEN the system SHALL display their Google Calendar connection status

### Requirement 3

**User Story:** As a system administrator, I want to see which employees have connected their Google Calendar, so that I can ensure all team members are properly set up.

#### Acceptance Criteria

1. WHEN viewing the employee list THEN the system SHALL display each employee's Google Calendar connection status
2. WHEN an employee's token is expired or invalid THEN the system SHALL indicate this in the connection status
3. WHEN filtering employees THEN the system SHALL allow filtering by Google Calendar connection status
