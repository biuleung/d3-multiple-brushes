// @ts-nocheck

import {
    Component,
    ElementRef,
    HostListener,
    Input,
    ViewChild,
} from '@angular/core';
import * as d3 from 'd3';
import { v4 as uuidv4 } from 'uuid';
import { ImagesFilesService } from '../images-files.service';

export type ImageInfo = {
    name: string;
    data: string;
    width?: number;
    height?: number;
};

@Component({
    selector: 'app-image-selector',
    templateUrl: './image-selector.component.html',
    styleUrls: ['./image-selector.component.scss'],
})
export class ImageSelectorComponent implements AfterViewInit, OnChanges {
    @ViewChild('ocrImageEditor') imageRef: ElementRef = {} as ElementRef;
    @Input() imageInfo: ImageInfo = { name: '', data: '' };
    brushesCoordinates: Map<string, []> = new Map();

    listening = false;

    brushesCoordinates: Map<string, []> = new Map();
    previousBrushesCoordinates = new Map(this.brushesCoordinates);
    isFristUploadImage = true;
    IsBrushInitializing = true;

    brushes = [];
    resultBrushes = [];

    constructor(private _imagesFilesService: ImagesFilesService) {}

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.setupBrush();
        });
    }

    ngOnChanges(simpleChange: SimpleChange) {
        if (simpleChange.imageInfo && simpleChange.imageInfo.currentValue) {
            this.imageInfo = simpleChange.imageInfo.currentValue;
            const image = new Image();
            image.onload = () => {
                this.imageInfo.width = image.naturalWidth;
                this.imageInfo.height = image.naturalHeight;
                if (!simpleChange.imageInfo.firstChange) {
                }
            };
            image.src = this.imageInfo.data;
        }
    }

    setupBrush() {
        setTimeout(() => {
            const componentThis = this;

            const zoom = d3.zoom().on('zoom', handleZoom);

            function handleZoom(e) {
                imageBrushesGroup.attr('transform', e.transform);
            }

            componentThis.brushes = [];

            const ocrImageEditor = d3.select('#ocr-image-editor');
            ocrImageEditor.selectAll('*').remove();
            let svg;
            let imageBrushesGroup;
            let gImage;
            let datumPoint;
            let gBrushes;
            let ratioOfWidthToOriginalImage;
            let ratioOfHeightToOriginalImage;
            let canvas;

            function newSvg() {
                svg = ocrImageEditor
                    .append('svg')
                    .attr('id', 'svg-container')
                    .attr('width', '100%')
                    .attr('height', '100%')
                    .call(zoom);

                svg.append('rect')
                    .attr('id', 'svg-background')
                    .attr('fill', '#fafafa')
                    .attr('width', '100%')
                    .attr('height', '100%');
            }

            function newImageBrushesGroup() {
                imageBrushesGroup = svg
                    .append('g')
                    .attr('id', 'imageBrushesGroup');

                const ratioOfWidthToImageEditor = 0.8;

                const convertedWidthPercentage =
                    ratioOfWidthToImageEditor * 100;

                const convertedHeightPercentage =
                    ((componentThis.imageInfo.height *
                        ((ocrImageEditor.node().getBoundingClientRect().width *
                            ratioOfWidthToImageEditor) /
                            componentThis.imageInfo.width)) /
                        ocrImageEditor.node().getBoundingClientRect().height) *
                    100;

                gImage = imageBrushesGroup
                    .append('image')
                    .attr('id', 'ocr-image')
                    .attr('xlink:href', componentThis.imageInfo.data)
                    .attr('width', `${convertedWidthPercentage.toString()}%`)
                    .attr('height', `${convertedHeightPercentage.toString()}%`)
                    .attr(
                        'x',
                        `${(100 - ratioOfWidthToImageEditor * 100) / 2}%`
                    )
                    .attr('y', `${(100 - convertedHeightPercentage) / 2}%`);

                datumPoint = {
                    x: gImage.node()?.getBBox().x,
                    y: gImage.node()?.getBBox().y,
                };

                ratioOfWidthToOriginalImage =
                    gImage.node()?.getBBox().width /
                    componentThis.imageInfo.width;
                ratioOfHeightToOriginalImage =
                    gImage.node()?.getBBox().height /
                    componentThis.imageInfo.height;

                gBrushes = imageBrushesGroup.append('g').attr('id', 'brushes');
            }

            async function setSelectedImagesBlobFiles() {
                const img = new Image();
                img.src = componentThis.imageInfo.data;
                canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                const base64Files = [];
                let blobFiles: Blob[];

                componentThis._imagesFilesService.clearImageFileBrushPairing();
                for (let [key, value] of componentThis.brushesCoordinates) {
                    canvas.width = value[2];
                    canvas.height = value[3];
                    ctx.drawImage(
                        img, // the image element object that you want to draw onto the canvas
                        value[0], // the leftmost position on the source image
                        value[1], // the topmost position on the source image
                        value[2], // the width of the rectangle to be drawn on the canvas
                        value[3], // height of the rectangle to be drawn on the canvas
                        0, //  the leftmost position on the canvas
                        0, // the topmost position on the canvas
                        value[2], // the width of the rectangle to be drawn
                        value[3] //the width of the rectangle to be drawn
                    );
                    const dataURL = canvas.toDataURL();
                    const fileName = uuidv4();
                    componentThis._imagesFilesService.setImageFileBrushPairing(
                        fileName,
                        key
                    );
                    base64Files.push({ base64Data: dataURL, name: fileName });
                }
                await Promise.all(
                    base64Files.map((item) =>
                        fetch(item.base64Data).then((res) => res.blob())
                    )
                ).then((blobs: Blob[]) => (blobFiles = blobs));

                blobFiles.forEach((blobFile, index) => {
                    blobFile.name = base64Files[index].name;
                });
                componentThis._imagesFilesService.passImagesFiles(blobFiles);
            }

            function newBrush() {
                const brush = d3
                    .brush()
                    .on('start', brushstart)
                    .on('brush', brushed)
                    .on('end', brushend)

                    .extent([
                        [
                            gImage.node()?.getBBox().x,
                            gImage.node()?.getBBox().y,
                        ],
                        [
                            gImage.node()?.getBBox().width +
                                gImage.node()?.getBBox().x,
                            gImage.node()?.getBBox().height +
                                gImage.node()?.getBBox().y,
                        ],
                    ]);
                componentThis.brushes.push({
                    id: componentThis.brushes.length,
                    brush: brush,
                });
            }

            function brushstart() {
                svg.on('.zoom', null);
                d3.selectAll('.brush').classed('selected', false);
                d3.selectAll('.brush').classed('non-selected', true);

                d3.select(this).classed('selected', true);
                d3.select(this).classed('non-selected', false);

                attachRemoveBtn('brushstart');
            }

            function brushed() {
                if (!componentThis.IsBrushInitializing) {
                    this.classList.remove('result');
                }
                attachRemoveBtn('brushed');
            }

            function brushend(event) {
                attachRemoveBtn('brushend');

                const lastBrushID =
                    componentThis.brushes[componentThis.brushes.length - 1].id;
                const lastBrush = d3.select('#brush-' + lastBrushID).node();

                let selection;
                if (lastBrush) {
                    selection = d3.brushSelection(lastBrush);
                }

                if (
                    !!event.selection &&
                    !!event.selection.length &&
                    !!event.selection[0]
                ) {
                    const originalX =
                        (event.selection[0][0] - datumPoint.x) /
                        ratioOfWidthToOriginalImage;
                    const originalY =
                        (event.selection[0][1] - datumPoint.y) /
                        ratioOfHeightToOriginalImage;
                    const width =
                        (event.selection[1][0] - datumPoint.x) /
                            ratioOfWidthToOriginalImage -
                        originalX;
                    const height =
                        (event.selection[1][1] - datumPoint.y) /
                            ratioOfHeightToOriginalImage -
                        originalY;

                    componentThis.brushesCoordinates.set(this.id, [
                        originalX,
                        originalY,
                        width,
                        height,
                    ]);

                    const areBrushesModified =
                        componentThis.checkBrushesModified(
                            componentThis.brushesCoordinates,
                            componentThis.previousBrushesCoordinates
                        );
                    if (areBrushesModified) {
                        componentThis.previousBrushesCoordinates = new Map(
                            componentThis.brushesCoordinates
                        );
                    }
                }

                if (selection && selection[0] !== selection[1]) {
                    newBrush();
                }

                drawBrushes();
                sortBrushes();
                svg.call(zoom);
                setSelectedImagesBlobFiles();
            }

            function sortBrushes() {
                d3.selectAll('.brush').sort(function (a, b) {
                    const aArea =
                        d3.select('#brush-' + a.id).node().children.length &&
                        d3
                            .select('#brush-' + a.id)
                            .node()
                            .children[1].getBBox().width *
                            d3
                                .select('#brush-' + a.id)
                                .node()
                                .children[1].getBBox().height;
                    const bArea =
                        d3.select('#brush-' + b.id).node().children.length &&
                        d3
                            .select('#brush-' + b.id)
                            .node()
                            .children[1].getBBox().width *
                            d3
                                .select('#brush-' + b.id)
                                .node()
                                .children[1].getBBox().height;

                    if (aArea === 0 || bArea === 0) {
                        return 0;
                    }
                    if (aArea < bArea) {
                        return 1;
                    } else {
                        return -1;
                    }
                });
            }

            function drawBrushes() {
                let brushSelection = gBrushes
                    .selectAll('.brush')
                    .data(componentThis.brushes, (d) => {
                        return d.id; // using the d.id property as the key function to identify data elements
                    });
                brushSelection
                    .enter()
                    .insert('g', '.brush') // inserts new 'g' elements before the '.brush' elements
                    .attr('id', (brush) => {
                        return 'brush-' + brush.id; // assigns a unique ID to each new 'g' element based on the brush's ID
                    })
                    .each(function (brushObject) {
                        d3.select(this).classed('brush', true);
                        brushObject.brush(d3.select(this));
                    });

                // https://developer.mozilla.org/en-US/docs/Web/CSS/pointer-events
                brushSelection.each(function (brushObject) {
                    d3.select(this)
                        .selectAll('.overlay') // selects all elements with the class name '.overlay' within the current brush element
                        .style('pointer-events', () => {
                            let brush = brushObject.brush;
                            if (
                                brushObject.id ===
                                    componentThis.brushes.length - 1 &&
                                brush !== undefined
                            ) {
                                return 'all'; // can receive and respond to all pointer events. This means that the element can be clicked, hovered over, dragged, ...
                            } else {
                                return 'none'; // does not respond to any pointer events
                            }
                        });
                });
                brushSelection.exit().remove();
            }

            function attachRemoveBtn(event: string) {
                try {
                    if (
                        d3.select('.selected') &&
                        (d3.select('.selected').node().children[1].getBBox()
                            .width <= 0 ||
                            d3.select('.selected').node().children[1].getBBox()
                                .height <= 0)
                    ) {
                        d3.selectAll('.remove-btn').remove();
                        d3.selectAll('.close-x').remove();
                        return;
                    }

                    if (event === 'brushstart') {
                        d3.selectAll('.non-selected .remove-btn').remove();
                        d3.selectAll('.non-selected .close-x').remove();
                        return;
                    }

                    if (event === 'brushed') {
                        d3.selectAll('.remove-btn').remove();
                        d3.selectAll('.close-x').remove();
                    }

                    d3.select('.selected')
                        .append('image')
                        .attr(
                            'xlink:href',
                            '../../assets/images/text-field-value-clear.svg'
                        )
                        .classed('close-x', true)
                        .attr(
                            'transform',
                            `translate(${
                                d3
                                    .select('.selected')
                                    .node()
                                    .children[1].getBBox().x +
                                d3
                                    .select('.selected')
                                    .node()
                                    .children[1].getBBox().width +
                                4
                            }, ${
                                d3
                                    .select('.selected')
                                    .node()
                                    .children[1].getBBox().y +
                                d3
                                    .select('.selected')
                                    .node()
                                    .children[1].getBBox().height /
                                    2 -
                                6
                            })`
                        )
                        .style('fill', 'transparent')
                        .style('pointer-events', 'visible')
                        .on('click', function () {
                            const selectedBrush = d3.select('.selected');
                            if (!!selectedBrush) {
                                const selectedBrushId = selectedBrush.node().id;
                                componentThis.brushesCoordinates.delete(
                                    selectedBrushId
                                );
                                componentThis.checkIsBrushesEmpty();
                                setSelectedImagesBlobFiles();
                                d3.select('.selected').remove();
                            }
                        });
                } catch (error) {
                    console.log(error);
                }
            }

            function drawResultBrushes() {
                componentThis.IsBrushInitializing = true;
                if (componentThis.resultBrushes?.length) {
                    componentThis.resultBrushes.forEach((item, index) => {
                        const selectedBrush = d3.select('#brush-' + index);
                        const calculatedSelection = [[], []];
                        calculatedSelection[0][0] =
                            item.selection[0][0] * ratioOfWidthToOriginalImage +
                            datumPoint.x;
                        calculatedSelection[0][1] =
                            item.selection[0][1] * ratioOfWidthToOriginalImage +
                            datumPoint.y;

                        calculatedSelection[1][0] =
                            item.selection[1][0] * ratioOfWidthToOriginalImage +
                            calculatedSelection[0][0];

                        calculatedSelection[1][1] =
                            item.selection[1][1] *
                                ratioOfHeightToOriginalImage +
                            calculatedSelection[0][1];

                        if (selectedBrush) {
                            selectedBrush
                                .node()
                                .classList.add('result', `result-${item.id}`);
                            selectedBrush.call(
                                componentThis.brushes[index].brush.move,
                                calculatedSelection
                            );
                        }
                    });
                }
                d3.selectAll('.brush').classed('selected', false);
                d3.selectAll('.brush').classed('non-selected', true);
                d3.selectAll('.remove-btn').remove();
                d3.selectAll('.close-x').remove();
            }

            newSvg();
            newImageBrushesGroup();
            newBrush();
            drawBrushes();
            drawResultBrushes();
            componentThis.IsBrushInitializing = false;

            d3.selectAll('.resize-button').on('click', function () {
                if (this.id === 'zoom-in') {
                    svg.transition().call(zoom.scaleBy, 1.3);
                }
                if (this.id === 'zoom-out') {
                    svg.transition().call(zoom.scaleBy, 0.7);
                }
                if (this.id === 'zoom-init') {
                    svg.transition()
                        .duration(200)
                        .call(
                            zoom.transform,
                            d3.zoomIdentity.translate(0, 0).scale(1)
                        );
                }
            });
        });
    }

    checkBrushesModified(map1: any, map2: any) {
        let testVal;
        if (map1.size !== map2.size) {
            return true;
        }
        for (let [key, val] of map1) {
            testVal = map2.get(key);
            if (
                JSON.stringify(val) !== JSON.stringify(testVal) ||
                (testVal === undefined && !map2.has(key))
            ) {
                return true;
            }
        }
        return false;
    }

    checkIsBrushesEmpty() {}

    @HostListener('document:keydown', ['$event'])
    keyDownFunction(event: KeyboardEvent): void {
        if (event.code === 'Backspace' || event.code === 'Escape') {
            if (d3.select('.selected') !== null) {
                const selectedBrushId = d3.select('.selected').node().id;
                this.brushesCoordinates.delete(selectedBrushId);
                d3.select('.selected').remove();
                this.checkIsBrushesEmpty();
            }
        }
    }

    @HostListener('document:click', ['$event'])
    clickout(event: { target: any }) {
        setTimeout(() => {
            if (!this.listening) {
                return;
            }
            if (this.imageRef.nativeElement.contains(event.target)) {
            } else {
                d3.selectAll('.brush').classed('selected', false);
                d3.selectAll('.brush').classed('non-selected', true);
                d3.selectAll('.remove-btn').remove();
                d3.selectAll('.close-x').remove();

                this.listening = false;
            }
        });
    }
}
