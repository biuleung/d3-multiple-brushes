import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, take } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ImagesFilesService {
    private imagesFiles$: Subject<Blob[]> = new Subject<Blob[]>();
    getImagesFiles$ = this.imagesFiles$.asObservable();

    private imageFileBrushPairing$: BehaviorSubject<Map<string, string>> =
        new BehaviorSubject<Map<string, string>>(new Map());
    getImageFileBrushPairing$ = this.imageFileBrushPairing$.asObservable();

    constructor() {}
    passImagesFiles(blobsFiles: Blob[]) {
        this.imagesFiles$.next(blobsFiles);
    }

    setImageFileBrushPairing(fileName: string, brushName: string) {
        const newValue = this.imageFileBrushPairing$.value.set(
            fileName,
            brushName
        );
        this.imageFileBrushPairing$.next(newValue);
    }

    clearImageFileBrushPairing() {
        this.imageFileBrushPairing$.next(new Map());
    }
}
