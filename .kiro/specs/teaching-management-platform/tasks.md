# Implementation Plan: Teaching Management Platform

## Overview

Incremental implementation of a teaching management platform with React frontend, ASP.NET Web API backend, and MSSQL 2019 database. Tasks are ordered to build foundational layers first (project structure, data models, auth), then domain features (admin, profile, classes, student lists, lesson plans, mini games, storage), and finally cross-cutting concerns (Vietnamese UI formatting). Each task builds on previous steps and wires components together progressively.

## Tasks

- [x] 1. Set up project structure, database context, and core interfaces
  - [x] 1.1 Create ASP.NET Web API project with folder structure for Controllers, Services, Repositories, Models, and Interfaces
    - Configure MSSQL 2019 connection string in `appsettings.json`
    - Set up Entity Framework Core with `ApplicationDbContext`
    - Add NuGet packages: EF Core, BCrypt.Net, FsCheck (test), xUnit (test)
    - _Requirements: 16.3_

  - [x] 1.2 Define all EF Core entity models and configure DbContext relationships
    - Create entities: User, LecturerProfile, ProfileOccupation, ProfileTeachingLocation, ProfileExpertise, ProfileExperience, ProfileTeachingSkill, ProfileTuitionFee, ProfileNote, SubscriptionPackage, Class, StudentList, StudentListColumn, StudentEntry, LessonPlan, Lesson, LessonDocument, LessonAttachment, MiniGame, StorageItem
    - Configure relationships, cascade deletes, JSON columns (StudentEntry.Data, MiniGame.Content, SubscriptionPackage.UnlockedFeatures)
    - Generate initial EF Core migration
    - _Requirements: 16.1_

  - [x] 1.3 Create IFileStorage interface and LocalFileStorage implementation
    - Implement `SaveFileAsync`, `GetFileAsync`, `DeleteFileAsync`, `GetMetadataAsync`
    - Store files on local disk with configurable base path
    - Register as scoped service via dependency injection
    - _Requirements: 16.1, 16.2, 16.3_

  - [x] 1.4 Set up React frontend project with TypeScript, React Router, and Axios API client
    - Create directory structure: pages/, components/, services/, hooks/, types/, utils/
    - Configure role-based route guards (Lecturer routes, Admin routes, Auth routes)
    - Set up Axios interceptor for JWT token attachment and 401 redirect
    - Add dev dependencies: Jest, React Testing Library, fast-check
    - _Requirements: 17.1_

  - [x] 1.5 Create shared TypeScript interfaces and types matching backend data models
    - Define interfaces for all API request/response DTOs
    - Define enums for Role, AccountStatus, ItemType, GameType
    - _Requirements: 17.1_

- [x] 2. Implement authentication system
  - [x] 2.1 Implement AuthService and AuthController for database login and registration
    - Hash passwords with BCrypt on registration
    - Generate JWT tokens with user role claim on successful login
    - Return generic error message on invalid credentials (never reveal which field is wrong)
    - Check account status (reject inactive accounts with HTTP 403)
    - _Requirements: 1.1, 1.3, 1.5, 1.6_

  - [x] 2.2 Implement Google OAuth login flow
    - Validate Google OAuth token on backend
    - Create or link user account from Google profile
    - Return JWT token with correct role on success
    - Return error message on OAuth failure with retry option
    - _Requirements: 1.2, 1.4_

  - [x] 2.3 Add JWT authentication middleware and role-based authorization
    - Configure JWT bearer authentication in ASP.NET pipeline
    - Add `[Authorize(Roles = "Admin")]` and `[Authorize(Roles = "Lecturer")]` attributes to controllers
    - Handle expired tokens with 401 response
    - _Requirements: 1.6_

  - [x] 2.4 Implement frontend LoginPage and RegisterPage
    - Build login form with email/password fields and Google login button
    - Build registration form with validation
    - Handle auth responses: store JWT, redirect to role-appropriate dashboard
    - Display Vietnamese error messages from API
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 17.1_

  - [ ]* 2.5 Write property tests for authentication (Properties 1, 2, 3)
    - **Property 1: Authentication returns correct role token** — For any valid credentials, JWT contains correct role and redirect matches role
    - **Validates: Requirements 1.1, 1.2, 1.6**
    - **Property 2: Invalid credentials produce generic error** — For any invalid credential combo, error message is identical regardless of which field is wrong
    - **Validates: Requirements 1.3**
    - **Property 3: Registration hashes passwords** — For any plaintext password, stored hash differs from plaintext and verifies correctly
    - **Validates: Requirements 1.5**

