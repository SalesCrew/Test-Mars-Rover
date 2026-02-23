/**
 * Fragebogen Service
 * Handles all API calls for the Fragebogen system (Questions, Modules, Fragebogen, Responses)
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const FRAGEBOGEN_API = `${API_BASE_URL}/fragebogen`;

// ============================================================================
// TYPES
// ============================================================================

export type QuestionType = 
  | 'single_choice'
  | 'yesno'
  | 'likert'
  | 'multiple_choice'
  | 'photo_upload'
  | 'matrix'
  | 'open_text'
  | 'open_numeric'
  | 'slider'
  | 'barcode_scanner';

export interface LikertScale {
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
}

export interface MatrixConfig {
  rows: string[];
  columns: string[];
}

export interface NumericConstraints {
  min?: number;
  max?: number;
  decimals?: boolean;
}

export interface SliderConfig {
  min: number;
  max: number;
  step: number;
  unit?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  question_text: string;
  instruction?: string;
  is_template: boolean;
  options?: string[];
  likert_scale?: LikertScale;
  matrix_config?: MatrixConfig;
  numeric_constraints?: NumericConstraints;
  slider_config?: SliderConfig;
  created_at: string;
  updated_at: string;
  created_by?: string;
  archived: boolean;
}

export interface ModuleQuestion {
  id: string;
  order_index: number;
  required: boolean;
  local_id: string;
  question: Question;
}

export interface ModuleRule {
  id: string;
  module_id: string;
  trigger_local_id: string;
  trigger_answer: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains';
  trigger_answer_max?: string;
  action: 'hide' | 'show';
  target_local_ids: string[];
}

export interface Module {
  id: string;
  name: string;
  description?: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  question_count?: number;
  rules_count?: number;
  fragebogen_usage_count?: number;
  questions?: ModuleQuestion[];
  rules?: ModuleRule[];
}

export interface Fragebogen {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'scheduled' | 'inactive';
  archived: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  module_count?: number;
  market_count?: number;
  response_count?: number;
  completed_response_count?: number;
  modules?: Array<{
    id: string;
    order_index: number;
    module: Module;
  }>;
  market_ids?: string[];
}

export interface Response {
  id: string;
  fragebogen_id: string;
  gebietsleiter_id: string;
  market_id: string;
  status: 'in_progress' | 'completed';
  started_at: string;
  completed_at?: string;
  user?: { id: string; first_name: string; last_name: string };
  market?: { id: string; name: string; chain: string };
  answers?: ResponseAnswer[];
}

export interface ResponseAnswer {
  id: string;
  response_id: string;
  question_id: string;
  module_id: string;
  answer_text?: string;
  answer_numeric?: number;
  answer_json?: any;
  answer_file_url?: string;
  answered_at: string;
  question?: Question;
}

// ============================================================================
// QUESTIONS API
// ============================================================================

export const questionsApi = {
  /**
   * Get all questions with optional filtering
   */
  async getAll(filters?: {
    type?: QuestionType;
    is_template?: boolean;
    archived?: boolean;
    search?: string;
  }): Promise<Question[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.is_template !== undefined) params.append('is_template', String(filters.is_template));
    if (filters?.archived !== undefined) params.append('archived', String(filters.archived));
    if (filters?.search) params.append('search', filters.search);
    
    const response = await fetch(`${FRAGEBOGEN_API}/questions?${params}`);
    if (!response.ok) throw new Error('Failed to fetch questions');
    return response.json();
  },

  /**
   * Get a single question by ID
   */
  async getById(id: string): Promise<Question> {
    const response = await fetch(`${FRAGEBOGEN_API}/questions/${id}`);
    if (!response.ok) throw new Error('Failed to fetch question');
    return response.json();
  },

  /**
   * Create a new question
   */
  async create(question: Partial<Question>): Promise<Question> {
    const response = await fetch(`${FRAGEBOGEN_API}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(question)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create question');
    }
    return response.json();
  },

  /**
   * Update a question
   */
  async update(id: string, updates: Partial<Question>): Promise<Question> {
    const response = await fetch(`${FRAGEBOGEN_API}/questions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update question');
    }
    return response.json();
  },

  /**
   * Delete (archive) a question
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${FRAGEBOGEN_API}/questions/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete question');
  },

  /**
   * Get usage stats for a question
   */
  async getStats(id: string): Promise<any> {
    const response = await fetch(`${FRAGEBOGEN_API}/questions/stats/${id}`);
    if (!response.ok) throw new Error('Failed to fetch question stats');
    return response.json();
  },

  /**
   * Get the number of modules that use this question
   * Used for copy-on-write logic - determines if editing should create a new question
   */
  async getModuleCount(id: string): Promise<{ questionId: string; moduleCount: number }> {
    const response = await fetch(`${FRAGEBOGEN_API}/questions/${id}/module-count`);
    if (!response.ok) throw new Error('Failed to fetch question module count');
    return response.json();
  }
};

