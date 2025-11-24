import { Component, OnInit } from '@angular/core';
import { TreeNode } from 'primeng/api';
import { TreeTableModule } from 'primeng/treetable';
import { CardModule } from 'primeng/card';
import { CommonModule } from '@angular/common';

interface Column {
  field: string;
  header: string;
}

@Component({
  selector: 'app-samples',
  standalone: true,
  imports: [CommonModule, TreeTableModule, CardModule],
  templateUrl: './samples.html',
  styleUrl: './samples.scss',
})
export class Samples {
  files!: TreeNode[];
  cols!: Column[];

  ngOnInit() {
    this.files = [];
    for (let i = 0; i < 50; i++) {
      let node = {
        data: {
          name: 'Item ' + i,
          size: Math.floor(Math.random() * 1000) + 1 + 'kb',
          type: 'Type ' + i,
        },
        children: [
          {
            data: {
              name: 'Item ' + i + ' - 0',
              size: Math.floor(Math.random() * 1000) + 1 + 'kb',
              type: 'Type ' + i,
            },
          },
        ],
      };

      this.files.push(node);
    }

    this.cols = [
      { field: 'name', header: 'Name' },
      { field: 'size', header: 'Size' },
      { field: 'type', header: 'Type' },
    ];
  }
}
