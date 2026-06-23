export interface SuggestedAttachment {
  fileId: number;
  fileName: string;
  similarity: number;
}

export interface LessonSuggestionResponse {
  suggestedAttachments: SuggestedAttachment[];
  suggestedKeywords: string[];
  suggestedQuizTopic: string | null;
  suggestedCrosswordTopic: string | null;
}

export interface AcceptSuggestionRequest {
  /** Type of suggestion to accept: "attachment", "quiz_topic", or "crossword_topic" */
  type: 'attachment' | 'quiz_topic' | 'crossword_topic';
  /** The value to apply — fileId for attachment, topic string for quiz/crossword */
  value: string;
}
