# Requirements Document: Shelter Officer Management

## Introduction

This feature enables comprehensive management of shelter officers in a GIS-based earthquake disaster management system for the Bantul region. The system allows administrators to assign shelter officers to evacuation shelters and enables officers to manage and update information about their assigned shelters in real-time during disaster response operations.

## Glossary

- **System**: The disaster management application (backend and frontend)
- **Admin**: A user with ADMIN role who manages the system
- **Shelter_Officer**: A user with SHELTER_OFFICER role who manages assigned shelters
- **Shelter**: An evacuation facility that can house displaced persons during disasters
- **Officer_Assignment**: The relationship linking a Shelter_Officer to one or more Shelters
- **Occupancy**: The current number of people residing in a Shelter
- **Shelter_Condition**: The operational status of a Shelter (e.g., operational, damaged, full)
- **Dashboard**: The main interface showing relevant information to a Shelter_Officer

## Requirements

### Requirement 1: Database Schema for Officer Assignments

**User Story:** As a system architect, I want to establish database relationships between shelters and officers, so that the system can track which officers manage which shelters.

#### Acceptance Criteria

1. THE System SHALL store a foreign key reference from Shelter to User (officer)
2. WHEN a Shelter has an assigned officer, THE System SHALL allow that officer to be null (optional assignment)
3. WHEN querying a User with SHELTER_OFFICER role, THE System SHALL return all Shelters assigned to that officer
4. WHEN a Shelter_Officer is deleted, THE System SHALL set the officer reference in assigned Shelters to null
5. THE System SHALL enforce that only users with SHELTER_OFFICER role can be assigned to Shelters

### Requirement 2: Admin Officer Account Management

**User Story:** As an Admin, I want to create and manage shelter officer accounts, so that I can onboard new officers into the system.

#### Acceptance Criteria

1. WHEN an Admin creates a new officer account, THE System SHALL create a User with SHELTER_OFFICER role
2. WHEN creating an officer account, THE System SHALL require username, password, full name, and contact information
3. WHEN an Admin views the officer list, THE System SHALL display all users with SHELTER_OFFICER role
4. WHEN an Admin edits officer information, THE System SHALL update the User record and preserve the SHELTER_OFFICER role
5. WHEN an Admin deletes an officer account, THE System SHALL unassign all shelters from that officer before deletion

### Requirement 3: Admin Officer Assignment Management

**User Story:** As an Admin, I want to assign and unassign officers to shelters, so that I can distribute shelter management responsibilities.

#### Acceptance Criteria

1. WHEN an Admin assigns an officer to a Shelter, THE System SHALL update the Shelter's officer reference
2. WHEN an Admin unassigns an officer from a Shelter, THE System SHALL set the Shelter's officer reference to null
3. WHEN viewing a Shelter, THE System SHALL display the currently assigned officer if one exists
4. WHEN viewing an officer's profile, THE System SHALL display all Shelters assigned to that officer
5. THE System SHALL allow an officer to be assigned to multiple Shelters simultaneously

### Requirement 4: Shelter Officer Authentication

**User Story:** As a Shelter_Officer, I want to log in to the system with my credentials, so that I can access my assigned shelters.

#### Acceptance Criteria

1. WHEN a Shelter_Officer provides valid credentials, THE System SHALL authenticate and return a JWT token with SHELTER_OFFICER role
2. WHEN a Shelter_Officer accesses protected routes, THE System SHALL validate the JWT token and verify SHELTER_OFFICER role
3. IF an invalid token is provided, THEN THE System SHALL reject the request and return an authentication error
4. WHEN a Shelter_Officer logs out, THE System SHALL invalidate the session on the client side

### Requirement 5: Shelter Officer Dashboard

**User Story:** As a Shelter_Officer, I want to view a dashboard of my assigned shelters, so that I can see all shelters I manage in one place.

#### Acceptance Criteria

