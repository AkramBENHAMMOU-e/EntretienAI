import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface JobConfig {
  title: string;
  department: string;
  experience: string;
  salary: string;
  location: string;
  requirements: string;
  company_name: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  private get baseUrl(): string {
    if (typeof window !== 'undefined' && (window as any)['API_BASE_URL']) {
      return (window as any)['API_BASE_URL'] + '/api';
    }
    return 'http://localhost:8000/api';
  }

  getJobConfig(): Promise<JobConfig> {
    return firstValueFrom(this.http.get<JobConfig>(`${this.baseUrl}/admin/job-config`));
  }

  saveJobConfig(cfg: JobConfig): Promise<{ ok: boolean }> {
    return firstValueFrom(this.http.put<{ ok: boolean }>(`${this.baseUrl}/admin/job-config`, cfg));
  }

  getReportMarkdown(): Promise<{ name: string; modified: number; size: number; content: string }>{
    return firstValueFrom(this.http.get<{ name: string; modified: number; size: number; content: string }>(`${this.baseUrl}/admin/report/md`));
  }

}

