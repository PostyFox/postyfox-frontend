import { Component, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ServicesService } from '../services/services.service';
import { TemplatesService } from '../services/templates.service';

@Component({
    selector: 'app-userservicedialog',
    templateUrl: './userservicedialog.component.html',
    styleUrl: './userservicedialog.component.scss',
    standalone: false,
})
export class UserservicedialogComponent {
    constructor(
        public dialogRef: MatDialogRef<UserservicedialogComponent>,
        private servicesService: ServicesService,
        private templatesService: TemplatesService,
        @Inject(MAT_DIALOG_DATA) public data: any,
    ) {}

    ngOnInit(): void {
        console.log(this.data);
        // Call out to the userService and get the configured detail if id is passed
        // Otherwise call out and just get the template

        //this.templatesService
    }

    closeClick() {
        this.dialogRef.close();
    }
}
