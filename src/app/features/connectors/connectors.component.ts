import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';
import {
  AuthState,
  ConnectorCookiePairingStart,
  ConnectorDestination,
  ConnectorTarget,
  ServiceDefinition,
  TelegramLoginStep,
  UserConnector,
} from '../../core/models/api.models';
import {
  FieldDescriptor,
  brandFor,
  capabilitiesByPlatform,
  capabilityChips,
  parseFieldDescriptors,
  validateField,
} from '../../core/models/platforms';
import { Capabilities } from '../../core/models/api.models';
import { ConfirmService } from '../../core/services/confirm.service';
import { ConnectorsService } from '../../core/services/connectors.service';
import { ServicesService } from '../../core/services/services.service';
import { ToastService } from '../../core/services/toast.service';
import { DescriptorFieldComponent } from '../../shared/components/descriptor-field.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

interface EditorModel {
  id: string | null;
  serviceDefinitionId: string;
  platform: string;
  displayName: string;
  enabled: boolean;
  configFields: string[];
  config: Record<string, string>;
  secureFields: string[];
  secure: Record<string, string>;
  /** Field metadata + validation rules for every config/secure field, keyed by field name. */
  descriptors: Record<string, FieldDescriptor>;
  hasExistingSecret: boolean;
}

interface AuthEntry {
  loading: boolean;
  state?: AuthState;
}

/**
 * State of the PostyFox Connect hand-off dialog. The extension finds the connector and the session
 * on its own, so a token is only minted when the user opens the fallback for a browser that cannot
 * sign in to PostyFox.
 */
interface CookieConnectModel {
  connector: UserConnector;
  pairing: ConnectorCookiePairingStart | null;
}