- [x] 3. Checkpoint - Ensure auth system works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement admin account management
  - [x] 4.1 Implement AccountService and AdminController endpoints for lecturer account CRUD
    - GET/POST/PUT/DELETE `/api/admin/accounts`
    - PATCH `/api/admin/accounts/{id}/status` for activate/deactivate
    - Deactivated accounts must fail authentication
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 4.2 Implement frontend AccountManagementPage
    - Display lecturer account list in a table
    - Add create/edit modals, delete confirmation
    - Add activate/deactivate toggle button
    - All labels in Vietnamese
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 17.1_

  - [ ]* 4.3 Write property tests for account management (Properties 4, 5)
    - **Property 4: Account CRUD round-trip** — Create, list, update, delete cycle preserves data integrity
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
    - **Property 5: Account status toggle affects login ability** — Deactivating blocks login, reactivating restores it
    - **Validates: Requirements 2.5, 2.6**

- [x] 5. Implement subscription package management
  - [x] 5.1 Implement SubscriptionService and AdminController endpoints for subscription CRUD
    - GET/POST/PUT/DELETE `/api/admin/subscriptions`
    - Validate price >= 0 and storage limit > 0, return HTTP 400 on failure
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 5.2 Implement frontend SubscriptionPackagePage
    - Display subscription package list
    - Add create/edit modals with price, storage limit, and feature selection fields
    - Show validation errors inline
    - All labels in Vietnamese
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 17.1_

  - [ ]* 5.3 Write property tests for subscription packages (Properties 6, 7)
    - **Property 6: Subscription package CRUD round-trip** — Create, retrieve, update, delete preserves data
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
    - **Property 7: Subscription package validation** — Negative price or non-positive storage limit rejected; valid values accepted
    - **Validates: Requirements 3.5**

- [x] 6. Implement lecturer profile
  - [x] 6.1 Implement ProfileService and LecturerController endpoints for profile get/update
    - GET/PUT `/api/lecturer/profile`
    - Handle multi-entry fields: occupations, teaching locations, expertise rows, experience (with images), teaching skills (with images), tuition fees, notes
    - Preserve sort order for all multi-entry fields
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 6.2 Implement frontend OverviewPage and ProfileEditModal
    - Display profile with all fields and Vietnamese labels
    - Edit modal with dynamic add/remove for multi-entry fields
    - Image upload for expertise certificates, experience, and teaching skills
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 17.1_

  - [ ]* 6.3 Write property test for profile (Property 8)
    - **Property 8: Profile save/retrieve round-trip with multi-entry fields** — Saving profile with multiple entries and retrieving returns all entries with correct data and ordering
    - **Validates: Requirements 4.1, 4.3, 4.4, 4.5, 4.6**

- [x] 7. Implement class management and basic info tab
  - [x] 7.1 Implement ClassService and ClassController endpoints
    - GET/POST/PUT/DELETE `/api/classes`
    - GET `/api/classes/{id}` returns class detail with student count derived from main student list
    - Cascade delete associated student lists and lesson plan assignments
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2_

  - [x] 7.2 Implement frontend ClassListPage and ClassDetailPage with tabs
    - Class list with create/edit/delete actions
    - Class detail page with three tabs: basic info (Thông tin cơ bản), student lists (Danh sách học sinh), lesson plan (Giáo án)
    - Basic info tab shows class name, year, and student count
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 17.1_

  - [ ]* 7.3 Write property tests for class management (Properties 9, 10)
    - **Property 9: Class CRUD round-trip** — Create, list, update, delete preserves data; delete cascades to associated data
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
    - **Property 10: Student count derived from main student list** — Class basic info student count equals main student list entry count
    - **Validates: Requirements 6.1, 6.2**

- [x] 8. Checkpoint - Ensure admin, profile, and class features work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement student list system
  - [x] 9.1 Implement StudentListService and StudentListController endpoints
    - CRUD for student lists, columns, and student entries
    - Set main student list (enforce uniqueness: only one IsMain per class)
    - Clone student list with all columns and data
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 9.2 Implement frontend StudentListTabs and StudentListTable components
    - Tab menu showing all student lists for a class
    - Dynamic table with add/remove columns
    - Add/edit/delete student entries inline
    - Mark as main list button, clone button
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 17.1_

  - [ ]* 9.3 Write property tests for student lists (Properties 11, 12)
    - **Property 11: Main student list uniqueness invariant** — After marking any list as main, exactly one list has IsMain=true
    - **Validates: Requirements 7.3**
    - **Property 12: Student list operations round-trip** — Create, add columns, add entries, clone, edit, delete all preserve data integrity
    - **Validates: Requirements 7.1, 7.2, 7.4, 7.5, 7.6, 7.7**

