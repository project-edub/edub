export interface GeneratedQuizOption {
  text: string;
}

export interface GeneratedQuizQuestion {
  question: string;
  options: GeneratedQuizOption[];
  correctAnswerIndex: number;
}

export interface QuizGenerationResponse {
  requestedQuestionCount: number;
  generatedQuestionCount: number;
  questions: GeneratedQuizQuestion[];
  warnings?: string[];
  googleFormId?: string;
  googleFormUrl?: string;
}
