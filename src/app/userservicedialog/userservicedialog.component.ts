import { Component, Output, EventEmitter, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { QuestionBase } from 'src/app/models/question-base';
import { ServicesService } from 'src/app/services/services.service';
import { FormService } from 'src/app/services/form.service';

@Component({
    selector: 'app-userservicedialog',
    templateUrl: './userservicedialog.component.html',
    styleUrl: './userservicedialog.component.scss',
    standalone: false,
})
export class UserservicedialogComponent {
    private servicesService = inject(ServicesService);
    private formService = inject(FormService);

    @Output() clickedOK: EventEmitter<string> = new EventEmitter<string>();

    public serviceName: string;
    public serviceId: string;
    questions: QuestionBase<any>[] | null = [];
    form: FormGroup;

    constructor() {
        this.serviceName = '';
        this.serviceId = '';
        this.questions = [];
        this.form = this.formService.createFormGroup(this.questions);
    }

    show = false;

    open(serviceId: string, serviceName: string) {
        // Clear down form
        this.serviceName = '';
        this.serviceId = '';
        this.questions = [];
        this.form = this.formService.createFormGroup(this.questions);

        this.servicesService.getAvailableService(serviceId).subscribe((service) => {
            this.serviceName = serviceName;
            this.serviceId = serviceId;
            if (service) {
                let config = JSON.parse(service.configuration);
                if (config) {
                    this.questions = new Array<QuestionBase<any>>();
                    Object.entries(config).forEach(([key, value]) => {
                        console.log(' Config Item: ', key, ' = ', value);
                        this.questions?.push(new QuestionBase<string>(key, key, 'textbox', true));
                        this.form = this.formService.createFormGroup(this.questions || []);
                    });

                    // If there is a user tag provider, load the current service config
                    if (serviceName) {
                        this.servicesService.getUserService(serviceName, serviceId).subscribe((userConfigRaw) => {
                            console.log(userConfigRaw);
                            let userConfig = JSON.parse(userConfigRaw[0].configuration);
                            if (userConfig) {
                                Object.entries(userConfig).forEach(([key, value]) => {
                                    console.log(' User Config Item: ', key, ' = ', value);
                                    this.form.controls[key].setValue(value);
                                });
                            }
                        });
                    }
                }
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
