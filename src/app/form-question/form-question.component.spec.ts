import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';

import { FormQuestionComponent } from './form-question.component';
import { QuestionBase } from '../models/question-base';

describe('FormQuestionComponent', () => {
    let component: FormQuestionComponent;
    let fixture: ComponentFixture<FormQuestionComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [FormQuestionComponent, ReactiveFormsModule],
        }).compileComponents();

        fixture = TestBed.createComponent(FormQuestionComponent);
        component = fixture.componentInstance;

        // Set up required inputs with proper constructor parameters
        const testQuestion = new QuestionBase('test', 'Test Question', 'textbox', false);
        testQuestion.controlType = 'textbox'; // Ensure controlType is set
        component.question = testQuestion;
        component.form = new FormGroup({
            test: new FormControl(''),
        });

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
