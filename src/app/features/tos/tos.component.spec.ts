import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideMarkdown } from 'ngx-markdown';

import { environment } from '../../../environments/environment';
import { TosComponent } from './tos.component';
import { translocoTesting } from '../../../testing/transloco-testing';

describe('TosComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TosComponent, translocoTesting()],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideMarkdown(),
      ],
    });
  });

  function render(respond: (req: ReturnType<HttpTestingController['expectOne']>) => void): string {
    const fixture = TestBed.createComponent(TosComponent);
    fixture.detectChanges();
    respond(
      TestBed.inject(HttpTestingController).expectOne(`${environment.apiBaseUrl}/terms/current`),
    );
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('shows the published date when terms are in force', () => {
    const text = render((req) =>
      req.flush({ version: 1, content: '# Terms', publishedAt: '2026-09-29T00:00:00Z' }),
    );
    expect(text).toContain('Published 2026-09-29');
  });

  it('says so when no terms are configured', () => {
    const text = render((req) => req.flush(null, { status: 204, statusText: 'No Content' }));
    expect(text).toContain('has no terms of service');
  });

  it('reports a load failure', () => {
    const text = render((req) => req.flush(null, { status: 500, statusText: 'Error' }));
    expect(text).toContain('could not be loaded');
  });
});
