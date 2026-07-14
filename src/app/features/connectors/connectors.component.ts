import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  AuthState,
  ConnectorTarget,
  ServiceDefinition,
  TelegramLoginStep,
  UserConnector,
} from '../../core/models/api.models';
import {
  brandFor,
  capabilitiesByPlatform,
  capabilityChips,
  fieldMetaFor,
} from '../../core/models/platforms';
import { Capabilities } from '../../core/models/api.models';
import { ConfirmService } from '../../core/services/confirm.service';
import { ConnectorsService } from '../../core/services/connectors.service';
import { ServicesService } from '../../core/services/services.service';
import { ToastService } from '../../core/services/toast.service';
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
  hasExistingSecret: boolean;
}

interface AuthEntry {
  loading: boolean;
  state?: AuthState;
}

function parseKeys(schema: string | null | undefined): string[] {
  if (!schema) return [];
  try {
    const obj = JSON.parse(schema);
    return obj && typeof obj === 'object' ? Object.keys(obj) : [];
  } catch {
    return [];
  }
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
  imports: [FormsModule, PageHeaderComponent, EmptyStateComponent],
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

  /** editor */
  readonly editor = signal<EditorModel | null>(null);
  /** service picker (add flow) */
  readonly picking = signal(false);

  /** telegram login */
  readonly telegram = signal<UserConnector | null>(null);
  readonly telegramStep = signal<TelegramLoginStep | null>(null);
  readonly telegramValue = signal('');
  readonly telegramBusy = signal(false);

  readonly enabledCatalogue = computed(() => this.catalogue().filter((s) => s.enabled));
  readonly capsByPlatform = computed(() => capabilitiesByPlatform(this.catalogue()));

  // ----- presentation helpers ----------------------------------------------
  brand = brandFor;
  field = fieldMetaFor;

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
    const configFields = parseKeys(def.configSchema);
    const secureFields = parseKeys(def.secureConfigSchema);
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
      hasExistingSecret: false,
    });
  }

  editConnector(c: UserConnector): void {
    const def = this.definitionFor(c.serviceDefinitionId);
    const configFields = parseKeys(def?.configSchema);
    const secureFields = parseKeys(def?.secureConfigSchema);
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
    if (!e || !e.displayName.trim()) return;
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

  // ----- Targets ------------------------------------------------------------
  openTargets(c: UserConnector): void {
    this.targetsFor.set(c);
    this.targets.set(null);
    this.targetsLoading.set(true);
    this.connectors.listTargets(c.id).subscribe({
      next: (t) => {
        this.targets.set(t);
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
