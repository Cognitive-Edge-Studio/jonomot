import type { RouteObject } from 'react-router-dom';
import { AdminReviewInbox } from './admin';
import { ResearcherDashboard } from './dashboard';
import { SurveyEditor } from './editor';
import { SurveyWorkspace } from './workspace';

export const researcherAdminRoutes: RouteObject[] = [
  { path: '/researcher', element: <ResearcherDashboard /> },
  { path: '/researcher/surveys/new', element: <SurveyEditor /> },
  { path: '/researcher/surveys/:surveyId/edit', element: <SurveyEditor /> },
  { path: '/researcher/surveys/:surveyId', element: <SurveyWorkspace /> },
  { path: '/admin/reviews', element: <AdminReviewInbox /> },
];
