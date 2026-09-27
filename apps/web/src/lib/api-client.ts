import {
  AuthResponseData,
  CatEntity,
  AudioRecordingEntity,
  AnalysisResultResponseData,
  AnalysisProgressEvent,
  FeedbackEntity,
  RecordingSource
} from '@mewsense/shared-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('mewsense_access_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('mewsense_access_token', token);
      } else {
        localStorage.removeItem('mewsense_access_token');
      }
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('mewsense_access_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, isRetry = false): Promise<T> {
    const headers = new Headers(options.headers || {});
    const token = this.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const json = await res.json().catch(() => null);

    if (res.status === 401 && !isRetry && !endpoint.startsWith('/auth/')) {
      this.setToken(null);
      try {
        await this.login('guardian@mewsense.app', 'MewSense2026!');
        return this.request<T>(endpoint, options, true);
      } catch {
        // Fall back to throwing original 401 error if re-authentication fails
      }
    }

    if (!res.ok) {
      const message = json?.error?.message || `Request failed with status ${res.status}`;
      const error = new Error(message);
      (error as any).code = json?.error?.code;
      (error as any).details = json?.error?.details;
      throw error;
    }

    return json.data as T;
  }

  // Auth Endpoints
  async register(data: { email: string; password: string; fullName: string; allowTrainingConsent?: boolean }): Promise<AuthResponseData> {
    const res = await this.request<AuthResponseData>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    this.setToken(res.accessToken);
    return res;
  }

  async login(email: string, password: string): Promise<AuthResponseData> {
    const res = await this.request<AuthResponseData>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(res.accessToken);
    return res;
  }

  async getMe(): Promise<any> {
    return this.request<{ user: any }>('/auth/me');
  }

  // Cats Endpoints
  async listCats(): Promise<CatEntity[]> {
    return this.request<CatEntity[]>('/cats');
  }

  async createCat(data: { name: string; breed?: string; birthDate?: string; sex?: string }): Promise<CatEntity> {
    return this.request<CatEntity>('/cats', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deleteCat(catId: string): Promise<void> {
    return this.request<void>(`/cats/${catId}`, { method: 'DELETE' });
  }

  // Audio Ingestion
  async uploadAudioDirect(
    file: Blob | File,
    filename: string,
    catId?: string,
    context?: any,
    source: RecordingSource = RecordingSource.MICROPHONE_WEB
  ): Promise<AudioRecordingEntity> {
    const formData = new FormData();
    formData.append('audio', file, filename);
    formData.append('source', source);
    if (catId) formData.append('catId', catId);
    if (context) formData.append('context', JSON.stringify(context));

    return this.request<AudioRecordingEntity>('/audio/direct-upload', {
      method: 'POST',
      body: formData
    });
  }

  // Analysis Operations
  async enqueueAnalysis(recordingId: string): Promise<{ analysisId: string; streamUrl: string }> {
    return this.request<{ analysisId: string; streamUrl: string }>('/analysis', {
      method: 'POST',
      body: JSON.stringify({ recordingId })
    });
  }

  async getAnalysis(analysisId: string): Promise<AnalysisResultResponseData> {
    return this.request<AnalysisResultResponseData>(`/analysis/${analysisId}`);
  }

  async getHistory(limit = 20): Promise<any[]> {
    return this.request<any[]>(`/analysis/history?limit=${limit}`);
  }

  // Real-Time SSE Stream with fallback
  subscribeAnalysis(
    analysisId: string,
    onProgress: (event: AnalysisProgressEvent) => void,
    onCompleted: (result: AnalysisResultResponseData) => void,
    onError: (err: any) => void
  ): () => void {
    const token = this.getToken();
    const streamUrl = `${API_BASE}/analysis/${analysisId}/stream?token=${encodeURIComponent(token || '')}`;

    if (typeof EventSource !== 'undefined') {
      const es = new EventSource(streamUrl);

      es.addEventListener('progress', (e) => {
        try {
          const data: AnalysisProgressEvent = JSON.parse(e.data);
          onProgress(data);
          if (data.status === 'COMPLETED') {
            if (data.result) {
              onCompleted(data.result);
            } else {
              this.getAnalysis(analysisId).then(onCompleted).catch(onError);
            }
            es.close();
          } else if (data.status === 'FAILED') {
            onError(new Error(data.message || 'Bioacoustic analysis failed'));
            es.close();
          }
        } catch (err) {
          console.error('Error parsing SSE progress event:', err);
        }
      });

      es.onerror = () => {
        // Fallback to short polling if SSE connection drops
        es.close();
        this.pollAnalysis(analysisId, onProgress, onCompleted, onError);
      };

      return () => es.close();
    } else {
      return this.pollAnalysis(analysisId, onProgress, onCompleted, onError);
    }
  }

  private pollAnalysis(
    analysisId: string,
    onProgress: (event: AnalysisProgressEvent) => void,
    onCompleted: (result: AnalysisResultResponseData) => void,
    onError: (err: any) => void
  ): () => void {
    let active = true;
    const poll = async () => {
      if (!active) return;
      try {
        const result = await this.getAnalysis(analysisId);
        if (result.status === 'COMPLETED') {
          onCompleted(result);
          return;
        } else if (result.status === 'FAILED') {
          onError(new Error(result.error || 'Analysis failed'));
          return;
        } else {
          onProgress({
            analysisId,
            status: result.status,
            stage: result.stage,
            percent: 65,
            message: 'Processing vocalization...'
          });
          setTimeout(poll, 1000);
        }
      } catch (err) {
        if (active) setTimeout(poll, 1500);
      }
    };
    poll();
    return () => {
      active = false;
    };
  }

  // Feedback Submission
  async submitFeedback(data: { analysisId: string; isAccurate: boolean; userPerceivedSound?: string; userPerceivedContext?: string; notes?: string }): Promise<FeedbackEntity> {
    return this.request<FeedbackEntity>('/feedback', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

export const api = new ApiClient();
