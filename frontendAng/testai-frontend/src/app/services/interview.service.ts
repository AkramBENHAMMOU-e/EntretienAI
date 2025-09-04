import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class InterviewService {
  constructor(private http: HttpClient) {}

  private get baseUrl(): string {
    if (typeof window !== 'undefined' && (window as any)['API_BASE_URL']) {
      return (window as any)['API_BASE_URL'] + '/api/interview';
    }
    return 'http://localhost:8000/api/interview';
  }

  startInterview(payload: {
    role_title: string;
    candidate_name?: string;
    offer_experience_level?: string;
    offer_tech_skills?: string[];
    offer_education?: string;
    offer_soft_skills?: string[];
  }): Promise<{ session_id: string }> {
    return firstValueFrom(this.http.post<{ session_id: string }>(`${this.baseUrl}/start`, payload));
  }

  getQuestion(sessionId: string): Promise<{ status: 'waiting' | 'question' | 'done' | 'error'; question?: string; message?: string }>{
    return firstValueFrom(this.http.get<{ status: 'waiting' | 'question' | 'done' | 'error'; question?: string; message?: string }>(`${this.baseUrl}/${sessionId}/question`));
  }

  sendAnswer(sessionId: string, answer: string): Promise<{ ok: boolean }>{
    return firstValueFrom(this.http.post<{ ok: boolean }>(`${this.baseUrl}/${sessionId}/answer`, { answer }));
  }

  getReport(sessionId: string): Promise<{ done: boolean; error?: string | null; transcript: { question: string; answer: string }[] }>{
    return firstValueFrom(this.http.get<{ done: boolean; error?: string | null; transcript: { question: string; answer: string }[] }>(`${this.baseUrl}/${sessionId}/report`));
  }
}

