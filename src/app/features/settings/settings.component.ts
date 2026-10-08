import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, translate } from '@jsverse/transloco';
import { UserSettings } from '../../core/models/api.models';
import { ProfileService } from '../../core/services/profile.service';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

@Component({
  selector: 'app-settings',
  imports: [TranslocoDirective, FormsModule, PageHeaderComponent],
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  private profile = inject(ProfileService);
  private toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly settings = signal<UserSettings>({ includeAdvertisingLine: false, useGravatar: false });

  constructor() {
    this.profile.getSettings().subscribe({
      next: (s) => {
        this.settings.set(s);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error(translate('settings.couldNotLoadSettings'));
        this.loading.set(false);
      },
    });
  }

  set<K extends keyof UserSettings>(key: K, value: UserSettings[K]): void {
    const previous = this.settings();
    this.settings.set({ ...previous, [key]: value });
    this.saving.set(true);
    this.profile.updateSettings(this.settings()).subscribe({
      next: (s) => {
        this.settings.set(s);
        this.saving.set(false);
        this.toast.success(translate('settings.settingsSaved'));
      },
      error: () => {
        this.settings.set(previous);
        this.saving.set(false);
        this.toast.error(translate('settings.couldNotSaveSettings'));
      },
    });
  }
}
