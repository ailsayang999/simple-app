import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { GridStackOptions, GridStackWidget } from 'gridstack';
import { GridstackComponent, GridstackItemComponent, elementCB } from 'gridstack/dist/angular';

// portal-gridstack.ts
import { ViewEncapsulation } from '@angular/core';

import { nodesCB } from 'gridstack/dist/angular';
let ids = 4;
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
  encapsulation: ViewEncapsulation.None, // 加入這一行，讓 CSS 作用於全域
  imports: [
    // SKIP if doing module import instead (next)
    GridstackComponent,
    GridstackItemComponent,
  ],
})
export class PortalGridstack {
  @ViewChild(GridstackComponent) gridComp?: GridstackComponent;

  public gridOptions: GridStackOptions = {
    margin: 5,
    // float: true,
    minRow: 1,
    cellHeight: 70,
    columnOpts: { breakpoints: [{ w: 768, c: 1 }] },
  };

  public items: GridStackWidget[] = [
    { x: 0, y: 0, minW: 2, content: 'Item 1', id: '1' },
    { x: 1, y: 1, content: 'Item 2', id: '2' },
    { x: 2, y: 2, content: 'Item 3', id: '3' },
  ];

  // called whenever items change size/position/etc..
  public onChange(data: nodesCB) {
    // TODO: update our TEMPLATE list to match ?
    // NOTE: no need for dynamic as we can always use grid.save() to get latest layout, or grid.engine.nodes
    console.log('change ', data.nodes.length > 1 ? data.nodes : data.nodes[0]);
  }

  public addNgFor() {
    // new array isn't required as Angular detects changes to content with trackBy:identify()
    // this.items = [...this.items, { x:3, y:0, w:3, content:`item ${ids}`, id:String(ids++) }];
    this.items.push({ w: 2, content: `Item ${ids}`, id: String(ids++) });
  }
  public deleteNgFor() {
    this.items.pop();
  }
  public modifyNgFor() {
    // this will not update the DOM nor trigger gridstackItems.changes for GS to auto-update, so set new option of the gridItem instead
    // this.items[0].w = 3;
    const gridItem = this.gridComp?.gridstackItems?.get(0);
    if (gridItem) gridItem.options = { w: 3 };
  }

  public onResizeStop(data: elementCB) {
    console.log('resizestop ', data.el.gridstackNode);
  }

  // ngFor unique node id to have correct match between our items used and GS

  public identify(index: number, w: GridStackWidget) {
    return w.id; // or use index if no id is set and you only modify at the end...
  }
}
