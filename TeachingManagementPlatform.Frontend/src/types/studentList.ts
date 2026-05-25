export interface StudentListColumn {
  id: number;
  studentListId: number;
  name: string;
  sortOrder: number;
}

export interface StudentEntry {
  id: number;
  studentListId: number;
  data: Record<string, string>;
  sortOrder: number;
}

export interface StudentList {
  id: number;
  classId: number;
  name: string;
  isMain: boolean;
  createdAt: string;
  columns: StudentListColumn[];
  entries: StudentEntry[];
}

export interface CreateStudentListRequest {
  name: string;
}

export interface UpdateStudentListRequest {
  name?: string;
}

export interface AddColumnRequest {
  name: string;
  sortOrder: number;
}

export interface AddStudentEntryRequest {
  data: Record<string, string>;
  sortOrder: number;
}

export interface UpdateStudentEntryRequest {
  data: Record<string, string>;
  sortOrder?: number;
}
