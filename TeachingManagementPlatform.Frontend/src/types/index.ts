// Auth
export { Role } from './auth';
export type {
  Role as RoleType,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  DecodedToken,
} from './auth';

// Common enums and types
export { AccountStatus, ItemType, GameType } from './common';
export type {
  AccountStatus as AccountStatusType,
  ItemType as ItemTypeType,
  GameType as GameTypeType,
  ApiError,
} from './common';

// Account
export type {
  User,
  CreateAccountRequest,
  UpdateAccountRequest,
  UpdateAccountStatusRequest,
  AccountResponse,
} from './account';

// Subscription
export type {
  SubscriptionPackage,
  CreateSubscriptionPackageRequest,
  UpdateSubscriptionPackageRequest,
} from './subscription';

// Coin
export type {
  CoinPackage,
  CreateCoinPackageRequest,
  UpdateCoinPackageRequest,
  CoinWalletResponse,
  PurchaseCoinPackageResponse,
  CreateCoinPurchaseRequest,
  CoinPurchaseCheckoutResponse,
} from './coin';

// Profile
export type {
  ProfileTeachingLocation,
  ProfileExpertise,
  ProfileExperience,
  ProfileTeachingSkill,
  ProfileNote,
  LecturerProfile,
  UpdateProfileRequest,
} from './profile';

// Class
export type {
  Class,
  ClassDetail,
  CreateClassRequest,
  UpdateClassRequest,
  AssignLessonPlanRequest,
} from './class';

// Student List
export type {
  StudentListColumn,
  StudentEntry,
  StudentList,
  CreateStudentListRequest,
  UpdateStudentListRequest,
  AddColumnRequest,
  AddStudentEntryRequest,
  UpdateStudentEntryRequest,
} from './studentList';

// Attendance
export type {
  SlotStatus,
  AttendanceSlot,
  StudentAttendance,
  AttendanceList,
  AttendanceStudentSource,
} from './attendance';

// Lesson Plan
export type {
  LessonDocument,
  LessonAttachment,
  MiniGameSummary,
  Lesson,
  LessonPlan,
  LessonPlanSummary,
  DocumentResponse,
  AttachmentResponse,
  MiniGameSummaryResponse,
  LessonDetail,
  CreateLessonRequest,
  CreateLessonPlanRequest,
  UpdateLessonPlanRequest,
  AddDocumentRequest,
  UpdateDocumentRequest,
  UpdateLessonScheduleRequest,
  LessonPlanSearchParams,
} from './lessonPlan';

// Mini Game
export type {
  QuizQuestion,
  QuizContent,
  MiniGame,
  CreateMiniGameRequest,
  MiniGamePlayData,
} from './miniGame';

// Minigame library
export type {
  Minigame,
  LegacyMiniGameSummary,
} from './minigameLibrary';

// Storage
export type {
  StorageItem,
  CreateFolderRequest,
  UploadFileRequest,
  RenameItemRequest,
  StorageFilter,
} from './storage';

// Curriculum Template
export type {
  CurriculumTemplate,
  CurriculumTemplateLesson,
  GeneratedLesson,
  GenerateFromTemplateRequest,
  GenerateFromTemplateResponse,
  SaveAsTemplateRequest,
} from './curriculumTemplate';

// Teaching Schedule
export type {
  WeekdaySlot,
  ClassSubjectSchedule,
  SchoolYearCalendar,
  SchoolYearHoliday,
  LessonDate,
  CalculateDatesResponse,
  UpsertScheduleRequest,
  ApplyDatesRequest,
} from './teachingSchedule';

// Lesson Suggestion (AI)
export type {
  SuggestedAttachment,
  LessonSuggestionResponse,
  AcceptSuggestionRequest,
} from './lessonSuggestion';

// Crossword
export { GameStatus, Direction, CellState } from './crossword';
export type {
  GameStatus as GameStatusType,
  Direction as DirectionType,
  CellState as CellStateType,
  GridCell,
  CrosswordGrid,
  GameConfig,
  CrosswordWord,
  CrosswordGame,
  CrosswordEcoinTransaction,
  CrosswordFileExtractResult,
  CrosswordUploadResponse,
  CrosswordEstimateBreakdown,
  CrosswordEstimateResponse,
  CrosswordWordDto,
  CrosswordGenerateResponse,
  CrosswordWordDetailDto,
  CrosswordGameDto,
  CrosswordPlayerWordDto,
  CrosswordPlayerDto,
  CrosswordListItemDto,
  CrosswordSubmitRequest,
  CrosswordWordResult,
  CrosswordSubmitResponse,
} from './crossword';
