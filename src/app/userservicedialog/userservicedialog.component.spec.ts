import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserservicedialogComponent } from './userservicedialog.component';

describe('UserservicedialogComponent', () => {
    let component: UserservicedialogComponent;
    let fixture: ComponentFixture<UserservicedialogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [UserservicedialogComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(UserservicedialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
