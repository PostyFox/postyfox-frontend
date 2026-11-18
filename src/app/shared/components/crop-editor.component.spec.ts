import { TestBed } from '@angular/core/testing';
import { CropRegion } from '../../core/models/api.models';
import { translocoTesting } from '../../../testing/transloco-testing';
import { CropEditorComponent } from './crop-editor.component';

describe('CropEditorComponent', () => {
  function render(region: CropRegion) {
    TestBed.configureTestingModule({ imports: [CropEditorComponent, translocoTesting()] });
    const fixture = TestBed.createComponent(CropEditorComponent);
    fixture.componentRef.setInput('src', 'blob:img');
    fixture.componentRef.setInput('imageWidth', 1000);
    fixture.componentRef.setInput('imageHeight', 1000);
    fixture.componentRef.setInput('range', { min: 0.8, max: 1.91 });
    fixture.componentRef.setInput('region', region);
    const emitted: CropRegion[] = [];
    fixture.componentInstance.regionChange.subscribe((r) => emitted.push(r));
    fixture.detectChanges();
    const box = (fixture.nativeElement as HTMLElement).querySelector('.crop-box') as HTMLElement;
    return { box, emitted };
  }

  it('moves the region with the arrow keys', () => {
    const { box, emitted } = render({ x: 0.1, y: 0.1, width: 0.5, height: 0.5 });
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(emitted[0].x).toBeCloseTo(0.11);
    expect(emitted[0].width).toBe(0.5);
  });

  it('resizes with Shift+arrow, held inside the aspect range', () => {
    const { box, emitted } = render({ x: 0, y: 0, width: 0.5, height: 0.5 });
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true }));
    // 0.5 × 0.51 is 0.98: still inside 0.8–1.91, so only the height changes.
    const r = emitted[0];
    expect(r.height).toBeCloseTo(0.51);
    expect(r.width).toBe(0.5);
    expect((r.width * 1000) / (r.height * 1000)).toBeGreaterThanOrEqual(0.8);
  });

  it('exposes the region to assistive technology', () => {
    const { box } = render({ x: 0.25, y: 0, width: 0.5, height: 1 });
    expect(box.getAttribute('aria-valuetext')).toBe('25%, 0%, 50% × 100%');
  });
});
