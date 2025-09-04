import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

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
    path: 'login',
    loadComponent: () => import('./components/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'admin',
    loadComponent: () => import('./components/admin-panel/admin-panel').then(m => m.AdminPanelComponent),
    canActivate: [AuthGuard]
  },
  // Route 'question' supprimée
];
