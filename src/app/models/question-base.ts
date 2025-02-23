export class QuestionBase<T> {
    key: string;
    questionText: unknown;
    questionType: string;
    required: boolean;
    controlType: string;

    constructor(key: string, questionText: unknown, questionType: string, required: boolean = false) {
        this.key = key;

        this.questionText = questionText;
        this.questionType = questionType;
        this.required = required;
        this.controlType = 'textbox'; // TODO: Add more types
    }
}
