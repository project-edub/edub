// Re-exports from adminCurriculumTemplateService for lecturer use
// (same API endpoints, different context)
export {
  getTemplates,
  getTemplateLessons,
  createTemplate,
  updateTemplate,
  updateTemplateLessons,
  bulkUpdateLessons,
  deleteTemplate,
  generateFromTemplate,
  saveAsTemplate,
} from './adminCurriculumTemplateService';

export type {
  CreateTemplateRequest,
  UpdateTemplateRequest,
  UpdateTemplateLessonsRequest,
} from './adminCurriculumTemplateService';