function parseObject(json: string | null | undefined): Record<string, string> {
  if (!json) return {};
  try {
    const obj = JSON.parse(json);
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

@Component({
  selector: 'app-connectors',
  imports: [FormsModule, PageHeaderComponent, EmptyStateComponent, DescriptorFieldComponent],
  templateUrl: './connectors.component.html',
})
export class ConnectorsComponent {
  private connectors = inject(ConnectorsService);
  private services = inject(ServicesService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);

  readonly list = signal<UserConnector[]>([]);
  readonly catalogue = signal<ServiceDefinition[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);

  /** connectorId → auth check state */
  readonly authStates = signal<Record<string, AuthEntry>>({});
  /** targets modal */
  readonly targetsFor = signal<UserConnector | null>(null);
  readonly targets = signal<ConnectorTarget[] | null>(null);
  readonly targetsLoading = signal(false);
  /** For platforms that support multiple targets, the externalIds currently checked to expose. */
  readonly selectedExternalIds = signal<Set<string>>(new Set());
  readonly destinationsSaving = signal(false);

  /** editor */
  readonly editor = signal<EditorModel | null>(null);
  /** service picker (add flow) */
  readonly picking = signal(false);

  /** telegram login */
  readonly telegram = signal<UserConnector | null>(null);
  readonly telegramStep = signal<TelegramLoginStep | null>(null);
  readonly telegramValue = signal('');
  readonly telegramBusy = signal(false);

  /** OAuth "connect" flow in progress (from the editor). */
  readonly connecting = signal(false);
  /** PostyFox Connect cookie hand-off flow. */
  readonly cookieConnect = signal<CookieConnectModel | null>(null);
  readonly pairingStarting = signal(false);
  readonly pairingChecking = signal(false);
  readonly pairingCopied = signal(false);

  readonly enabledCatalogue = computed(() => this.catalogue().filter((s) => s.enabled));
  readonly capsByPlatform = computed(() => capabilitiesByPlatform(this.catalogue()));

  /**
   * Per-field validation errors for the connector currently being edited, driven entirely by the
   * field descriptors the backend ships in the service definition schema (see {@link validateField}).
   * The server re-validates on save — this is inline UX only.
   */
  readonly configErrors = computed<Record<string, string>>(() => {
    const e = this.editor();
    if (!e) return {};
    const errors: Record<string, string> = {};
    for (const key of e.configFields) {
      const err = validateField(e.descriptors[key], e.config[key]);
      if (err) errors[key] = err;
    }
    for (const key of e.secureFields) {
      // A blank secret on an existing connector means "keep the stored value" — nothing to validate.
      if (!e.secure[key] && e.hasExistingSecret) continue;
      const err = validateField(e.descriptors[key], e.secure[key]);
      if (err) errors[key] = err;
    }
    return errors;
  });

  readonly hasConfigErrors = computed(() => Object.keys(this.configErrors()).length > 0);

  // ----- presentation helpers ----------------------------------------------
  brand = brandFor;

  /** Descriptor (label/help/placeholder/type/link/options) for a field being edited. */
  field(key: string): FieldDescriptor {
    return this.editor()?.descriptors[key] ?? { label: key };
  }

  supportsOAuth(platform: string): boolean {
    return this.capsByPlatform()[platform]?.supportsOAuth ?? false;
  }

  supportsCookiePairing(platform: string): boolean {
    return this.capsByPlatform()[platform]?.supportsCookiePairing ?? false;
  }

  supportsMultipleTargets(platform: string): boolean {
    return this.capsByPlatform()[platform]?.supportsMultipleTargets ?? false;
  }

  chipsForPlatform(platform: string) {
    const caps = this.capsByPlatform()[platform];
    return caps ? capabilityChips(caps) : [];
  }

  chipsForDef(def: Capabilities) {
    return capabilityChips(def);
  }

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    forkJoin({ list: this.connectors.list(), catalogue: this.services.list() }).subscribe({
      next: ({ list, catalogue }) => {
        this.list.set(list);
        this.catalogue.set(catalogue);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Could not load connectors');
        this.loading.set(false);
      },
    });
  }

  definitionFor(id: string): ServiceDefinition | undefined {
    return this.catalogue().find((s) => s.id === id);
  }

  // ----- Add / edit ---------------------------------------------------------
  startAdd(): void {
    this.picking.set(true);
  }

  pickService(def: ServiceDefinition): void {
    this.picking.set(false);
    const configDescriptors = parseFieldDescriptors(def.configSchema);
    const secureDescriptors = parseFieldDescriptors(def.secureConfigSchema);
    const configFields = Object.keys(configDescriptors);
    const secureFields = Object.keys(secureDescriptors);
    this.editor.set({
      id: null,
      serviceDefinitionId: def.id,
      platform: def.platform,
      displayName: def.name,
      enabled: true,
      configFields,
      config: Object.fromEntries(configFields.map((k) => [k, ''])),
      secureFields,
      secure: Object.fromEntries(secureFields.map((k) => [k, ''])),
      descriptors: { ...configDescriptors, ...secureDescriptors },
      hasExistingSecret: false,
    });
  }

  editConnector(c: UserConnector): void {
    const def = this.definitionFor(c.serviceDefinitionId);
    const configDescriptors = parseFieldDescriptors(def?.configSchema);
    const secureDescriptors = parseFieldDescriptors(def?.secureConfigSchema);
    const configFields = Object.keys(configDescriptors);
    const secureFields = Object.keys(secureDescriptors);
    const existing = parseObject(c.configJson);
    this.editor.set({
      id: c.id,
      serviceDefinitionId: c.serviceDefinitionId,
      platform: c.platform,
      displayName: c.displayName,
      enabled: c.enabled,
      configFields,
      config: Object.fromEntries(configFields.map((k) => [k, existing[k] ?? ''])),
      secureFields,
      secure: Object.fromEntries(secureFields.map((k) => [k, ''])),
      descriptors: { ...configDescriptors, ...secureDescriptors },
      hasExistingSecret: secureFields.length > 0,
    });
  }

  closeEditor(): void {
    this.editor.set(null);
  }

  patchConfig(key: string, value: string): void {
    this.editor.update((e) => (e ? { ...e, config: { ...e.config, [key]: value } } : e));
  }

  patchSecure(key: string, value: string): void {
    this.editor.update((e) => (e ? { ...e, secure: { ...e.secure, [key]: value } } : e));
  }

  patchDisplayName(value: string): void {
    this.editor.update((e) => (e ? { ...e, displayName: value } : e));
  }

  patchEnabled(value: boolean): void {
    this.editor.update((e) => (e ? { ...e, enabled: value } : e));
  }

  save(): void {
    const e = this.editor();
    if (!e || !e.displayName.trim() || this.hasConfigErrors()) return;
    // Only send a secret payload when the user actually entered secret values.
    const enteredSecret = e.secureFields.some((k) => e.secure[k]?.length);
    const secureConfigJson = enteredSecret ? JSON.stringify(e.secure) : null;

    this.saving.set(true);
    this.connectors
      .upsert({
        id: e.id,
        serviceDefinitionId: e.serviceDefinitionId,
        displayName: e.displayName.trim(),
        configJson: JSON.stringify(e.config),
        secureConfigJson,
        enabled: e.enabled,
      })
      .subscribe({
        next: () => {
          this.toast.success(e.id ? 'Connector updated' : 'Connector added');
          this.saving.set(false);
          this.closeEditor();
          this.load();
        },
        error: (err) => {
          this.toast.error('Could not save connector', err?.error?.error);
          this.saving.set(false);
        },
      });
  }

  // ----- OAuth connect flow -------------------------------------------------
  /** Saves the connector (to obtain an id + persist config) then opens the provider authorize popup. */
  async connect(): Promise<void> {
    const e = this.editor();
    if (!e || !e.displayName.trim() || this.hasConfigErrors()) return;
    this.connecting.set(true);
    try {
      const saved = await firstValueFrom(
        this.connectors.upsert({
          id: e.id,
          serviceDefinitionId: e.serviceDefinitionId,
          displayName: e.displayName.trim(),
          configJson: JSON.stringify(e.config),
          // Never clear an OAuth-managed secret here; the callback writes it.
          secureConfigJson: null,
          enabled: e.enabled,
        }),
      );
      this.editor.update((cur) => (cur ? { ...cur, id: saved.id } : cur));
      const { authorizeUrl } = await firstValueFrom(this.connectors.startOAuth(saved.id));
      this.openOAuthPopup(authorizeUrl);
    } catch (err: any) {
      this.connecting.set(false);
      this.toast.error('Could not start connection', err?.error?.error);
    }
  }

  private openOAuthPopup(url: string): void {
    const popup = window.open(url, 'pf-oauth', 'width=760,height=820');
    if (!popup) {
      // Popups blocked — fall back to a full-page redirect; the callback returns to /connectors.
      window.location.href = url;
      return;
    }
    const finish = (): void => {
      window.removeEventListener('message', handler);
      clearInterval(timer);
    };
    const handler = (ev: MessageEvent): void => {
      if (ev.origin !== window.location.origin || ev.data?.type !== 'postyfox-oauth') return;
      finish();
      this.connecting.set(false);
      if (ev.data.ok) {
        this.toast.success('Connected');
        this.closeEditor();
        this.load();
      } else {
        this.toast.error('Connection failed', 'Authorization was not completed.');
      }
    };
    // If the user closes the popup without finishing, stop the spinner.
    const timer = setInterval(() => {
      if (popup.closed) {
        finish();
        this.connecting.set(false);
      }
    }, 800);
    window.addEventListener('message', handler);
  }

  /**
   * Saves an editor before pairing so the browser client receives a connector-bound token.
   * Existing connectors can also enter this flow directly from their card.
   */
  async connectCookies(): Promise<void> {
    const e = this.editor();
    if (!e || !e.displayName.trim() || this.hasConfigErrors()) return;
    this.pairingStarting.set(true);
    try {
      const saved = await firstValueFrom(
        this.connectors.upsert({
          id: e.id,
          serviceDefinitionId: e.serviceDefinitionId,
          displayName: e.displayName.trim(),
          configJson: JSON.stringify(e.config),
          secureConfigJson: null,
          enabled: e.enabled,
        }),
      );
      this.closeEditor();
      this.openCookieConnect(saved);
      this.load();
    } catch (err: any) {
      this.toast.error('Could not save the connector', err?.error?.error);
    } finally {
      this.pairingStarting.set(false);
    }
  }

  /**
   * Shows the hand-off instructions. Nothing is minted up front — the extension authenticates with
   * the user's own PostyFox session, so a five-minute token would usually expire unused.
   */
  openCookieConnect(connector: UserConnector): void {
    this.cookieConnect.set({ connector, pairing: null });
    this.pairingCopied.set(false);
  }

  /** Fallback: mint a one-use token for a browser that cannot sign in to PostyFox. */
  async requestPairingToken(): Promise<void> {
    const current = this.cookieConnect();
    if (!current) return;
    this.pairingStarting.set(true);
    try {
      const pairing = await firstValueFrom(
        this.connectors.startCookiePairing(current.connector.id),
      );
      this.cookieConnect.set({ ...current, pairing });
      this.pairingCopied.set(false);
    } catch (err: any) {
      this.toast.error('Could not create a pairing token', err?.error?.error);
    } finally {
      this.pairingStarting.set(false);
    }
  }

  async copyPairingToken(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.pairingCopied.set(true);
      window.setTimeout(() => this.pairingCopied.set(false), 2000);
    } catch {
      this.toast.error('Could not copy to clipboard');
    }
  }

  pairingExpiry(expiresAt: string): string {
    return new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  checkCookieConnect(): void {
    const current = this.cookieConnect();
    if (!current) return;
    const { connector } = current;
    this.pairingChecking.set(true);
    this.connectors.isAuthenticated(connector.id).subscribe({
      next: (state) => {
        this.pairingChecking.set(false);
        this.authStates.update((states) => ({
          ...states,
          [connector.id]: { loading: false, state },
        }));
        if (state.isAuthenticated) {
          this.toast.success(`${connector.displayName} connected`, state.detail ?? undefined);
          this.closeCookieConnect();
        } else {
          this.toast.warning(
            `${connector.displayName} is not connected yet`,
            state.detail ?? undefined,
          );
        }
      },
      error: (err) => {
        this.pairingChecking.set(false);
        this.toast.error(`Could not check ${connector.displayName}`, err?.error?.error);
      },
    });
  }

  closeCookieConnect(): void {
    this.cookieConnect.set(null);
    this.pairingChecking.set(false);
  }

  async remove(c: UserConnector): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Delete connector',
      message: `Delete “${c.displayName}”? Posts will no longer be delivered to it.`,
      confirmText: 'Delete',
      kind: 'danger',
    });
    if (!ok) return;
    this.connectors.delete(c.id).subscribe({
      next: () => {
        this.toast.success('Connector deleted');
        this.load();
      },
      error: () => this.toast.error('Could not delete connector'),
    });
  }

  // ----- Auth check ---------------------------------------------------------
  checkAuth(c: UserConnector): void {
    this.authStates.update((s) => ({ ...s, [c.id]: { loading: true } }));
    this.connectors.isAuthenticated(c.id).subscribe({
      next: (state) => this.authStates.update((s) => ({ ...s, [c.id]: { loading: false, state } })),
      error: () =>
        this.authStates.update((s) => ({
          ...s,
          [c.id]: { loading: false, state: { isAuthenticated: false, detail: 'Check failed' } },
        })),
    });
  }

  // ----- Targets / destinations ---------------------------------------------
  /**
   * Opens the targets/destinations modal. For single-target platforms this is a read-only view of
   * the live platform-side list; for multi-target platforms (Telegram) it's a checklist letting the
   * user pick which of those live targets to expose as selectable destinations in the compose form.
   */
  openTargets(c: UserConnector): void {
    this.targetsFor.set(c);
    this.targets.set(null);
    this.selectedExternalIds.set(new Set());
    this.targetsLoading.set(true);

    const multi = this.supportsMultipleTargets(c.platform);
    const targets$ = this.connectors.listTargets(c.id);
    const exposed$ = multi ? this.connectors.listDestinations(c.id) : undefined;

    (exposed$
      ? forkJoin({ targets: targets$, exposed: exposed$ })
      : forkJoin({ targets: targets$ })
    ).subscribe({
      next: (result: { targets: ConnectorTarget[]; exposed?: ConnectorDestination[] | null }) => {
        this.targets.set(result.targets);
        this.selectedExternalIds.set(new Set((result.exposed ?? []).map((d) => d.externalId)));
        this.targetsLoading.set(false);
      },
      error: () => {
        this.toast.error('Could not list targets');
        this.targetsLoading.set(false);
        this.targetsFor.set(null);
      },
    });
  }

  closeTargets(): void {
    this.targetsFor.set(null);
  }

  isExposed(id: string): boolean {
    return this.selectedExternalIds().has(id);
  }

  toggleDestination(id: string): void {
    this.selectedExternalIds.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  saveDestinations(): void {
    const c = this.targetsFor();
    const available = this.targets();
    if (!c || !available) return;
    const selected = this.selectedExternalIds();
    const destinations = available
      .filter((t) => selected.has(t.id))
      .map((t) => ({ externalId: t.id, name: t.name }));

    this.destinationsSaving.set(true);
    this.connectors.setDestinations(c.id, destinations).subscribe({
      next: () => {
        this.destinationsSaving.set(false);
        this.toast.success('Destinations updated');
        this.closeTargets();
      },
      error: (err) => {
        this.destinationsSaving.set(false);
        this.toast.error('Could not save destinations', err?.error?.error);
      },
    });
  }

  // ----- Telegram login -----------------------------------------------------
  isTelegram(c: UserConnector): boolean {
    return c.platform.toLowerCase() === 'telegram';
  }

  startTelegram(c: UserConnector): void {
    this.telegram.set(c);
    this.telegramStep.set(null);
    this.telegramValue.set('');
    this.advanceTelegram();
  }

  advanceTelegram(): void {
    const c = this.telegram();
    if (!c) return;
    this.telegramBusy.set(true);
    const value = this.telegramStep() ? this.telegramValue() : null;
    this.connectors.telegramLogin(c.id, value).subscribe({
      next: (step) => {
        this.telegramBusy.set(false);
        this.telegramValue.set('');
        if (step.status === 'complete') {
          this.toast.success('Telegram authenticated');
          this.closeTelegram();
        } else {
          this.telegramStep.set(step);
        }
      },
      error: (err) => {
        this.telegramBusy.set(false);
        this.toast.error('Telegram login failed', err?.error?.error);
      },
    });
  }

  closeTelegram(): void {
    this.telegram.set(null);
    this.telegramStep.set(null);
  }
}
