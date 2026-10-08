import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, TitleStrategy, provideRouter } from '@angular/router';

import { translocoTesting } from '../../../testing/transloco-testing';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { TranslatedTitleStrategy, TranslocoHttpLoader } from './i18n';

@Component({ template: '' })
class BlankComponent {}

describe('i18n', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [translocoTesting()],
      providers: [
        provideRouter([{ path: 'posts', title: 'nav.posts', component: BlankComponent }]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: TitleStrategy, useClass: TranslatedTitleStrategy },
      ],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('loads translations from public/i18n', () => {
    TestBed.inject(TranslocoHttpLoader).getTranslation('en-GB').subscribe();
    TestBed.inject(HttpTestingController).expectOne('/i18n/en-GB.json').flush({});
  });

  it('translates route title keys into the page title', async () => {
    await TestBed.inject(Router).navigateByUrl('/posts');
    expect(TestBed.inject(Title).getTitle()).toBe('Posts · PostyFox');
  });

  it('sends the UI language to the API', () => {
    TestBed.inject(HttpClient).get('/api/posts').subscribe();
    const req = TestBed.inject(HttpTestingController).expectOne('/api/posts');
    expect(req.request.headers.get('Accept-Language')).toBe('en-GB');
    req.flush([]);
  });
});
