export interface SuggestedAttachment {
  fileId: number;
  fileName: string;
  similarity: number;
}

export interface SuggestedLink {
  url: string;
  title: string;
  description: string;
}

export interface LessonSuggestionResponse {
  suggestedAttachments: SuggestedAttachment[];
  suggestedKeywords: string[];
  suggestedQuizTopic: string | null;
  suggestedCrosswordTopic: string | null;
  suggestedLinks: SuggestedLink[];
}

export interface AcceptSuggestionRequest {
  /** Type of suggestion to accept: "attachment", "link", "quiz_topic", or "crossword_topic" */
  type: 'attachment' | 'link' | 'quiz_topic' | 'crossword_topic';
  /** The value to apply — fileId for attachment, JSON for link, topic string for quiz/crossword */
  value: string;
}
