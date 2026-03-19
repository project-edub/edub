# Requirements Document

## Introduction

A web-based teaching management platform designed for teachers and lecturers in Vietnam. The platform provides tools for managing classes, students, lesson plans, teaching materials, and AI-generated mini games. The system has two user roles: Lecturer (teacher) and Admin. The UI is in Vietnamese. The tech stack is React (frontend), ASP.NET (backend), and MSSQL 2019 (database). Authentication supports database accounts and Google OAuth. AI features use OpenAI GPT-4o Mini. File storage uses local link-based metadata with future Azure Blob Storage integration.

## Glossary

- **Platform**: The teaching management web application
- **Lecturer**: A teacher or lecturer user who manages classes, students, lesson plans, and teaching materials
- **Admin**: An administrative user who manages lecturer accounts and subscription packages
- **Class**: A teaching group containing students, lesson plans, and basic information (name, year)
- **Student_List**: A tabular list of students within a class, with customizable columns
- **Main_Student_List**: The student list marked as the primary list for a class, used to derive student count
- **Lesson_Plan**: A structured plan containing a list of lessons for a specific subject, grade, and school year
- **Lesson**: A single teaching session within a lesson plan, containing documents, attachments, and mini games
- **Document**: A reference to teaching material with name, link, and page range
- **Attachment**: A file attached to a lesson (e.g., .pptx, .docx)
- **Mini_Game**: An AI-generated interactive game (e.g., Quiz) created from lesson documents
- **Teaching_Material_Storage**: A file and folder storage system similar to Google Drive for organizing teaching materials
- **Storage_Item**: A file or folder in the Teaching_Material_Storage
- **Profile**: The lecturer's overview page containing personal and professional information
- **Subscription_Package**: A configurable package that defines price, storage limit, and unlocked features
- **Auth_System**: The authentication system supporting database accounts and Google OAuth
- **AI_Service**: The OpenAI GPT-4o Mini integration used for generating mini games

## Requirements

### Requirement 1: Authentication

**User Story:** As a user (Lecturer or Admin), I want to log in using my database account or Google account, so that I can securely access the platform.

#### Acceptance Criteria

1. WHEN a user submits valid database credentials, THE Auth_System SHALL authenticate the user and redirect to the appropriate dashboard (Lecturer or Admin).
2. WHEN a user selects Google login, THE Auth_System SHALL initiate Google OAuth flow and authenticate the user upon successful authorization.
3. WHEN a user submits invalid credentials, THE Auth_System SHALL display an error message indicating authentication failure without revealing which field is incorrect.
4. IF the Google OAuth flow fails, THEN THE Auth_System SHALL display an error message and allow the user to retry or use database credentials.
5. WHEN a new user registers with a database account, THE Auth_System SHALL create the account with encrypted password storage.
6. THE Auth_System SHALL redirect authenticated Lecturers to the Lecturer dashboard and authenticated Admins to the Admin dashboard.

### Requirement 2: Admin Account Management

**User Story:** As an Admin, I want to manage lecturer accounts, so that I can control who has access to the platform.

#### Acceptance Criteria

1. WHEN the Admin navigates to the account management page, THE Platform SHALL display a list of all lecturer accounts.
2. WHEN the Admin creates a new lecturer account, THE Platform SHALL save the account and display it in the account list.
3. WHEN the Admin edits a lecturer account, THE Platform SHALL update the account information and reflect changes in the account list.
4. WHEN the Admin deletes a lecturer account, THE Platform SHALL remove the account from the system.
5. WHEN the Admin activates a deactivated account, THE Platform SHALL set the account status to active and allow the Lecturer to log in.
6. WHEN the Admin deactivates an active account, THE Platform SHALL set the account status to inactive and prevent the Lecturer from logging in.

### Requirement 3: Subscription Package Management

**User Story:** As an Admin, I want to configure subscription packages, so that I can define pricing and feature access for lecturers.

#### Acceptance Criteria