- [x] 10. Implement Excel import/export for student lists
  - [x] 10.1 Implement IExcelService with import and export logic
    - Use a library (e.g., ClosedXML) for Excel file generation and parsing
    - ValidateHeaders: scan first row, compare to expected column names, return mismatches
    - ImportData: parse rows into dictionaries keyed by column name
    - ExportData: generate Excel with column names as header row
    - _Requirements: 8.1, 8.2, 8.3, 9.1, 9.2_

  - [x] 10.2 Add import/export endpoints to StudentListController
    - POST `/api/student-lists/{id}/import-excel` — validate headers, import data, return result
    - GET `/api/student-lists/{id}/export-excel` — generate and return Excel file download
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3_

  - [x] 10.3 Implement frontend ExcelImportModal and export button
    - File upload dialog for Excel import
    - Display header mismatch errors if any
    - Show imported data in student list on success
    - Export button triggers file download
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 17.1_

  - [ ]* 10.4 Write property test for Excel round-trip (Property 13)
    - **Property 13: Excel import/export round-trip** — Export then import produces identical data; mismatched headers are correctly identified
    - **Validates: Requirements 8.1, 8.2, 8.3, 9.1, 9.2**

- [x] 11. Implement lesson plan management
  - [x] 11.1 Implement LessonPlanService and LessonPlanController endpoints
    - CRUD for lesson plans with nested lessons
    - Search/filter by grade, subject, school year
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 11.2 Implement frontend LessonPlanPage and LessonPlanModal
    - Table of lesson plans with grade, subject, school year columns and Vietnamese headers
    - Search/filter controls
    - Create/edit modal with subject, grade dropdown (1-12, Đại học), school year range, and lesson list
    - Add/remove lessons in the modal
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 17.1_

  - [ ]* 11.3 Write property tests for lesson plans (Properties 14, 15)
    - **Property 14: Lesson plan CRUD round-trip** — Create, retrieve, add lessons, edit, delete preserves data
    - **Validates: Requirements 10.1, 10.4, 10.5, 10.6, 10.7**
    - **Property 15: Lesson plan search and filter** — Filtered results match criteria, no matching plans excluded
    - **Validates: Requirements 10.2**

- [x] 12. Implement lesson detail management
  - [x] 12.1 Implement LessonService and LessonController endpoints
    - GET/PUT `/api/lessons/{id}` for lesson detail
    - CRUD for lesson documents (name, link, page range) and attachments (file upload)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 12.2 Implement frontend LessonDetailModal
    - Three sections: documents (Tài liệu), attachments (Tệp đính kèm), mini games (Mini game)
    - Add/edit/delete documents with name, link, page range fields
    - Add/delete attachments with file upload
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 17.1_

  - [ ]* 12.3 Write property test for lesson details (Property 16)
    - **Property 16: Lesson detail CRUD round-trip** — Add/update/delete documents and attachments preserves data integrity
    - **Validates: Requirements 11.2, 11.3, 11.4, 11.5**

- [x] 13. Checkpoint - Ensure student lists, Excel, lesson plans, and lesson details work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Implement mini game creation with AI
  - [x] 14.1 Implement IAIService with OpenAI GPT-4o Mini integration
    - GenerateQuizAsync: send document links and attachment content to GPT-4o Mini
    - Parse response into structured QuizContent (questions, options, answers)
    - Handle API errors (timeout, rate limit) with Vietnamese error messages
    - _Requirements: 12.2, 12.4_

  - [x] 14.2 Implement MiniGameService and MiniGameController endpoints
    - POST `/api/lessons/{lessonId}/mini-games` — create mini game, trigger AI generation
    - GET `/api/mini-games/{id}` — get mini game detail
    - GET `/api/mini-games/{id}/play` — get play data
    - DELETE `/api/mini-games/{id}` — delete mini game
    - _Requirements: 12.1, 12.2, 12.3, 12.5, 12.6, 12.7_

  - [x] 14.3 Implement frontend MiniGameCreateModal and game display
    - Create modal with name, description, type dropdown (Quiz)
    - Display mini games in lesson detail with play (Chơi), view (Xem), delete (Xóa) actions
    - Implement quiz play view
    - Show error message and retry option on AI failure
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 17.1_

  - [ ]* 14.4 Write property test for mini game lifecycle (Property 17)
    - **Property 17: Mini game lifecycle** — Creating a mini game invokes AI with lesson data; successful generation persists game; view returns content; delete removes it (use mocked AI service)
    - **Validates: Requirements 12.2, 12.3, 12.6, 12.7**

