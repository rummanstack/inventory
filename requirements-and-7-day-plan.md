# Inventory Management Requirements and 7-Day Development Plan

## Project Goal
The current system should be upgraded into a more realistic, controlled, and business-ready inventory management platform so that:

- stock is properly controlled
- DSR issue, settlement, cash collection, and advances are tracked clearly
- daily business expenses are recorded
- user access is controlled
- all important actions are auditable
- the interface supports both English and Bangla through a language switch system

---

## Business Requirements

### 1. Language Support and Language Switch System
The system should support both English and Bangla and allow users to switch language from the interface.

Requirements:
- add a global language switch option in the frontend
- support at least:
  - `English`
  - `Bangla`
- the selected language should persist for the user
- all major UI labels, buttons, page titles, form labels, alerts, and navigation items should support translation
- the system should be structured so future translation updates are easy

Suggested implementation direction:
- use centralized translation dictionaries
- avoid hardcoded user-facing strings inside feature components
- support role-aware and page-aware translation keys

---

### 2. Login System
The system must require login.

Requirements:
- each user must have a unique `username/email` and `password`
- no one can use the system without authentication
- role-based access control must be supported

Suggested roles:
- `Super Admin`
- `Admin / Owner`
- `Manager`
- `Operator`

Expected control:
- not every user can edit or delete everything
- sensitive operations must be restricted

---

### 3. Super Admin Role
A `Super Admin` role should be added above all other roles.

Responsibilities of Super Admin:
- full access to the entire system
- create, edit, disable, and manage users
- assign and change roles
- view all logs and reports
- control system configuration
- override lower-level restrictions when needed

Suggested permissions:
- manage all products, DSRs, stock, settlements, expenses, cash receipts, and advances
- manage language settings if needed
- manage user authentication and access policies

---

### 4. Activity Logs
The system must keep logs of all important actions.

Actions to log:
- login/logout
- product create/edit/delete
- stock add
- DSR create/edit/delete
- morning issue create/update
- evening settlement create/update
- expense add/edit/delete
- DSR cash receive add/edit/delete
- DSR advance add/edit/delete
- user create/edit/role change/disable

Each log should contain:
- who performed the action
- what action was performed
- when it happened
- which record was affected

Suggested fields:
- `id`
- `userId`
- `actionType`
- `entityType`
- `entityId`
- `description`
- `createdAt`

---

### 5. Product Stock Control
Product stock quantity must not be editable directly from the product edit form.

Requirements:
- remove stock editing from the product edit form
- stock must only be increased through a dedicated `Add Stock` flow
- the product edit form should only allow editing of:
  - product name
  - category
  - pieces per case
  - purchase price
  - selling price

Reason:
- prevents accidental stock corruption
- keeps stock movement traceable
- improves inventory integrity

---

### 6. Daily Expense Management
The system should support daily expense tracking.

Examples:
- bank-related payments or charges
- DSR salary
- office expense
- rent
- vehicle expense

Requirements:
- expenses can be added
- expense category must be stored
- date must be stored
- amount must be stored
- note/description must be stored
- created-by user info must be stored

Suggested fields:
- `id`
- `date`
- `category`
- `amount`
- `note`
- `createdBy`
- `createdAt`

Suggested categories:
- `Bank`
- `Salary`
- `Office`
- `Rent`
- `Vehicle`
- `Other`

---

### 7. DSR Night Cash Receive Entry
If a DSR gives some cash at night, that amount must be recorded under that DSR separately.

Meaning:
Cash received outside the main settlement flow should be recorded in a separate module.

Requirements:
- user can select DSR
- date must be stored
- amount must be stored
- note must be stored
- received-by user must be stored
- DSR-wise reporting must be available

Suggested fields:
- `id`
- `date`
- `dsrId`
- `amount`
- `note`
- `receivedBy`
- `createdAt`

Recommended design:
This should remain separate from the `settlement` table.

---

### 8. DSR Advance Tracking
If a DSR takes advance money, it must be recorded separately.

Requirements:
- user can select DSR
- date must be stored
- amount must be stored
- note/reason must be stored
- month-end summary must show total advance clearly

Suggested fields:
- `id`
- `date`
- `dsrId`
- `amount`
- `note`
- `createdBy`
- `createdAt`

---

### 9. Month-End DSR Summary
The system should provide a DSR-wise month-end summary.

The summary should show:
- total sales-related payable
- total settlement paid
- total extra cash received
- total advance taken
- remaining due
- net balance

Suggested output:
- DSR name
- total payable
- total settlement paid
- total night cash received
- total advance
- final due / balance

---

### 10. Reporting Requirements
The system should support essential operational reports.

Required reports:
- daily expense report
- monthly expense report
- DSR cash receive report
- DSR advance report
- DSR month-end summary
- activity log report

---

