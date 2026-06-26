import api from './api';
import { getApiBaseUrl } from './apiConfig';
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

export async function updatePeriods(id: number, suggestedPeriods: number): Promise<LessonDetail> {
  const response = await api.put<LessonDetail>(`/lessons/${id}/periods`, { suggestedPeriods });
  return response.data;
}

export async function deleteLesson(id: number): Promise<void> {
  await api.delete(`/lessons/${id}`);
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

export function getAttachmentDownloadUrl(attachmentId: number): string {
  return `${getApiBaseUrl()}/lesson-attachments/${attachmentId}/download`;
}

/**
 * Returns a publicly accessible view URL for the attachment (uses JWT token as query param).
 * This URL can be passed to Google Docs Viewer or Office Online for inline rendering.
 */
export function getAttachmentViewUrl(attachmentId: number): string {
  const token = localStorage.getItem('token') ?? '';
  return `${getApiBaseUrl()}/lesson-attachments/${attachmentId}/view?token=${encodeURIComponent(token)}`;
}

/**
 * Opens an attachment file in the browser using the best available viewer:
 * - PDF: opens directly in browser (native PDF viewer)
 * - DOCX/XLSX/PPTX: uses Google Docs Viewer for inline rendering
 * - Other: downloads as blob and opens in new tab
 */
export function openAttachmentInViewer(attachmentId: number, fileName: string, fileUrl?: string | null): void {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';

  // If we have a public file URL, use it directly (same as storage page)
  if (fileUrl) {
    if (['docx', 'xlsx', 'pptx', 'doc', 'xls', 'ppt'].includes(ext)) {
      const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
      window.open(googleViewerUrl, '_blank');
    } else {
      window.open(fileUrl, '_blank');
    }
    return;
  }

  // Fallback: use the authenticated view endpoint
  const viewUrl = getAttachmentViewUrl(attachmentId);

  if (ext === 'pdf') {
    window.open(viewUrl, '_blank');
  } else if (['docx', 'xlsx', 'pptx', 'doc', 'xls', 'ppt'].includes(ext)) {
    const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(viewUrl)}&embedded=true`;
    window.open(googleViewerUrl, '_blank');
  } else {
    // Fallback: download and open blob
    const downloadUrl = getAttachmentDownloadUrl(attachmentId);
    const token = localStorage.getItem('token');
    if (token) {
      fetch(downloadUrl, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.blob())
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, '_blank');
        })
        .catch(() => {});
    } else {
      window.open(downloadUrl, '_blank');
    }
  }
}