1. WHEN the Admin navigates to the subscription package management page, THE Platform SHALL display a list of all subscription packages.
2. WHEN the Admin creates a new subscription package, THE Platform SHALL save the package with the specified price, storage limit, and unlocked functions.
3. WHEN the Admin edits a subscription package, THE Platform SHALL update the price, storage limit, or unlocked functions as specified.
4. WHEN the Admin deletes a subscription package, THE Platform SHALL remove the package from the system.
5. THE Platform SHALL validate that price is a non-negative number and storage limit is a positive number before saving a subscription package.

### Requirement 4: Lecturer Profile (Overview Page)

**User Story:** As a Lecturer, I want to view and edit my profile page, so that I can present my professional information to others.

#### Acceptance Criteria

1. WHEN the Lecturer navigates to the overview page, THE Platform SHALL display the Lecturer's profile with all saved information.
2. WHEN the Lecturer opens the edit modal, THE Platform SHALL display editable fields for: full name (Họ và tên), current occupations (Nghề nghiệp hiện tại), teaching locations (Nơi giảng dạy), introduction (Giới thiệu), expertise (Chuyên môn), experience (Kinh nghiệm), other teaching skills (Kỹ năng giảng dạy khác), tuition fees (Học phí), and notes (Ghi chú).
3. THE Platform SHALL allow the Lecturer to add multiple entries for: current occupations, teaching locations, tuition fees, and notes.
4. THE Platform SHALL allow the Lecturer to add multiple rows to the expertise table, where each row contains specialty (Chuyên ngành), degree (Bằng cấp), and certificate image (Ảnh đính kèm).
5. WHEN the Lecturer adds an experience or teaching skill entry, THE Platform SHALL allow attaching an image to each entry.
6. WHEN the Lecturer saves the profile, THE Platform SHALL persist all changes and display the updated profile on the overview page.
7. THE Platform SHALL display the profile page and edit modal with Vietnamese labels.

### Requirement 5: Class Management

**User Story:** As a Lecturer, I want to manage my classes, so that I can organize my teaching groups.

#### Acceptance Criteria

1. WHEN the Lecturer navigates to the class list page, THE Platform SHALL display a list of all classes belonging to the Lecturer.
2. WHEN the Lecturer creates a new class, THE Platform SHALL save the class and display it in the class list.
3. WHEN the Lecturer edits a class, THE Platform SHALL update the class information.
4. WHEN the Lecturer deletes a class, THE Platform SHALL remove the class and its associated data.
5. WHEN the Lecturer views a class, THE Platform SHALL display three tabs: basic information (Thông tin cơ bản), student lists (Danh sách học sinh), and lesson plan (Giáo án).

### Requirement 6: Class Basic Information Tab

**User Story:** As a Lecturer, I want to see basic class information, so that I can quickly review class details.

#### Acceptance Criteria

1. WHEN the Lecturer selects the basic information tab, THE Platform SHALL display the class name, year, and number of students.
2. THE Platform SHALL derive the student count from the Main_Student_List of the class.

### Requirement 7: Student List System

**User Story:** As a Lecturer, I want to manage multiple student lists per class, so that I can organize student data flexibly.

#### Acceptance Criteria

1. WHEN the Lecturer selects the student list tab, THE Platform SHALL display a tab menu showing all student lists for the class.
2. WHEN the Lecturer creates a new student list, THE Platform SHALL add the list and display it as a new tab in the tab menu.
3. WHEN the Lecturer marks a student list as the main list, THE Platform SHALL designate that list as the Main_Student_List and unmark any previously marked list.
4. WHEN the Lecturer adds a column to a student list, THE Platform SHALL add the column to the list table and allow data entry in the new column.
5. WHEN the Lecturer clones a student list, THE Platform SHALL create a copy of the list with all columns and data.
6. WHEN the Lecturer edits a student entry, THE Platform SHALL update the student data in the list.
7. WHEN the Lecturer deletes a student entry, THE Platform SHALL remove the student from the list.

### Requirement 8: Student List Excel Import

