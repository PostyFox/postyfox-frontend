export class QuestionBase<T> {
    id: number;
    questionText: string;
    questionType: string;

    constructor(id: number, questionText: string, questionType: string) {
        this.id = id;
        this.questionText = questionText;
        this.questionType = questionType;
    }
}
