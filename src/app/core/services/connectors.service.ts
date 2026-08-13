import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthState,
  ConnectorCookiePairingStart,
  ConnectorDestination,
  ConnectorDestinationInput,
  ConnectorDestinationSummary,
  ConnectorTarget,
  MediaCheckRequest,
  MediaCheckResultItem,
  SetConnectorDestinationsRequest,
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

  /** Destinations currently exposed for posting under one connector (see {@link setDestinations}). */
  listDestinations(id: string): Observable<ConnectorDestination[]> {
    return this.http.get<ConnectorDestination[]>(`${this.base}/${id}/destinations`);
  }

  /**
   * Replace the full set of destinations exposed for a multi-target connector (matched by
   * `externalId`) — entries not included are removed, new ones added, names refreshed.
   */
  setDestinations(
    id: string,
    destinations: ConnectorDestinationInput[],
  ): Observable<ConnectorDestination[]> {
    const body: SetConnectorDestinationsRequest = { destinations };
    return this.http.put<ConnectorDestination[]>(`${this.base}/${id}/destinations`, body);
  }

  /** Every destination the user has exposed across all their connectors, for the compose form. */
  listAllDestinations(): Observable<ConnectorDestinationSummary[]> {
    return this.http.get<ConnectorDestinationSummary[]>(`${this.base}/destinations`);
  }

  /** Advance the Telegram MTProto login; call repeatedly until `status === 'complete'`. */
  telegramLogin(id: string, value?: string | null): Observable<TelegramLoginStep> {
    return this.http.post<TelegramLoginStep>(`${this.base}/${id}/telegram/login`, { value });
  }

  /** Begin the OAuth "connect" flow; returns the provider URL to open in the browser. */
  startOAuth(id: string): Observable<{ authorizeUrl: string }> {
    return this.http.post<{ authorizeUrl: string }>(`${this.base}/${id}/oauth/start`, {});
  }

  /** Create a short-lived, one-use token for PostyFox Connect to transfer browser cookies. */
  startCookiePairing(id: string): Observable<ConnectorCookiePairingStart> {
    return this.http.post<ConnectorCookiePairingStart>(
      `${this.base}/${id}/cookie-pairing/start`,
      {},
    );
  }

  /**
   * Pre-flight media check: given a file's size and MIME type, returns per-connector analysis of
   * whether the file will be resized/transcoded before delivery. Call this after the user selects
   * a file to surface "file too large — will be resized" warnings in the compose UI.
   */
  checkMedia(body: MediaCheckRequest): Observable<MediaCheckResultItem[]> {
    return this.http.post<MediaCheckResultItem[]>(`${this.base}/media-check`, body);
  }
}