// ============================================================================
// MODULES API
// ============================================================================

export const modulesApi = {
  /**
   * Get all modules with optional filtering
   */
  async getAll(filters?: {
    archived?: boolean;
    search?: string;
  }): Promise<Module[]> {
    const params = new URLSearchParams();
    if (filters?.archived !== undefined) params.append('archived', String(filters.archived));
    if (filters?.search) params.append('search', filters.search);
    
    const response = await fetch(`${FRAGEBOGEN_API}/modules?${params}`);
    if (!response.ok) throw new Error('Failed to fetch modules');
    return response.json();
  },

  /**
   * Get a single module with questions and rules
   */
  async getById(id: string): Promise<Module> {
    const response = await fetch(`${FRAGEBOGEN_API}/modules/${id}`);
    if (!response.ok) throw new Error('Failed to fetch module');
    return response.json();
  },

  /**
   * Create a new module
   */
  async create(module: {
    name: string;
    description?: string;
    questions?: Array<{
      question_id: string;
      order_index?: number;
      required?: boolean;
      local_id?: string;
    }>;
    rules?: Array<Omit<ModuleRule, 'id' | 'module_id'>>;
    created_by?: string;
  }): Promise<Module> {
    const response = await fetch(`${FRAGEBOGEN_API}/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(module)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create module');
    }
    return response.json();
  },

  /**
   * Update a module
   */
  async update(id: string, updates: {
    name?: string;
    description?: string;
    questions?: Array<{
      question_id: string;
      order_index?: number;
      required?: boolean;
      local_id?: string;
    }>;
    rules?: Array<Omit<ModuleRule, 'id' | 'module_id'>>;
  }): Promise<Module> {
    const response = await fetch(`${FRAGEBOGEN_API}/modules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update module');
    }
    return response.json();
  },

  /**
   * Duplicate a module
   */
  async duplicate(id: string, newName?: string): Promise<Module> {
    const response = await fetch(`${FRAGEBOGEN_API}/modules/${id}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_name: newName })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to duplicate module');
    }
    return response.json();
  },

  /**
   * Archive or unarchive a module
   */
  async archive(id: string, archived: boolean = true): Promise<Module> {
    const response = await fetch(`${FRAGEBOGEN_API}/modules/${id}/archive`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived })
    });
    if (!response.ok) throw new Error('Failed to archive module');
    return response.json();
  },

  /**
   * Delete (archive) a module
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${FRAGEBOGEN_API}/modules/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete module');
  },

  /**
   * Get usage stats for a module
   */
  async getStats(id: string): Promise<any> {
    const response = await fetch(`${FRAGEBOGEN_API}/modules/stats/${id}`);
    if (!response.ok) throw new Error('Failed to fetch module stats');
    return response.json();
  },

  /**
   * Get detailed usage information (which fragebögen use this module)
   */
  async getUsage(id: string): Promise<{
    activeFragebogen: Array<{ id: string; name: string; status: string }>;
    inactiveFragebogen: Array<{ id: string; name: string; status: string }>;
    totalUsage: number;
  }> {
    const response = await fetch(`${FRAGEBOGEN_API}/modules/${id}/usage`);
    if (!response.ok) throw new Error('Failed to fetch module usage');
    return response.json();
  },

  /**
   * Permanently delete a module (and optionally its questions)
   */
  async deletePermanent(id: string, deleteQuestions: boolean = false): Promise<void> {
    const response = await fetch(`${FRAGEBOGEN_API}/modules/${id}/permanent?deleteQuestions=${deleteQuestions}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to permanently delete module');
  }
};

// ============================================================================
// FRAGEBOGEN API
// ============================================================================

export const fragebogenApi = {
  /**
   * Get all fragebogen with optional filtering
   */
  async getAll(filters?: {
    status?: 'active' | 'scheduled' | 'inactive';
    archived?: boolean;
    search?: string;
  }): Promise<Fragebogen[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.archived !== undefined) params.append('archived', String(filters.archived));
    if (filters?.search) params.append('search', filters.search);
    
    const response = await fetch(`${FRAGEBOGEN_API}/fragebogen?${params}`);
    if (!response.ok) throw new Error('Failed to fetch fragebogen');
    return response.json();
  },

  /**
   * Get a single fragebogen with modules and questions
   */
  async getById(id: string): Promise<Fragebogen> {
    const response = await fetch(`${FRAGEBOGEN_API}/fragebogen/${id}`);
    if (!response.ok) throw new Error('Failed to fetch fragebogen');
    return response.json();
  },

  /**
   * Create a new fragebogen
   */
  async create(fragebogen: {
    name: string;
    description?: string;
    start_date: string;
    end_date: string;
    module_ids?: string[];
    market_ids?: string[];
    created_by?: string;
  }): Promise<Fragebogen> {
    const response = await fetch(`${FRAGEBOGEN_API}/fragebogen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fragebogen)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create fragebogen');
    }
    return response.json();
  },

  /**
   * Update a fragebogen
   */
  async update(id: string, updates: {
    name?: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    status?: 'active' | 'scheduled' | 'inactive';
    module_ids?: string[];
    market_ids?: string[];
  }): Promise<Fragebogen> {
    const response = await fetch(`${FRAGEBOGEN_API}/fragebogen/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update fragebogen');
    }
    return response.json();
  },

  /**
   * Archive or unarchive a fragebogen
   */
  async archive(id: string, archived: boolean = true): Promise<Fragebogen> {
    const response = await fetch(`${FRAGEBOGEN_API}/fragebogen/${id}/archive`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived })
    });
    if (!response.ok) throw new Error('Failed to archive fragebogen');
    return response.json();
  },

  /**
   * Delete (archive) a fragebogen
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${FRAGEBOGEN_API}/fragebogen/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete fragebogen');
  },

  /**
   * Get response stats for a fragebogen
   */
  async getStats(id: string): Promise<any> {
    const response = await fetch(`${FRAGEBOGEN_API}/fragebogen/stats/${id}`);
    if (!response.ok) throw new Error('Failed to fetch fragebogen stats');
    return response.json();
  },

  /**
   * Permanently delete a fragebogen (keeps modules and questions intact)
   */
  async deletePermanent(id: string): Promise<void> {
    const response = await fetch(`${FRAGEBOGEN_API}/fragebogen/${id}/permanent`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to permanently delete fragebogen');
  }
};