**User Story:** As a Lecturer, I want to import student data from Excel files, so that I can quickly populate student lists.

#### Acceptance Criteria

1. WHEN the Lecturer uploads an Excel file for import, THE Platform SHALL scan the first row of the Excel file for column headers.
2. WHEN the Excel file headers match the student list column names, THE Platform SHALL import the data rows into the student list.
3. IF the Excel file headers do not match the student list column names, THEN THE Platform SHALL display a message indicating which headers do not match.
4. WHEN the import completes successfully, THE Platform SHALL display the imported data in the student list.

### Requirement 9: Student List Excel Export

**User Story:** As a Lecturer, I want to export student lists to Excel files, so that I can share or archive student data.

#### Acceptance Criteria

1. WHEN the Lecturer exports a student list, THE Platform SHALL generate an Excel file containing all columns and rows of the selected list.
2. THE Platform SHALL use the student list column names as the header row in the exported Excel file.
3. WHEN the export completes, THE Platform SHALL trigger a file download in the Lecturer's browser.

### Requirement 10: Lesson Plan Management

**User Story:** As a Lecturer, I want to create and manage lesson plans, so that I can organize my teaching curriculum.

#### Acceptance Criteria

1. WHEN the Lecturer navigates to the lesson plan page, THE Platform SHALL display a table of lesson plans with columns: grade (Khối), subject (Môn), school year (Niên khóa), and actions (Hành động).
2. WHEN the Lecturer searches or filters lesson plans, THE Platform SHALL filter the table by grade, subject, or school year based on the search input.
3. WHEN the Lecturer clicks the create button, THE Platform SHALL display a modal with fields: subject (Môn), grade dropdown (Khối, options: 1-12 and university/Đại học), school year range (Niên khóa), and a lesson list.
4. WHEN the Lecturer adds a lesson to the lesson list, THE Platform SHALL append a new lesson entry with a name field.
5. WHEN the Lecturer edits a lesson plan, THE Platform SHALL display the edit modal pre-populated with the existing lesson plan data.
6. WHEN the Lecturer deletes a lesson plan, THE Platform SHALL remove the lesson plan from the system.
7. WHEN the Lecturer saves a lesson plan, THE Platform SHALL persist the subject, grade, school year, and all lessons.

### Requirement 11: Lesson Detail Management

**User Story:** As a Lecturer, I want to manage lesson details including documents, attachments, and mini games, so that I can prepare comprehensive lesson content.

#### Acceptance Criteria

1. WHEN the Lecturer opens a lesson detail modal, THE Platform SHALL display three sections: documents (Tài liệu), attachments (Tệp đính kèm), and mini games (Mini game).
2. WHEN the Lecturer adds a document, THE Platform SHALL save the document with name (Tên tài liệu), link (Link tài liệu), and page range (Trang).
3. WHEN the Lecturer adds an attachment, THE Platform SHALL save the file reference to the lesson.
4. WHEN the Lecturer updates the lesson detail, THE Platform SHALL persist all changes to documents, attachments, and mini games.
5. WHEN the Lecturer deletes a document or attachment, THE Platform SHALL remove the item from the lesson.

### Requirement 12: Mini Game Creation with AI

**User Story:** As a Lecturer, I want to create AI-generated mini games from lesson materials, so that I can engage students with interactive content.

#### Acceptance Criteria

1. WHEN the Lecturer opens the mini game creation modal, THE Platform SHALL display fields for: name (Tên mini game), description (Mô tả), and type dropdown (Loại, option: Quiz).
2. WHEN the Lecturer creates a mini game, THE AI_Service SHALL read the document links and attached files from the lesson to generate quiz content.
3. WHEN the AI_Service completes quiz generation, THE Platform SHALL save the mini game and display it in the lesson's mini game list.
4. IF the AI_Service fails to generate content, THEN THE Platform SHALL display an error message and allow the Lecturer to retry.
5. WHEN the Lecturer clicks play (Chơi) on a mini game, THE Platform SHALL launch the interactive game.
6. WHEN the Lecturer clicks view (Xem) on a mini game, THE Platform SHALL display the game content for review.
7. WHEN the Lecturer clicks delete (Xóa) on a mini game, THE Platform SHALL remove the mini game from the lesson.

