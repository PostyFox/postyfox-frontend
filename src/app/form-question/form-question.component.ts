import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { QuestionBase } from 'src/models/question-base';

@Component({
    selector: 'app-form-question',
    templateUrl: './form-question.component.html',
    styleUrl: './form-question.component.scss',
    imports: [CommonModule, ReactiveFormsModule],
})
export class FormQuestionComponent {
    @Input() question!: QuestionBase<any>;
    @Input() form!: FormGroup;

    get isValid() {
        if (this.form) {
            return this.form.controls[this.question.key].valid;
        }
        return false;
    }
}
