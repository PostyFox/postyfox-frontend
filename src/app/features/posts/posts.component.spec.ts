import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import {
  AutomationAction,
  PendingAutomation,
  PostRootStatus,
  PostSummary,
} from '../../core/models/api.models';
import { PostsComponent, buildCalendar } from './posts.component';
import { translocoTesting } from '../../../testing/transloco-testing';

const VIEW_KEY = 'postyfox.scheduledView';

function post(id: string, rootStatus: PostRootStatus, postAt: string | null = null): PostSummary {
  return {
    postId: id,
    rootStatus,
    title: `Post ${id}`,
    platforms: [],
    targetCount: 1,
    deliveredCount: 0,
    failedCount: 0,
    createdAt: '2026-10-01T09:00:00Z',
    updatedAt: '2026-10-01T09:00:00Z',
    postAt,
    pendingAutomationCount: 0,
  };
}

function repost(dueAt: string, estimated = false): PendingAutomation {
  return { action: AutomationAction.Repost, platform: 'BlueSky', dueAt, estimated };
}

describe('buildCalendar', () => {
  // October 2026 starts on a Thursday and ends on a Saturday.
  const october = new Date(2026, 9, 1);

  it('lays out Monday-first weeks padded with neighbouring days', () => {
    const weeks = buildCalendar(october, [], [], new Date(2026, 9, 8));
    expect(weeks.length).toBe(5);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0][0].date).toEqual(new Date(2026, 8, 28));
    expect(weeks[0][0].inMonth).toBe(false);
    expect(weeks[0][3].date).toEqual(new Date(2026, 9, 1));
    expect(weeks[0][3].inMonth).toBe(true);
    expect(weeks[4][6].date).toEqual(new Date(2026, 10, 1));
    expect(
      weeks
        .flat()
        .filter((d) => d.today)
        .map((d) => d.date.getDate()),
    ).toEqual([8]);
  });

  it('puts posts on the local day of their postAt, in order', () => {
    const a = post('a', PostRootStatus.Queued, new Date(2026, 9, 10, 9).toISOString());
    const b = post('b', PostRootStatus.Queued, new Date(2026, 9, 10, 18).toISOString());
    const c = post('c', PostRootStatus.Queued, new Date(2026, 10, 3, 9).toISOString());
    const days = buildCalendar(october, [a, b, c], [], new Date(2026, 9, 8)).flat();
    expect(days.find((d) => d.date.getDate() === 10)!.entries.map((e) => e.post)).toEqual([a, b]);
    expect(days.flatMap((d) => d.entries.map((e) => e.post))).not.toContain(c);
  });

  it('interleaves automations with posts by time on their dueAt day', () => {
    const a = post('a', PostRootStatus.Queued, new Date(2026, 9, 10, 9).toISOString());
    const b = post('b', PostRootStatus.Delivered);
    const automation = repost(new Date(2026, 9, 10, 8).toISOString(), true);
    const days = buildCalendar(
      october,
      [a],
      [{ post: b, automation }],
      new Date(2026, 9, 8),
    ).flat();
    const entries = days.find((d) => d.date.getDate() === 10)!.entries;
    expect(entries.map((e) => [e.kind, e.post.postId])).toEqual([
      ['automation', 'b'],
      ['post', 'a'],
    ]);
  });
});

