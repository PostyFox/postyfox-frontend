import { Injectable, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { QuestionBase } from 'src/app/models/question-base';

@Injectable({
    providedIn: 'root',
})
export class FormService {
    private fb = inject(FormBuilder);

    createFormGroup(questions: QuestionBase<any>[]): FormGroup {
        const group: any = {};

        questions.forEach((question) => {
            group[question.key] = question.required
                ? new FormControl(question.questionText || '', Validators.required)
                : new FormControl(question.questionText || '');
        });
        return this.fb.group(group);
    }
}
