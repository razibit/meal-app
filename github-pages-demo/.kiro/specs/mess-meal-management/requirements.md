# Requirements Document

## Introduction

The Mess Meal Management System is a progressive web application designed to manage daily meal planning, tracking, and communication for a 16-member boarding mess. The system enables members to register their meal preferences (morning and night), view meal details, communicate via chat, and track monthly meal consumption. The application prioritizes lightweight performance, real-time updates, and mobile-first responsive design.

## Glossary

- **System**: The Mess Meal Management Web Application
- **Member**: A registered boarder who uses the system to manage meals
- **Meal Period**: Either "Morning" (breakfast/lunch) or "Night" (dinner)
- **Meal Registration**: The act of a member indicating they will consume a meal during a specific period
- **Cutoff Time**: The deadline after which meal registrations cannot be modified (7:00 AM for morning, 6:00 PM for night)
- **Meal Details**: The menu description for a specific date and meal period
- **Mention**: A chat message that references a specific member using @username syntax
- **PWA**: Progressive Web Application - a web app that can be installed and work offline

## Requirements

### Requirement 1: Meal Registration Management

**User Story:** As a mess member, I want to register and unregister my meals for morning and night periods, so that the mess can prepare the correct amount of food.

#### Acceptance Criteria

1. WHEN a member accesses the home tab, THE System SHALL display the current date and separate toggles for morning and night meal periods
2. WHEN a member selects a meal period before the cutoff time, THE System SHALL allow the member to add or remove their meal registration for that period
3. WHEN the current time reaches 7:00 AM, THE System SHALL prevent any member from modifying morning meal registrations for the current day
4. WHEN the current time reaches 6:00 PM, THE System SHALL prevent any member from modifying night meal registrations for the current day
5. WHEN a member attempts to modify a meal registration after the cutoff time, THE System SHALL display an error message indicating the cutoff has passed

### Requirement 2: Real-Time Meal Count Display

**User Story:** As a mess member, I want to see live meal counts and participant lists, so that I know how many people are eating and who they are.

#### Acceptance Criteria

1. THE System SHALL display the total count of members registered for morning meals and night meals on the home tab
2. WHEN a member clicks on the meal count, THE System SHALL display a list of member names who are registered for that meal period
3. WHEN any member adds or removes a meal registration, THE System SHALL update the meal counts for all connected members within 2 seconds
4. WHEN a member clicks the people icon in the top-right corner, THE System SHALL display a modal with the complete list of all 16 mess members
5. THE System SHALL display meal counts separately for boiled rice and atop rice preferences with participant counts

### Requirement 3: Meal Details and Menu Management

**User Story:** As a mess member, I want to view and edit the daily meal menu, so that everyone knows what food is being served.

#### Acceptance Criteria

1. THE System SHALL display an editable meal details section showing the menu for morning and night periods
2. WHEN any member edits the meal details, THE System SHALL save the changes and display them to all members within 2 seconds
3. THE System SHALL record which member last updated the meal details and the timestamp of the update
4. WHEN a member edits meal details, THE System SHALL apply the changes optimistically in the UI before server confirmation

### Requirement 4: Post-Cutoff Violation Notifications

**User Story:** As a mess member, I want to be notified when someone modifies their meal after the cutoff time, so that we can track violations of mess rules.

#### Acceptance Criteria

1. WHEN a member adds or removes a meal registration after the 7:00 AM cutoff for morning meals, THE System SHALL post a red-colored notification message in the chat indicating the member name and action
2. WHEN a member adds or removes a meal registration after the 6:00 PM cutoff for night meals, THE System SHALL post a red-colored notification message in the chat indicating the member name and action
3. THE System SHALL format violation messages as "X has added/removed their meal after [cutoff time]"

### Requirement 5: Real-Time Chat with Mentions

**User Story:** As a mess member, I want to chat with other members and mention specific people, so that I can communicate effectively about mess matters.

#### Acceptance Criteria

1. THE System SHALL provide a chat tab where members can send and receive text messages in real-time
2. WHEN a member types the @ symbol followed by characters, THE System SHALL display an autocomplete list of member names
3. WHEN a member sends a message containing @username, THE System SHALL highlight the mention and trigger a notification for the mentioned member
4. WHEN a member receives a message with their mention, THE System SHALL send a browser push notification if the member has granted notification permissions
5. THE System SHALL display new chat messages to all connected members within 2 seconds of sending