- [x] 15. Implement class lesson plan tab with scheduling
  - [x] 15.1 Implement ClassLessonPlanController endpoints
    - PUT `/api/classes/{classId}/lesson-plan` — assign lesson plan to class
    - GET `/api/classes/{classId}/lesson-plan` — get assigned plan with schedule dates
    - PUT `/api/classes/{classId}/lessons/{lessonId}/schedule` — update lesson date
    - _Requirements: 13.1, 13.2, 13.3_

  - [x] 15.2 Implement frontend class lesson plan tab
    - Lesson plan selector dropdown from existing plans
    - Scrollable lesson list with date fields and calendar picker per lesson
    - Search/filter lessons by name within the list
    - Display lesson detail: documents (name, link, page range), attachments, mini games (name, type, play action)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 17.1_

  - [ ]* 15.3 Write property test for class scheduling (Property 18)
    - **Property 18: Class lesson plan scheduling** — Assigned plan returns lessons with date fields; date updates persist; search filters by name; display includes documents, attachments, mini games
    - **Validates: Requirements 13.2, 13.3, 13.5, 13.6**

- [x] 16. Implement teaching material storage
  - [x] 16.1 Implement StorageService and StorageController endpoints
    - GET `/api/storage` and GET `/api/storage/{folderId}` — list items with search, filter, sort
    - POST `/api/storage/folders` — create folder
    - POST `/api/storage/files` — upload file (save via IFileStorage, store metadata in DB)
    - PUT `/api/storage/{id}/rename` — rename item
    - DELETE `/api/storage/{id}` — delete item
    - Support filters: file type (word, excel, powerpoint, text, pdf), date range (today, last 3/7/30 days, this year, custom)
    - Support sort: by name or date, ascending or descending
    - Support folder position: above files or mixed
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 15.1, 15.2, 15.3, 15.4, 15.5_

  - [x] 16.2 Implement frontend TeachingMaterialStoragePage
    - File/folder list with columns: name (Tên), modification date (Ngày sửa đổi), file size (Kích cỡ tệp)
    - Create folder, upload file, rename, delete actions
    - Folder navigation (click to open)
    - Search bar, file type filter dropdown, date range filter, sort options, folder position toggle
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 15.1, 15.2, 15.3, 15.4, 15.5, 17.1_

  - [ ]* 16.3 Write property tests for storage (Properties 19, 20, 21, 22)
    - **Property 19: Storage CRUD round-trip** — Create folder, upload file, open folder, rename, delete all preserve data
    - **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5, 14.6**
    - **Property 20: Storage filter correctness** — Search, file type, and date range filters return only matching items
    - **Validates: Requirements 15.1, 15.2, 15.3**
    - **Property 21: Storage ordering** — Sort by name/date returns correct order; folder position setting respected
    - **Validates: Requirements 15.4, 15.5**
    - **Property 22: File storage metadata and content persistence** — Uploaded file has correct DB metadata and retrievable content
    - **Validates: Requirements 16.1, 16.2**

- [x] 17. Implement Vietnamese formatting utilities and apply across UI
  - [x] 17.1 Create Vietnamese date formatting utility (dd/MM/yyyy) and currency formatting utility (dot separators, đ suffix)
    - Implement `formatDate` and `formatCurrency` in `src/utils/`
    - Apply to all date and currency displays across all pages
    - _Requirements: 17.2, 17.3_

  - [x] 17.2 Audit and ensure all UI labels, buttons, messages, and navigation are in Vietnamese
    - Verify all pages use Vietnamese text for labels, placeholders, button text, error messages, and navigation
    - _Requirements: 17.1_

  - [ ]* 17.3 Write property tests for Vietnamese formatting (Properties 23, 24)
    - **Property 23: Vietnamese date formatting** — For any valid date, output matches dd/MM/yyyy pattern
    - **Validates: Requirements 17.2**
    - **Property 24: Vietnamese currency formatting** — For any non-negative amount, output uses dot separators and đ suffix
    - **Validates: Requirements 17.3**

- [x] 18. Final checkpoint - Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use FsCheck (backend C#) and fast-check (frontend TypeScript) as specified in the design
- Checkpoints are placed after major feature groups to catch issues early
- The IFileStorage abstraction ensures future Azure Blob Storage migration without API changes
