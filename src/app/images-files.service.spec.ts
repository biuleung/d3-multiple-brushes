import { TestBed } from '@angular/core/testing';

import { ImagesFilesService } from './images-files.service';

describe('ImagesFilesService', () => {
  let service: ImagesFilesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImagesFilesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
