// Shared interview metadata. AI requests are handled by the backend.
export const INTERVIEW_ROLES = [
  { value: 'java_developer', label: 'Java Developer' },
  { value: 'python_developer', label: 'Python Developer' },
  { value: 'react_developer', label: 'React Developer' },
  { value: 'full_stack_developer', label: 'Full Stack Developer' },
  { value: 'backend_engineer', label: 'Backend Engineer' },
  { value: 'frontend_engineer', label: 'Frontend Engineer' },
  { value: 'data_scientist', label: 'Data Scientist' },
  { value: 'data_engineer', label: 'Data Engineer' },
  { value: 'devops_engineer', label: 'DevOps Engineer' },
  { value: 'cloud_engineer', label: 'Cloud Engineer' },
  { value: 'qa_automation_engineer', label: 'QA Automation Engineer' },
  { value: 'mobile_developer', label: 'Mobile Developer' },
  { value: 'software_architect', label: 'Software Architect' },
  { value: 'engineering_manager', label: 'Engineering Manager' },
  { value: 'product_manager', label: 'Product Manager' },
  { value: 'hr_recruiter', label: 'HR / Recruiter' },
];

export const EXPERIENCE_LEVELS = [
  { value: 'fresher', label: 'Fresher' },
  { value: '1_3', label: '1-3 years' },
  { value: '3_5', label: '3-5 years' },
  { value: '5_7', label: '5-7 years' },
  { value: '7_10', label: '7-10 years' },
  { value: '10_12', label: '10-12 years' },
  { value: '12_15', label: '12-15 years' },
  { value: '15_20', label: '15-20 years' },
  { value: '20_25', label: '20-25 years' },
  { value: '25_30', label: '25-30 years' },
  { value: '30_35', label: '30-35 years' },
  { value: '35_plus', label: '35+ years' },
];

export const CATEGORIES = [
  'problem_solving',
  'behavioral',
  'java_core',
  'oops',
  'multithreading',
  'spring',
  'microservices',
  'system_design',
];

export const CAT_LABELS = {
  java_core: 'Java Core',
  oops: 'OOP',
  multithreading: 'Multithreading',
  spring: 'Spring Boot',
  microservices: 'Microservices',
  system_design: 'System Design',
  problem_solving: 'Problem Solving',
  behavioral: 'Behavioral',
  python_core: 'Python Core',
  django_fastapi: 'Django / FastAPI',
  data_modeling: 'Data Modeling',
  machine_learning: 'Machine Learning',
  statistics: 'Statistics',
  sql: 'SQL',
  react: 'React',
  javascript: 'JavaScript',
  frontend_architecture: 'Frontend Architecture',
  api_design: 'API Design',
  databases: 'Databases',
  cloud_devops: 'Cloud / DevOps',
  testing: 'Testing',
  mobile_architecture: 'Mobile Architecture',
  leadership: 'Leadership',
  architecture: 'Architecture',
  people_management: 'People Management',
  hiring: 'Hiring',
  employee_relations: 'Employee Relations',
};

export const CAT_COLORS = {
  java_core: '#f59e0b',
  oops: '#ec4899',
  multithreading: '#10b981',
  spring: '#6366f1',
  microservices: '#06b6d4',
  system_design: '#3b82f6',
  problem_solving: '#a78bfa',
  behavioral: '#f97316',
  python_core: '#eab308',
  django_fastapi: '#22c55e',
  data_modeling: '#14b8a6',
  machine_learning: '#8b5cf6',
  statistics: '#f43f5e',
  sql: '#0ea5e9',
  react: '#38bdf8',
  javascript: '#facc15',
  frontend_architecture: '#fb7185',
  api_design: '#60a5fa',
  databases: '#34d399',
  cloud_devops: '#64748b',
  testing: '#84cc16',
  mobile_architecture: '#c084fc',
  leadership: '#f97316',
  architecture: '#818cf8',
  people_management: '#ec4899',
  hiring: '#2dd4bf',
  employee_relations: '#f59e0b',
};

export const getRoleLabel = value =>
  INTERVIEW_ROLES.find(r => r.value === value)?.label || value || 'Interview Role';

export const getExperienceLabel = value =>
  EXPERIENCE_LEVELS.find(e => e.value === value)?.label || value || 'Experience Level';

export const formatCategoryLabel = category =>
  CAT_LABELS[category] || String(category || '')
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
