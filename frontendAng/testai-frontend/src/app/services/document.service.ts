import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  constructor(private http: HttpClient) {}

  private get baseUrl(): string {
    if (typeof window !== 'undefined' && (window as any)['API_BASE_URL']) {
      return (window as any)['API_BASE_URL'] + '/api';
    }
    return 'http://localhost:8000/api';
  }

  upload(file: File): Promise<{ saved: string }>{
    const form = new FormData();
    form.append('file', file, file.name);
    return firstValueFrom(this.http.post<{ saved: string }>(`${this.baseUrl}/admin/upload`, form));
  }

  reindex(): Promise<{ ok: boolean }>{
    return firstValueFrom(this.http.get<{ ok: boolean }>(`${this.baseUrl}/admin/reindex`));
  }

  list(): Promise<{ files: { name: string; size: number; modified: number; ext: string }[] }>{
    return firstValueFrom(this.http.get<{ files: { name: string; size: number; modified: number; ext: string }[] }>(`${this.baseUrl}/admin/knowledge`));
  }

  delete(name: string): Promise<{ ok: boolean }>{
    return firstValueFrom(this.http.delete<{ ok: boolean }>(`${this.baseUrl}/admin/knowledge/${encodeURIComponent(name)}`));
  }
}

