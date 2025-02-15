import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { QuestionBase } from 'src/models/question-base';

@Component({
    selector: 'app-form-question',
    templateUrl: './form-question.component.html',
    styleUrl: './form-question.component.scss',
})
export class FormQuestionComponent {
    @Input() question!: QuestionBase<string>;
    @Input() form!: FormGroup;
    get isValid() {
        return this.form.controls[this.question.id].valid;
    }
}
