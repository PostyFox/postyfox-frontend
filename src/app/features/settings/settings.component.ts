import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProfileService } from '../../core/services/profile.service';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

@Component({
  selector: 'app-settings',
  imports: [FormsModule, PageHeaderComponent],
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  private profile = inject(ProfileService);
  private toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly includeAdvertisingLine = signal(false);

  constructor() {
    this.profile.getSettings().subscribe({
      next: (s) => {
        this.includeAdvertisingLine.set(s.includeAdvertisingLine);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Could not load settings');
        this.loading.set(false);
      },
    });
  }

  setIncludeAdvertisingLine(value: boolean): void {
    const previous = this.includeAdvertisingLine();
    this.includeAdvertisingLine.set(value);
    this.saving.set(true);
    this.profile.updateSettings({ includeAdvertisingLine: value }).subscribe({
      next: (s) => {
        this.includeAdvertisingLine.set(s.includeAdvertisingLine);
        this.saving.set(false);
        this.toast.success('Settings saved');
      },
      error: () => {
        this.includeAdvertisingLine.set(previous);
        this.saving.set(false);
        this.toast.error('Could not save settings');
      },
    });
  }
}