### Requirement 6: User Preferences and Settings

**User Story:** As a mess member, I want to configure my notification preferences and view my profile, so that I can customize my experience.

#### Acceptance Criteria

1. THE System SHALL provide a preferences tab where members can view and edit their profile information
2. THE System SHALL allow members to enable or disable browser push notifications for chat mentions
3. THE System SHALL allow members to toggle between eggplant color theme and dark mode
4. WHEN a member changes their theme preference, THE System SHALL apply the new theme immediately without page reload
5. THE System SHALL persist theme and notification preferences across sessions

### Requirement 7: Monthly Meal Tracking and Reporting

**User Story:** As a mess member, I want to view monthly meal consumption statistics, so that we can track usage and calculate costs.

#### Acceptance Criteria

1. THE System SHALL maintain a record of all meal registrations with date, member, and meal period
2. THE System SHALL provide a monthly report view showing each member's lunch count, dinner count, daily total, and monthly total
3. WHEN a member requests a monthly report, THE System SHALL aggregate meal data for the specified month within 3 seconds
4. THE System SHALL allow members to export monthly meal data as a CSV file
5. THE System SHALL calculate totals using the formula: monthly_total = morning_count + night_count

### Requirement 8: Progressive Web App Installation

**User Story:** As a mess member, I want to install the app on my mobile device or desktop, so that I can access it quickly like a native app.

#### Acceptance Criteria

1. THE System SHALL provide a web app manifest file enabling installation on mobile and desktop devices
2. WHEN a member visits the app on a compatible browser, THE System SHALL display an installation prompt
3. WHEN a member installs the app, THE System SHALL function as a standalone application with app icon and splash screen
4. THE System SHALL register a service worker to enable offline functionality and background notifications
5. WHILE offline, THE System SHALL queue meal registration changes and synchronize them when connectivity is restored

### Requirement 9: Responsive and Lightweight UI

**User Story:** As a mess member, I want the app to load quickly and work smoothly on any device, so that I can use it efficiently even with slow internet.

#### Acceptance Criteria

1. THE System SHALL load the initial UI shell within 2 seconds on a 3G connection
2. THE System SHALL implement tab switching without full page reloads
3. WHEN a member switches tabs, THE System SHALL display cached content immediately and refresh data in the background
4. THE System SHALL be fully responsive and functional on mobile devices with screen widths from 320px to desktop sizes above 1920px
5. THE System SHALL minimize JavaScript bundle size to under 200KB gzipped for initial load

### Requirement 10: Authentication and Authorization

**User Story:** As a mess member, I want to securely log in to the system, so that only authorized members can access and modify meal data.

#### Acceptance Criteria

1. THE System SHALL require members to authenticate using email and password via Supabase Auth
2. WHEN a member successfully authenticates, THE System SHALL create or retrieve their member profile
3. THE System SHALL enforce row-level security policies ensuring members can only modify their own meal registrations
4. THE System SHALL allow any authenticated member to edit meal details
5. THE System SHALL automatically log out members after 30 days of inactivity

### Requirement 11: Cutoff Time Enforcement

**User Story:** As a mess administrator, I want meal registration cutoffs enforced on the server, so that members cannot bypass restrictions by manipulating the client.

#### Acceptance Criteria

1. THE System SHALL validate all meal registration modifications against cutoff times on the server before persisting changes
2. WHEN a member attempts to add a morning meal at or after 7:00 AM, THE System SHALL reject the request and return an error
3. WHEN a member attempts to add a night meal at or after 6:00 PM, THE System SHALL reject the request and return an error
4. THE System SHALL use the mess's local timezone (UTC+6) for all cutoff time calculations
5. THE System SHALL display the remaining time until cutoff on the UI (e.g., "1:23 remaining")

### Requirement 12: Data Persistence and Reliability

**User Story:** As a mess member, I want my meal registrations and chat messages to be reliably saved, so that data is not lost due to network issues.

#### Acceptance Criteria

1. THE System SHALL store all meal registrations, meal details, and chat messages in a Supabase PostgreSQL database
2. WHEN a member submits a meal registration, THE System SHALL prevent duplicate entries for the same member, date, and period
3. THE System SHALL implement database indexes on frequently queried columns (meal_date, member_id, period) for query performance under 500ms
4. THE System SHALL maintain audit logs of who updated meal details and when
5. WHEN database operations fail, THE System SHALL display user-friendly error messages and retry failed operations up to 3 times