// ============================================================================
// RESPONSES API
// ============================================================================

export const responsesApi = {
  /**
   * Get all responses for a fragebogen
   */
  async getByFragebogen(fragebogenId: string, status?: 'in_progress' | 'completed'): Promise<Response[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    
    const response = await fetch(`${FRAGEBOGEN_API}/responses/fragebogen/${fragebogenId}?${params}`);
    if (!response.ok) throw new Error('Failed to fetch responses');
    return response.json();
  },

  /**
   * Get a single response with all answers
   */
  async getById(id: string): Promise<Response> {
    const response = await fetch(`${FRAGEBOGEN_API}/responses/${id}`);
    if (!response.ok) throw new Error('Failed to fetch response');
    return response.json();
  },

  /**
   * Start a new response (GL)
   */
  async create(data: {
    fragebogen_id: string;
    gebietsleiter_id: string;
    market_id: string;
  }): Promise<Response> {
    const response = await fetch(`${FRAGEBOGEN_API}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create response');
    }
    return response.json();
  },

  /**
   * Update a response with answers
   */
  async update(id: string, answers: Array<{
    question_id: string;
    module_id: string;
    answer_text?: string;
    answer_numeric?: number;
    answer_json?: any;
    answer_file_url?: string;
  }>): Promise<Response> {
    const response = await fetch(`${FRAGEBOGEN_API}/responses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update response');
    }
    return response.json();
  },

  /**
   * Mark a response as completed
   */
  async complete(id: string): Promise<Response> {
    const response = await fetch(`${FRAGEBOGEN_API}/responses/${id}/complete`, {
      method: 'PUT'
    });
    if (!response.ok) throw new Error('Failed to complete response');
    return response.json();
  },

  /**
   * Get detailed stats for a fragebogen's responses
   */
  async getStats(fragebogenId: string): Promise<any> {
    const response = await fetch(`${FRAGEBOGEN_API}/responses/stats/fragebogen/${fragebogenId}`);
    if (!response.ok) throw new Error('Failed to fetch response stats');
    return response.json();
  }
};

