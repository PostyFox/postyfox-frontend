import { Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FieldDescriptor, groupedOptions } from '../../core/models/platforms';

/**
 * Renders one backend-declared field descriptor: a `<select>` when the descriptor carries a fixed set
 * of `options`, a text input otherwise, plus its error, help text and doc link.
 *
 * Used by both the connector editor (account config) and the compose form (per-submission platform
 * options), which describe their fields in exactly the same format — so neither owns the markup.
 */
@Component({
  selector: 'app-descriptor-field',
  imports: [FormsModule],
  template: `
    <div class="mb-3">
      <label class="form-label" [for]="fieldId()">{{ descriptor().label }}</label>
      @if (optionGroups().length) {
        <select
          [id]="fieldId()"
          class="form-select"
          [class.is-invalid]="error()"
          [ngModel]="value()"
          (ngModelChange)="valueChange.emit($event)"
        >
          <option value="">{{ descriptor().placeholder || 'Not set' }}</option>
          @for (group of optionGroups(); track $index) {
            @if (group.label) {
              <optgroup [label]="group.label">
                @for (option of group.options; track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </optgroup>
            } @else {
              @for (option of group.options; track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            }
          }
        </select>
      } @else {
        <input
          [id]="fieldId()"
          class="form-control"
          [class.is-invalid]="error()"
          [type]="type() || descriptor().type || 'text'"
          [attr.autocomplete]="autocomplete()"
          [placeholder]="descriptor().placeholder || ''"
          [ngModel]="value()"
          (ngModelChange)="valueChange.emit($event)"
        />
      }
      @if (error(); as err) {
        <div class="invalid-feedback d-block">{{ err }}</div>
      }
      @if (descriptor().help; as help) {
        <div class="form-text">{{ help }}</div>
      }
      @if (descriptor().link; as link) {
        <div class="form-text">
          <a [href]="link.href" target="_blank" rel="noopener">
            <i class="bi bi-box-arrow-up-right me-1"></i>{{ link.text }}
          </a>
        </div>
      }
    </div>
  `,
})
export class DescriptorFieldComponent {
  readonly fieldId = input.required<string>();
  readonly descriptor = input.required<FieldDescriptor>();
  readonly value = input<string>('');
  /** Validation message to show, or empty/undefined when the value is acceptable. */
  readonly error = input<string | undefined>();
  /** Overrides the descriptor's input type — secret fields force `password` regardless of schema. */
  readonly type = input<string | undefined>();
  readonly autocomplete = input<string | undefined>();
  readonly valueChange = output<string>();

  /**
   * The descriptor's options as `<optgroup>` runs. Derived from the descriptor input, so it is
   * recomputed only when the descriptor itself changes — FurAffinity's species list is ~400 entries.
   */
  readonly optionGroups = computed(() => groupedOptions(this.descriptor()));
}
