import { Component, Output, EventEmitter } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { QuestionBase } from 'src/models/question-base';
import { ServicesService } from 'src/app/services/services.service';
import { FormService } from 'src/app/services/form.service';

@Component({
    selector: 'app-userservicedialog',
    templateUrl: './userservicedialog.component.html',
    styleUrl: './userservicedialog.component.scss',
    standalone: false,
})
export class UserservicedialogComponent {
    @Output() clickedOK: EventEmitter<string> = new EventEmitter<string>();

    public serviceName: string;
    questions: QuestionBase<any>[] | null = [];
    form: FormGroup;

    constructor(
        private servicesService: ServicesService,
        private formService: FormService,
    ) {
        this.serviceName = '';
        this.questions = [];
        this.form = this.formService.createFormGroup(this.questions);
    }

    show = false;

    open(serviceId: string, serviceName: string) {
        this.servicesService.getAvailableService(serviceId).subscribe((service) => {
            this.serviceName = serviceName;
            let config = JSON.parse(service.configuration);
            if (config) {
                this.questions = new Array<QuestionBase<any>>();
                Object.entries(config).forEach(([key, value]) => {
                    console.log(' Config Item: ', key, ' = ', value);
                    this.questions?.push(new QuestionBase<string>(key, key, 'textbox', true));
                    this.form = this.formService.createFormGroup(this.questions || []);
                });
            } else {
                console.log("- Error: Service didn't return any valid configuration data!!");
            }
        });

        this.show = true;
    }

    close() {
        this.show = false;
    }

    onSubmit() {}

    closeClick() {
        this.close();
    }
}