// ============================================================================
// ZEITERFASSUNG API
// ============================================================================

export const zeiterfassungApi = {
  /**
   * Submit zeiterfassung (time tracking) data for a market visit
   */
  async submit(data: {
    response_id?: string;
    fragebogen_id?: string;
    gebietsleiter_id: string;
    market_id: string;
    fahrzeit_von?: string;
    fahrzeit_bis?: string;
    besuchszeit_von?: string;
    besuchszeit_bis?: string;
    distanz_km?: string;
    kommentar?: string;
    food_prozent?: number;
  }): Promise<any> {
    const response = await fetch(`${FRAGEBOGEN_API}/zeiterfassung`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save zeiterfassung');
    }
    return response.json();
  },

  /**
   * Update an existing zeiterfassung submission (partial update)
   */
  async update(id: string, data: {
    besuchszeit_von?: string;
    besuchszeit_bis?: string;
    fahrzeit_von?: string;
    fahrzeit_bis?: string;
    distanz_km?: string;
    kommentar?: string;
    food_prozent?: number;
  }): Promise<any> {
    const response = await fetch(`${FRAGEBOGEN_API}/zeiterfassung/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update zeiterfassung');
    }
    return response.json();
  },

  /**
   * Get zeiterfassung submissions for a GL
   */
  async getByGL(glId: string, options?: { limit?: number; offset?: number }): Promise<any[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.offset) params.append('offset', String(options.offset));
    
    const response = await fetch(`${FRAGEBOGEN_API}/zeiterfassung/gl/${glId}?${params}`);
    if (!response.ok) throw new Error('Failed to fetch zeiterfassung');
    return response.json();
  },

  /**
   * Get all zeiterfassung submissions for admin view
   */
  async getForAdmin(options?: {
    start_date?: string;
    end_date?: string;
    gl_id?: string;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (options?.start_date) params.append('start_date', options.start_date);
    if (options?.end_date) params.append('end_date', options.end_date);
    if (options?.gl_id) params.append('gl_id', options.gl_id);
    
    const response = await fetch(`${FRAGEBOGEN_API}/zeiterfassung/admin?${params}`);
    if (!response.ok) throw new Error('Failed to fetch zeiterfassung');
    return response.json();
  },

  /**
   * Get detailed zeiterfassung for a GL on a specific date with submission data
   */
  async getGLDayDetails(glId: string, date: string): Promise<any[]> {
    const response = await fetch(`${FRAGEBOGEN_API}/zeiterfassung/gl/${glId}/date/${date}`);
    if (!response.ok) throw new Error('Failed to fetch GL day details');
    return response.json();
  },

  async updateZusatz(id: string, data: { zeit_von?: string; zeit_bis?: string }): Promise<any> {
    const response = await fetch(`${FRAGEBOGEN_API}/zusatz-zeiterfassung/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update zusatz zeiterfassung');
    }
    return response.json();
  },

  async deleteZusatz(id: string): Promise<void> {
    const response = await fetch(`${FRAGEBOGEN_API}/zusatz-zeiterfassung/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete zusatz zeiterfassung');
    }
  },

  async updateDayTimes(glId: string, date: string, data: { day_start_time?: string; day_end_time?: string }): Promise<any> {
    const response = await fetch(`${FRAGEBOGEN_API}/day-tracking/update-times`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gebietsleiter_id: glId, date, ...data })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update day times');
    }
    return response.json();
  },

  async deleteEntry(id: string): Promise<void> {
    const response = await fetch(`${FRAGEBOGEN_API}/zeiterfassung/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete zeiterfassung');
    }
  }
};

// Default export for convenience
export default {
  questions: questionsApi,
  modules: modulesApi,
  fragebogen: fragebogenApi,
  responses: responsesApi,
  zeiterfassung: zeiterfassungApi,
  API_URL: FRAGEBOGEN_API
};
