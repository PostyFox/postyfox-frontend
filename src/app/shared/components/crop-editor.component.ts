import { Component, ElementRef, input, output, viewChild } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CropRegion } from '../../core/models/api.models';
import { AspectRange, constrainCrop, moveCrop } from '../../core/models/crop-geometry';

/** Fraction of the image an arrow key moves (or, with Shift, resizes) the crop by. */
const KEY_STEP = 0.01;

/**
 * Lets the author pick the part of an image to keep (issue #39). The box can be dragged to move it
 * and resized from its corner handle, or nudged with the arrow keys (Shift+arrows resize); every
 * change is held inside the image and the aspect `range` the selected platforms accept.
 */
@Component({
  selector: 'app-crop-editor',
  imports: [TranslocoPipe],
  template: `
    <div #frame class="crop-frame position-relative d-inline-block overflow-hidden rounded">
      <img
        [src]="src()"
        [alt]="'compose.cropImageAlt' | transloco"
        class="d-block"
        draggable="false"
      />
      <div
        class="crop-box position-absolute"
        tabindex="0"
        role="slider"
        [attr.aria-label]="'compose.cropBoxLabel' | transloco"
        [attr.aria-valuetext]="valueText()"
        [style.left.%]="region().x * 100"
        [style.top.%]="region().y * 100"
        [style.width.%]="region().width * 100"
        [style.height.%]="region().height * 100"
        (pointerdown)="begin($event, 'move')"
        (keydown)="onKey($event)"
      >
        <span class="crop-handle position-absolute" (pointerdown)="begin($event, 'resize')"></span>
      </div>
    </div>
  `,
  styles: `
    .crop-frame {
      max-width: 100%;
      touch-action: none;
      user-select: none;
    }
    .crop-frame img {
      max-width: 100%;
      max-height: 60vh;
    }
    .crop-box {
      cursor: move;
      outline: 2px solid #fff;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
    }
    .crop-box:focus-visible {
      outline: 3px solid var(--bs-primary);
    }
    .crop-handle {
      right: -7px;
      bottom: -7px;
      width: 14px;
      height: 14px;
      background: #fff;
      border: 2px solid var(--bs-primary);
      border-radius: 50%;
      cursor: nwse-resize;
    }
  `,
})
export class CropEditorComponent {
  readonly src = input.required<string>();
  /** Pixel size of the upright image, so the aspect range is judged in pixels, not fractions. */
  readonly imageWidth = input.required<number>();
  readonly imageHeight = input.required<number>();
  readonly range = input.required<AspectRange>();
  readonly region = input.required<CropRegion>();
  readonly regionChange = output<CropRegion>();

  private readonly frame = viewChild.required<ElementRef<HTMLElement>>('frame');

  valueText(): string {
    const r = this.region();
    const pct = (v: number) => Math.round(v * 100);
    return `${pct(r.x)}%, ${pct(r.y)}%, ${pct(r.width)}% × ${pct(r.height)}%`;
  }

  begin(event: PointerEvent, kind: 'move' | 'resize'): void {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
    const bounds = this.frame().nativeElement.getBoundingClientRect();
    const start = this.region();
    const startX = event.clientX;
    const startY = event.clientY;

    const onMove = (e: PointerEvent) => {
      const dx = (e.clientX - startX) / bounds.width;
      const dy = (e.clientY - startY) / bounds.height;
      this.emit(
        kind === 'move'
          ? moveCrop(start, dx, dy)
          : { ...start, width: start.width + dx, height: start.height + dy },
      );
    };
    const onUp = () => {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onUp);
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onUp);
  }

  onKey(event: KeyboardEvent): void {
    const steps: Record<string, [number, number]> = {
      ArrowLeft: [-KEY_STEP, 0],
      ArrowRight: [KEY_STEP, 0],
      ArrowUp: [0, -KEY_STEP],
      ArrowDown: [0, KEY_STEP],
    };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    const r = this.region();
    this.emit(
      event.shiftKey
        ? { ...r, width: r.width + step[0], height: r.height + step[1] }
        : moveCrop(r, step[0], step[1]),
    );
  }

  private emit(proposed: CropRegion): void {
    this.regionChange.emit(
      constrainCrop(proposed, this.imageWidth(), this.imageHeight(), this.range()),
    );
  }
}
