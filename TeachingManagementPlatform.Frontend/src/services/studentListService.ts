import api from './api';
import type {
  StudentList,
  CreateStudentListRequest,
  UpdateStudentListRequest,
  AddColumnRequest,
  AddStudentEntryRequest,
  UpdateStudentEntryRequest,
  StudentListColumn,
  StudentEntry,
} from '../types/studentList';

// --- Student List CRUD ---

export async function getAll(classId: number): Promise<StudentList[]> {
  const response = await api.get<StudentList[]>(`/classes/${classId}/student-lists`);
  return response.data;
}

export async function create(classId: number, data: CreateStudentListRequest): Promise<StudentList> {
  const response = await api.post<StudentList>(`/classes/${classId}/student-lists`, data);
  return response.data;
}

export async function update(id: number, data: UpdateStudentListRequest): Promise<StudentList> {
  const response = await api.put<StudentList>(`/student-lists/${id}`, data);
  return response.data;
}

export async function remove(id: number): Promise<void> {
  await api.delete(`/student-lists/${id}`);
}

export async function setMain(id: number): Promise<StudentList> {
  const response = await api.put<StudentList>(`/student-lists/${id}/set-main`);
  return response.data;
}

export async function clone(id: number): Promise<StudentList> {
  const response = await api.post<StudentList>(`/student-lists/${id}/clone`);
  return response.data;
}

/**
 * Clone a student list with only selected columns.
 * Creates a new list, adds selected columns, then copies entries with filtered data.
 */
export async function cloneWithSelectedColumns(
  sourceListId: number,
  classId: number,
  selectedColumnIds: number[],
  newListName: string
): Promise<StudentList> {
  // Get the source list data (use getAll since we already have it loaded, but
  // we can also fetch via the class endpoint and filter)
  const allLists = await getAll(classId);
  const source = allLists.find((l) => l.id === sourceListId);
  if (!source) {
    throw new Error('Source list not found');
  }

  // Create the new list
  const newList = await create(classId, { name: newListName });

  // Filter and add only selected columns
  const selectedColumns = source.columns.filter((c) => selectedColumnIds.includes(c.id));
  for (const col of selectedColumns) {
    await addColumn(newList.id, { name: col.name, sortOrder: col.sortOrder });
  }

  // Copy entries but only keep data for selected columns
  const selectedColumnNames = new Set(selectedColumns.map((c) => c.name));
  for (const entry of source.entries) {
    const filteredData: Record<string, string> = {};
    for (const [key, value] of Object.entries(entry.data)) {
      if (selectedColumnNames.has(key)) {
        filteredData[key] = value;
      }
    }
    await addEntry(newList.id, { data: filteredData, sortOrder: entry.sortOrder });
  }

  // Return the fully populated new list
  const updatedLists = await getAll(classId);
  const result = updatedLists.find((l) => l.id === newList.id);
  return result ?? newList;
}

// --- Column CRUD ---

export async function addColumn(listId: number, data: AddColumnRequest): Promise<StudentListColumn> {
  const response = await api.post<StudentListColumn>(`/student-lists/${listId}/columns`, data);
  return response.data;
}

export async function updateColumn(columnId: number, data: { name?: string; sortOrder?: number }): Promise<StudentListColumn> {
  const response = await api.put<StudentListColumn>(`/student-list-columns/${columnId}`, data);
  return response.data;
}

export async function deleteColumn(columnId: number): Promise<void> {
  await api.delete(`/student-list-columns/${columnId}`);
}

// --- Entry CRUD ---

export async function addEntry(listId: number, data: AddStudentEntryRequest): Promise<StudentEntry> {
  const response = await api.post<StudentEntry>(`/student-lists/${listId}/entries`, data);
  return response.data;
}

export async function updateEntry(entryId: number, data: UpdateStudentEntryRequest): Promise<StudentEntry> {
  const response = await api.put<StudentEntry>(`/student-entries/${entryId}`, data);
  return response.data;
}

export async function deleteEntry(entryId: number): Promise<void> {
  await api.delete(`/student-entries/${entryId}`);
}

// --- Excel Import/Export ---

export async function importExcel(listId: number, file: File): Promise<StudentList> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<StudentList>(`/student-lists/${listId}/import-excel`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function exportExcel(listId: number): Promise<void> {
  const response = await api.get(`/student-lists/${listId}/export-excel`, {
    responseType: 'blob',
  });
  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const disposition = response.headers['content-disposition'];
  let filename = 'student-list.xlsx';
  if (disposition) {
    const match = disposition.match(/filename="?([^";\n]+)"?/);
    if (match?.[1]) filename = match[1];
  }
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
