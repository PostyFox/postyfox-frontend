import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { QuestionBase } from 'src/models/question-base';

@Injectable({
    providedIn: 'root',
})
export class FormService {
    constructor(private fb: FormBuilder) {}

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