### Requirement 13: Class Lesson Plan Tab

**User Story:** As a Lecturer, I want to assign a lesson plan to a class and schedule lessons, so that I can track teaching progress.

#### Acceptance Criteria

1. WHEN the Lecturer selects the lesson plan tab in a class, THE Platform SHALL allow the Lecturer to choose a lesson plan from the existing lesson plan list.
2. WHEN the Lecturer selects a lesson plan, THE Platform SHALL display the list of lessons with date fields (day, month, year) and a calendar picker for each lesson.
3. WHEN the Lecturer updates the date of a lesson, THE Platform SHALL save the scheduled date for that lesson.
4. THE Platform SHALL make the lesson list scrollable when the number of lessons exceeds the visible area.
5. WHEN the Lecturer searches within the lesson list, THE Platform SHALL filter lessons by lesson name.
6. WHEN the Lecturer views the current plan display, THE Platform SHALL show the lesson detail including documents (with name, link, page range), attachments, and mini games (with name, type, and play action).

### Requirement 14: Teaching Material Storage

**User Story:** As a Lecturer, I want a file and folder storage system, so that I can organize my teaching materials.

#### Acceptance Criteria

1. WHEN the Lecturer navigates to the teaching material storage page, THE Platform SHALL display a list of folders and files with columns: name (Tên), modification date (Ngày sửa đổi), and file size (Kích cỡ tệp).
2. WHEN the Lecturer creates a folder, THE Platform SHALL create the folder and display it in the storage list.
3. WHEN the Lecturer uploads a file, THE Platform SHALL save the file as a link with metadata (name, modification date, file size) on the current device.
4. WHEN the Lecturer opens a folder, THE Platform SHALL display the contents of that folder.
5. WHEN the Lecturer deletes a Storage_Item, THE Platform SHALL remove the item from the storage.
6. WHEN the Lecturer renames a Storage_Item, THE Platform SHALL update the name and reflect the change in the storage list.

### Requirement 15: Teaching Material Search and Filter

**User Story:** As a Lecturer, I want to search and filter my teaching materials, so that I can quickly find specific files.

#### Acceptance Criteria

1. WHEN the Lecturer enters a search query, THE Platform SHALL filter the storage list to show items matching the query by name.
2. WHEN the Lecturer filters by file type, THE Platform SHALL display only files matching the selected type (word, excel, powerpoint, text, or pdf).
3. WHEN the Lecturer filters by modification date, THE Platform SHALL display only items modified within the selected range (today, last 3 days, last 7 days, last 30 days, this year, or a custom date range).
4. WHEN the Lecturer selects a sort option, THE Platform SHALL sort the storage list by the selected field (date or name) in the selected direction (A-Z or Z-A).
5. WHEN the Lecturer selects the folder position option, THE Platform SHALL display folders either above files or mixed with files based on the selection.

### Requirement 16: File Storage Architecture

**User Story:** As a developer, I want files stored as links with metadata locally, so that the system can transition to Azure Blob Storage later.

#### Acceptance Criteria

1. THE Platform SHALL store each file as a link reference with metadata (name, modification date, file size) in the database.
2. THE Platform SHALL store actual file content on the local device during development.
3. THE Platform SHALL design the storage layer to support future migration to Azure Blob Storage without changing the API contract.

### Requirement 17: Vietnamese User Interface

**User Story:** As a Lecturer in Vietnam, I want the entire interface in Vietnamese, so that I can use the platform comfortably.

#### Acceptance Criteria

1. THE Platform SHALL display all UI labels, buttons, messages, and navigation elements in Vietnamese.
2. THE Platform SHALL use Vietnamese date format (dd/MM/yyyy) for all date displays.
3. THE Platform SHALL use Vietnamese currency format for tuition fee displays.
