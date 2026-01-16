import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';

import { GridStackOptions, GridStackWidget } from 'gridstack';

import { GridstackComponent, GridstackItemComponent } from 'gridstack/dist/angular';

import { nodesCB } from 'gridstack/dist/angular';

interface GridItem {
  id: string;

  x: number;

  y: number;

  w: number;

  h: number;

  content: string;
}

@Component({
  selector: 'app-grid',

  templateUrl: './portal-gridstack.html',

  styleUrls: ['./portal-gridstack.scss'],

  imports: [
    // SKIP if doing module import instead (next)

    GridstackComponent,

    GridstackItemComponent,
  ],
})
export class PortalGridstack {
  public gridOptions: GridStackOptions = { margin: 5 };

  public items: GridStackWidget[] = [
    { x: 0, y: 0, minW: 2, id: '1' }, // must have unique id used for trackBy

    { x: 1, y: 0, id: '2' },

    { x: 0, y: 1, id: '3' },
  ];

  // called whenever items change size/position/etc..

  public onChange(data: nodesCB) {
    console.log('change ', data.nodes.length > 1 ? data.nodes : data.nodes[0]);
  }

  // ngFor unique node id to have correct match between our items used and GS

  public identify(index: number, w: GridStackWidget) {
    return w.id; // or use index if no id is set and you only modify at the end...
  }
}
