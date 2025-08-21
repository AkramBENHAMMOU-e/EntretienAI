import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/interview',
    pathMatch: 'full'
  },
  {
    path: 'interview',
    loadComponent: () => import('./components/interview/interview').then(m => m.InterviewComponent)
  },
  {
    path: 'admin',
    loadComponent: () => import('./components/admin-panel/admin-panel').then(m => m.AdminPanelComponent)
  },
  {
    path: '**',
    redirectTo: '/interview'
  }
];
