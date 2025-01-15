import { Component, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'app-userservicedialog',
    templateUrl: './userservicedialog.component.html',
    styleUrl: './userservicedialog.component.scss',
    standalone: false,
})
export class UserservicedialogComponent {
    constructor(
        public dialogRef: MatDialogRef<UserservicedialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
    ) {}

    closeClick() {
        this.dialogRef.close();
    }
}
