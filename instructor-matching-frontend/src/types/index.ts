// 공통 타입 정의

export interface User {
  id: string;
  username: string;
  name: string;
}

export interface Instructor {
  id: string;
  name: string;
  specializations: string[];
  subjects: string[];
  experience_years: number;
  certifications: string[];
  education: string;
  keywords: string[];
  contact: string | null;
  notes: string | null;
  email: string | null;
  region: string | null;
  affiliation: string | null;
  degree: string | null;
  school: string | null;
  major: string | null;
  main_lecture_area: string | null;
  summary: string | null;
  birth_date: string | null;
  lecture_history: LectureHistory[];
  qualifications_career: QualificationCareer[];
  created_at: string;
  updated_at: string;
}

export interface LectureHistory {
  type: string;
  start: string;
  end: string;
  client: string;
  course: string;
  hours: string;
  role: string;
  keywords: string;
}

export interface QualificationCareer {
  type: string;
  start: string;
  end: string;
  detail: string;
  issuer: string;
}

export interface TaskOrder {
  id: string;
  file_name: string;
  file_type: string;
  qualifications: Qualification[];
  evaluation_criteria: EvaluationCriterion[];
  overview: TaskOverview;
  parsed_at: string | null;
  created_at: string;
}

export interface TaskOverview {
  section_titles: string[];
  summary: string;
  core_topics: string[];
  target_audience: string[];
  delivery_formats: string[];
  required_roles: string[];
  scope: string[];
  expected_outcomes: string[];
  preferred_experience: string[];
  source_excerpt: string;
  matching_rules: OverviewRule[];
}

export interface OverviewRule {
  key: string;
  label: string;
  values: string[];
}

export interface Qualification {
  category: string;
  description: string;
  is_mandatory: boolean;
  keywords: string[];
}

export interface EvaluationCriterion {
  category: string;
  description: string;
  weight: number | null;
  keywords: string[];
}

export interface ScoreBreakdown {
  criterion: string;
  score: number;
  max_score: number;
  reason: string;
  matched_keywords: string[];
}

export interface MatchScore {
  instructor_id: string;
  instructor_name: string;
  total_score: number;
  keyword_score: number;
  qualification_score: number;
  experience_score: number;
  breakdown: ScoreBreakdown[];
}

export interface MatchingResult {
  id: string;
  task_order_id: string;
  results: MatchScore[];
  candidates: string[];
  created_at: string;
}

export interface InstructorStats {
  total_count: number;
  specialization_distribution: Record<string, number>;
  average_experience: number;
}

export interface BulkUploadResponse {
  total: number;
  success: number;
  errors: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}
