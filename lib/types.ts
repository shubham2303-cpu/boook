export interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  hint: string;
}

export interface Quiz {
  questions: Question[];
  checkpoint: number;
}

export type QuizStatus =
  | "idle"
  | "loading"
  | "active"
  | "result"
  | "success"
  | "failed";
