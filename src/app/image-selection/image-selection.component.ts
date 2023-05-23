import { Component, OnInit } from '@angular/core';
import { ImagesFilesService } from '../images-files.service';

@Component({
    selector: 'app-image-selection',
    templateUrl: './image-selection.component.html',
    styleUrls: ['./image-selection.component.scss'],
})
export class ImageSelectionComponent implements OnInit {
    images: string[] = [];

    constructor(private _imagesFilesService: ImagesFilesService) {}

    ngOnInit(): void {
        this._imagesFilesService.getImagesFiles$.subscribe((blobFiles) => {
            if (blobFiles.length) {
                this.images = [];
                blobFiles.forEach((file) =>
                    this.images.push(URL.createObjectURL(file))
                );
            }
        });
    }
}