describe('PostsComponent', () => {
  let fixture: ComponentFixture<PostsComponent>;

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 9, 8, 12) });
    localStorage.removeItem(VIEW_KEY);
    TestBed.configureTestingModule({
      imports: [PostsComponent, translocoTesting()],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    fixture?.destroy();
    vi.useRealTimers();
    localStorage.removeItem(VIEW_KEY);
  });

  function render(rows: PostSummary[]): HTMLElement {
    fixture = TestBed.createComponent(PostsComponent);
    fixture.detectChanges();
    vi.advanceTimersByTime(0);
    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url === `${environment.apiBaseUrl}/posts`)
      .flush(rows);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function scheduledCard(el: HTMLElement): HTMLElement | undefined {
    return [...el.querySelectorAll<HTMLElement>('.card')].find(
      (c) => c.querySelector('.card-title')?.textContent?.trim() === 'Scheduled',
    );
  }

  function button(el: HTMLElement, text: string): HTMLButtonElement {
    return [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === text)!;
  }

  const inFlight = post('now', PostRootStatus.Delivering);
  const soon = post('soon', PostRootStatus.Queued, new Date(2026, 9, 10, 9).toISOString());
  const later = post('later', PostRootStatus.Queued, new Date(2026, 9, 20, 9).toISOString());
  // Due but not yet picked up by the scheduler: it's active, not scheduled.
  const overdue = post('overdue', PostRootStatus.Queued, new Date(2026, 9, 8, 11).toISOString());

  it('splits future scheduled posts out of active, soonest first', () => {
    fixture = TestBed.createComponent(PostsComponent);
    const c = fixture.componentInstance;
    c.all.set([later, inFlight, overdue, soon]);
    expect(c.scheduled().map((p) => p.postId)).toEqual(['soon', 'later']);
    expect(c.active().map((p) => p.postId)).toEqual(['now', 'overdue']);
  });

  it('hides the scheduled section when nothing is scheduled', () => {
    const el = render([inFlight]);
    expect(scheduledCard(el)).toBeUndefined();
  });

  it('offers the calendar for a single scheduled post', () => {
    localStorage.setItem(VIEW_KEY, 'calendar');
    const card = scheduledCard(render([soon]))!;
    expect(card.querySelector('[aria-label="Scheduled view"]')).not.toBeNull();
    expect(card.querySelector('table a')?.getAttribute('href')).toBe('/posts/soon');
  });

  it('shows pending automations, flagging estimated times', () => {
    const delivered = {
      ...post('done', PostRootStatus.Delivered),
      pendingAutomationCount: 1,
      pendingAutomations: [repost(new Date(2026, 9, 12, 9).toISOString())],
    };
    const queued = {
      ...soon,
      pendingAutomationCount: 1,
      pendingAutomations: [repost(new Date(2026, 9, 11, 9).toISOString(), true)],
    };
    const el = render([delivered, queued]);
    let card = scheduledCard(el)!;
    expect(card.querySelector('.badge')!.textContent!.trim()).toBe('3');
    const rows = [...card.querySelectorAll('li')];
    expect(rows.map((r) => r.querySelector('a')!.getAttribute('href'))).toEqual([
      '/posts/soon',
      '/posts/done',
    ]);
    expect(rows[0].querySelector('[title]')!.getAttribute('title')).toContain('Estimated time');
    expect(rows[1].querySelector('.bi-info-circle')).toBeNull();

    button(card, 'Calendar').click();
    fixture.detectChanges();
    card = scheduledCard(el)!;
    const [estimated, fixed] = [
      ...card.querySelectorAll<HTMLAnchorElement>('table a.bg-label-info'),
    ];
    expect(estimated.getAttribute('href')).toBe('/posts/soon');
    expect(estimated.textContent).toContain('~');
    expect(estimated.title).toContain('Estimated time');
    expect(fixed.getAttribute('href')).toBe('/posts/done');
    expect(fixed.title).not.toContain('Estimated time');
  });

  it('shows the section for automations alone', () => {
    const delivered = {
      ...post('done', PostRootStatus.Delivered),
      pendingAutomationCount: 1,
      pendingAutomations: [repost(new Date(2026, 9, 12, 9).toISOString())],
    };
    expect(scheduledCard(render([delivered]))).toBeDefined();
  });

  it('switches between list and calendar and remembers the choice', () => {
    const el = render([soon, later]);
    let card = scheduledCard(el)!;
    expect(card.querySelector('table')).toBeNull();

    button(card, 'Calendar').click();
    fixture.detectChanges();
    card = scheduledCard(el)!;
    expect(localStorage.getItem(VIEW_KEY)).toBe('calendar');
    expect(card.textContent).toContain('October 2026');
    const links = [...card.querySelectorAll<HTMLAnchorElement>('table a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/posts/soon', '/posts/later']);

    button(card, 'List').click();
    fixture.detectChanges();
    expect(scheduledCard(el)!.querySelector('table')).toBeNull();
    expect(localStorage.getItem(VIEW_KEY)).toBe('list');
  });

  it('restores the calendar view from storage', () => {
    localStorage.setItem(VIEW_KEY, 'calendar');
    expect(scheduledCard(render([soon, later]))!.querySelector('table')).not.toBeNull();
  });

  it('moves the calendar between months', () => {
    localStorage.setItem(VIEW_KEY, 'calendar');
    const el = render([soon, later]);
    (el.querySelector('[title="Next month"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(scheduledCard(el)!.textContent).toContain('November 2026');
    expect(scheduledCard(el)!.querySelectorAll('table a').length).toBe(0);

    button(scheduledCard(el)!, 'Today').click();
    fixture.detectChanges();
    expect(scheduledCard(el)!.textContent).toContain('October 2026');
  });
});
