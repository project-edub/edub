import api from './api';
import type {
  LessonDetail,
  AddDocumentRequest,
  UpdateDocumentRequest,
  DocumentResponse,
  AttachmentResponse,
} from '../types/lessonPlan';

export async function getById(id: number): Promise<LessonDetail> {
  const response = await api.get<LessonDetail>(`/lessons/${id}`);
  return response.data;
}

export async function updateName(id: number, name: string): Promise<LessonDetail> {
  const response = await api.put<LessonDetail>(`/lessons/${id}`, { name });
  return response.data;
}

export async function addDocument(lessonId: number, data: AddDocumentRequest): Promise<DocumentResponse> {
  const response = await api.post<DocumentResponse>(`/lessons/${lessonId}/documents`, data);
  return response.data;
}

export async function updateDocument(documentId: number, data: UpdateDocumentRequest): Promise<DocumentResponse> {
  const response = await api.put<DocumentResponse>(`/lesson-documents/${documentId}`, data);
  return response.data;
}

export async function deleteDocument(documentId: number): Promise<void> {
  await api.delete(`/lesson-documents/${documentId}`);
}

export async function addAttachment(lessonId: number, file: File): Promise<AttachmentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<AttachmentResponse>(`/lessons/${lessonId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function addAttachmentFromStorage(lessonId: number, storageItemId: number): Promise<AttachmentResponse> {
  const response = await api.post<AttachmentResponse>(`/lessons/${lessonId}/attachments/from-storage`, {
    storageItemId,
  });
  return response.data;
}

export async function deleteAttachment(attachmentId: number): Promise<void> {
  await api.delete(`/lesson-attachments/${attachmentId}`);
}
