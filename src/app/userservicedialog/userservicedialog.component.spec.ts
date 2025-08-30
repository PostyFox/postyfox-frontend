import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ClarityModule } from '@clr/angular';

import { UserservicedialogComponent } from './userservicedialog.component';

describe('UserservicedialogComponent', () => {
    let component: UserservicedialogComponent;
    let fixture: ComponentFixture<UserservicedialogComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [UserservicedialogComponent],
            imports: [ReactiveFormsModule, FormsModule, HttpClientTestingModule, ClarityModule],
        }).compileComponents();

        fixture = TestBed.createComponent(UserservicedialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