## Recommended Data Modules

To keep the system clean, finance-related and operational data should not be mixed into one table.

Recommended modules/tables:
- `users`
- `activity_logs`
- `expenses`
- `dsr_cash_receipts`
- `dsr_advances`
- existing `settlements`
- existing `issues`
- existing `products`
- existing `dsrs`

This will make reporting and future development much easier.

---

## Open Questions for Client

These points should be confirmed before development:

1. Should DSR night cash be treated as part of settlement, or as a separate cash receipt entry?
Recommended: separate entry

2. Should DSR salary be included in the expense module?
Recommended: yes

3. Should DSR advances automatically reduce due balance later?
Needs explicit client decision

4. Which exact permissions should each role have?
Recommended starting roles:
- Super Admin
- Admin
- Manager
- Operator

5. Should each user be allowed to select their own preferred language, or should language be global per device/session?
Recommended: user-level preference if login is available

---

## 7-Day Development Plan

This plan is designed for the current codebase and keeps the scope realistic.

### Day 1: Authentication Foundation
Goal:
Set up login and user management foundation.

Tasks:
- create `users` table in backend
- add password-based authentication
- implement login API
- implement session or token handling
- create login page in frontend

Deliverable:
- authenticated users can log in
- unauthenticated users cannot access the app

---

### Day 2: Language Switch System
Goal:
Add English and Bangla language switching support.

Tasks:
- create translation structure for frontend
- centralize UI text into translation dictionaries
- add language switch UI in header or settings area
- persist selected language
- apply translations to navigation, page titles, buttons, alerts, and form labels

Deliverable:
- users can switch between English and Bangla

---

### Day 3: Authorization and Activity Log Base
Goal:
Add role handling, backend permission enforcement, and system logging.

Role model:
- `super_admin`
  - full access to everything
  - manage users, roles, and system settings
  - override lower-level restrictions
- `admin`
  - manage products, DSRs, stock add, and daily operations
  - view reports and activity logs
  - cannot change system-level settings or assign roles
- `manager`
  - run daily inventory work
  - create and update morning issues and settlements
  - view operational reports
  - no user or role administration
- `operator`
  - limited daily entry work only
  - create morning issues and settlements if permitted
  - no delete actions, no user management, no system settings

Tasks:
- create `activity_logs` table
- create backend logging helper/service
- log login/logout
- add middleware to attach current user to requests
- add permission middleware for protected routes
- enforce role restrictions on sensitive operations
- add Super Admin user management permissions

Deliverable:
- actions run with user context
- permission checks are enforced in backend
- core audit log starts working

---

### Day 4: Product Stock Control Fix
Goal:
Lock down stock editing rules.

Tasks:
- remove stock editing from product edit UI
- keep stock addition only in the dedicated stock-add flow
- enforce the same rule in backend validation
- log stock add actions
- verify product update API does not allow direct stock modification

Deliverable:
- stock cannot be modified from normal product edit

---

### Day 5: Expense Module
Goal:
Build daily expense tracking.

Tasks:
- create `expenses` table
- add expense create/list/update/delete API
- create expense page in frontend
- add category and date filters
- add daily and monthly expense summary
- log expense actions

Deliverable:
- daily expenses can be recorded and reported

---

### Day 6: DSR Cash Receive and Advance Modules
Goal:
Track DSR cash receipts and advances separately.

Tasks:
- create `dsr_cash_receipts` table
- create `dsr_advances` table
- add APIs for both modules
- build frontend forms/pages for both
- add DSR-wise date-based reporting
- log all related actions

Deliverable:
- DSR extra cash and DSR advances are tracked separately

---

### Day 7: Month-End Summary and Final Reporting
Goal:
Connect everything into useful reports and summaries.

Tasks:
- build DSR month-end summary calculation
- combine settlement, cash receipt, and advance data
- create summary page/report
- create activity log page
- polish role restrictions
- test all main flows
- fix visible UI and backend issues

Deliverable:
- owner/manager can view DSR month-end summary and audit history

---

## Suggested Priority if Time Is Tight

If all 7 days cannot be completed fully, implement in this order:

1. Login system
2. Super Admin and roles
3. Language switch system
4. Activity logs
5. Remove stock editing from product update
6. Expense module
7. DSR cash receipt module
8. DSR advance module
9. Month-end summary

---

## Final Recommendation

This is the right next scope for the business.

It is not unnecessarily complex, but it adds the key controls of a serious operational system:

- language support
- controlled access
- Super Admin governance
- accountability through logs
- controlled stock changes
- expense tracking
- DSR money tracking
- month-end financial visibility

The best implementation approach is:
- keep backend tables separated by responsibility
- log every sensitive action
- keep frontend feature-based
- separate settlement, extra cash receive, and advance tracking
- keep translations centralized from the beginning
