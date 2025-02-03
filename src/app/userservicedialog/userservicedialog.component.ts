import { Component, Inject, Output, EventEmitter } from '@angular/core';
import { ServicesService } from '../services/services.service';
import { TemplatesService } from '../services/templates.service';

@Component({
    selector: 'app-userservicedialog',
    templateUrl: './userservicedialog.component.html',
    styleUrl: './userservicedialog.component.scss',
    standalone: false,
})
export class UserservicedialogComponent {
    @Output() clickedOK: EventEmitter<string> = new EventEmitter<string>();

    public serviceName: string;

    constructor(
        //     // public dialogRef: MatDialogRef<UserservicedialogComponent>,
        private servicesService: ServicesService,
        //     private templatesService: TemplatesService,
        //     // @Inject(MAT_DIALOG_DATA) public data: any,
    ) {
        this.serviceName = '';
    }

    show = false;

    open(serviceId: string, serviceName: string) {
        this.servicesService.getAvailableService(serviceId).subscribe((service) => {
            // this.service = service;
            console.log(service);
            this.serviceName = serviceName;
            // Loop over the data in configuration and build the dynamic form
            //     "configuration": "{\"PhoneNumber\":\"\",\"DefaultPostingTarget\":\"\"}", "isEnabled": true
            // TODO
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
