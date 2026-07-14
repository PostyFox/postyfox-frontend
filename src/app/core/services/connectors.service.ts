import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthState,
  ConnectorTarget,
  TelegramLoginStep,
  UserConnector,
  UserConnectorUpsertRequest,
} from '../models/api.models';

/** `/api/connectors` — the user's configured connector instances + platform operations. */
@Injectable({ providedIn: 'root' })
export class ConnectorsService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/connectors`;

  list(): Observable<UserConnector[]> {
    return this.http.get<UserConnector[]>(this.base);
  }

  get(id: string): Observable<UserConnector> {
    return this.http.get<UserConnector>(`${this.base}/${id}`);
  }

  upsert(body: UserConnectorUpsertRequest): Observable<UserConnector> {
    return this.http.put<UserConnector>(this.base, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  isAuthenticated(id: string): Observable<AuthState> {
    return this.http.get<AuthState>(`${this.base}/${id}/authenticated`);
  }

  listTargets(id: string): Observable<ConnectorTarget[]> {
    return this.http.get<ConnectorTarget[]>(`${this.base}/${id}/targets`);
  }

  /** Advance the Telegram MTProto login; call repeatedly until `status === 'complete'`. */
  telegramLogin(id: string, value?: string | null): Observable<TelegramLoginStep> {
    return this.http.post<TelegramLoginStep>(`${this.base}/${id}/telegram/login`, { value });
  }
}