1. WHEN a Shelter_Officer accesses the dashboard, THE System SHALL display all Shelters assigned to that officer
2. WHEN displaying Shelters, THE System SHALL show shelter name, location, current occupancy, capacity, and condition
3. WHEN a Shelter_Officer has no assigned shelters, THE System SHALL display a message indicating no assignments
4. THE System SHALL display shelter statistics including total shelters managed, total capacity, and total current occupancy
5. WHEN shelter data changes, THE System SHALL reflect updates on the dashboard without requiring page refresh

### Requirement 6: Shelter Occupancy Management

**User Story:** As a Shelter_Officer, I want to update the current occupancy of my shelters, so that the system reflects real-time shelter capacity information.

#### Acceptance Criteria

1. WHEN a Shelter_Officer updates occupancy for an assigned Shelter, THE System SHALL save the new occupancy value
2. WHEN updating occupancy, THE System SHALL validate that the value is non-negative
3. WHEN updating occupancy, THE System SHALL validate that the value does not exceed the Shelter's maximum capacity
4. IF a Shelter_Officer attempts to update occupancy for a non-assigned Shelter, THEN THE System SHALL reject the request
5. WHEN occupancy is updated, THE System SHALL record the timestamp of the update

### Requirement 7: Shelter Condition Management

**User Story:** As a Shelter_Officer, I want to update the condition status of my shelters, so that administrators know the operational status of each facility.

#### Acceptance Criteria

1. WHEN a Shelter_Officer updates the condition of an assigned Shelter, THE System SHALL save the new condition value
2. THE System SHALL support condition values: OPERATIONAL, DAMAGED, FULL, CLOSED
3. IF a Shelter_Officer attempts to update condition for a non-assigned Shelter, THEN THE System SHALL reject the request
4. WHEN condition is updated, THE System SHALL record the timestamp of the update
5. WHEN a Shelter condition is set to FULL or CLOSED, THE System SHALL display a visual indicator on the dashboard

### Requirement 8: Authorization and Access Control

**User Story:** As a system architect, I want role-based access control for shelter officer features, so that only authorized users can access officer-specific functionality.

#### Acceptance Criteria

1. WHEN a user without SHELTER_OFFICER role attempts to access officer endpoints, THE System SHALL reject the request with authorization error
2. WHEN a Shelter_Officer attempts to modify a Shelter not assigned to them, THE System SHALL reject the request
3. WHEN an Admin accesses officer management endpoints, THE System SHALL allow full access to all officer and assignment operations
4. THE System SHALL validate role permissions on both backend API endpoints and frontend route access
5. WHEN authorization fails, THE System SHALL return appropriate HTTP status codes (401 for authentication, 403 for authorization)

### Requirement 9: Admin Officer Overview

**User Story:** As an Admin, I want to view an overview of all officers and their assignments, so that I can monitor shelter management coverage.

#### Acceptance Criteria

1. WHEN an Admin views the officer overview, THE System SHALL display all Shelter_Officers with their assignment counts
2. WHEN displaying officer information, THE System SHALL show officer name, contact information, and number of assigned shelters
3. WHEN an Admin selects an officer, THE System SHALL display detailed information including all assigned Shelters
4. THE System SHALL highlight officers with no shelter assignments
5. THE System SHALL provide filtering and search capabilities for the officer list

### Requirement 10: Data Integrity and Validation

**User Story:** As a system architect, I want data validation and integrity constraints, so that the system maintains consistent and valid data.

#### Acceptance Criteria

1. WHEN creating or updating officer assignments, THE System SHALL validate that the User has SHELTER_OFFICER role
2. WHEN updating Shelter data, THE System SHALL validate that all required fields are present and properly formatted
3. WHEN deleting a Shelter, THE System SHALL handle the officer assignment relationship appropriately
4. THE System SHALL prevent duplicate officer assignments to the same Shelter
5. WHEN database operations fail, THE System SHALL rollback transactions and return descriptive error messages
