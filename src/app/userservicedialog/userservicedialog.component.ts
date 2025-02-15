import { Component, Inject, Output, EventEmitter } from '@angular/core';
import { ServicesService } from '../services/services.service';
import { TemplatesService } from '../services/templates.service';

import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { FormQuestionComponent } from '../form-question/form-question.component';
@Component({
    selector: 'app-userservicedialog',
    templateUrl: './userservicedialog.component.html',
    styleUrl: './userservicedialog.component.scss',
    standalone: false,
})
export class UserservicedialogComponent {
    @Output() clickedOK: EventEmitter<string> = new EventEmitter<string>();

    public serviceName: string;
    // questions: QuestionBase<string>[] | null = [];
    questions: string[];
    form!: FormGroup;

    constructor(
        //     // public dialogRef: MatDialogRef<UserservicedialogComponent>,
        private servicesService: ServicesService,
        //     private templatesService: TemplatesService,
        //     // @Inject(MAT_DIALOG_DATA) public data: any,
    ) {
        this.serviceName = '';
        this.questions = ['testing'];
        let formControls = new Array();
        for (let question of this.questions) {
            formControls.push(new FormControl(question));
        }

        this.form = new FormGroup(formControls);
    }

    show = false;

    open(serviceId: string, serviceName: string) {
        this.servicesService.getAvailableService(serviceId).subscribe((service) => {
            // this.service = service;
            // console.log(service);
            this.serviceName = serviceName;
            // Loop over the data in configuration and build the dynamic form

            let config = JSON.parse(service.configuration);
            if (config) {
                Object.entries(config).forEach(([key, value]) => {
                    console.log(' Config Item: ', key, ' = ', value);
                });
            } else {
                console.log("- Error: Service didn't return any valid configuration data!!");
            }

            // TODO - build the form ...
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
