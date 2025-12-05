import { Directive, Input, ElementRef,OnInit } from '@angular/core';

@Directive({
  selector: '[appHighlight]',
  standalone: true,
})
export class HighlightDirective implements OnInit {
  constructor(private el: ElementRef) {}
  @Input() appHighlight = '';

  ngOnInit() {
    this.el.nativeElement.style.backgroundColor = 'green';
  }

  highlight() {
    this.el.nativeElement.style.backgroundColor = 'yellow';
  }

  input(){
    window.alert("this.appHighlight input is: "+ this.appHighlight);
  }

  clear() {
    this.el.nativeElement.style.backgroundColor = 'transparent';
  }
}
