import{e as oe,f as ne,g as ie,h as re,j as ae}from"./chunk-DI4F4JTR.js";import{g as he,i as be}from"./chunk-EGMK4FA3.js";import{W as ge,X as pe,ba as ue}from"./chunk-ZTBOFOW6.js";import{a as le,e as se,j as ce,p as de}from"./chunk-63B7TIGS.js";import{j as te,k as O}from"./chunk-32AHRJCX.js";import{$a as u,Ab as J,Ba as b,Bb as X,Db as Y,La as p,Mb as T,N as I,O as N,Oa as j,Pa as Q,Pb as Z,T as f,Ub as V,Va as _,Vb as ee,Wa as x,Xa as y,Y as m,Ya as h,Z as w,Za as r,_a as i,fa as A,fb as R,gb as C,ib as d,jb as k,ka as D,mb as L,nb as H,ob as M,pb as S,rb as U,sb as W,tb as q,ua as B,ub as v,vb as s,wa as c,wb as G,yb as $,zb as K}from"./chunk-4Y5BAB2N.js";var P=class o{collapsed=!1;toggle=new b;onToggle(){this.toggle.emit()}static \u0275fac=function(e){return new(e||o)};static \u0275cmp=p({type:o,selectors:[["app-sidebar"]],inputs:{collapsed:"collapsed"},outputs:{toggle:"toggle"},decls:29,vars:2,consts:[[1,"sidebar-root"],[1,"sidebar-header"],[1,"sidebar-logo"],[1,"sidebar-logo-icon"],[1,"theme-icon","pi","pi-apple"],[1,"sidebar-logo-text"],[1,"sidebar-nav"],[1,"sidebar-section-title"],["routerLink","/dashboard","routerLinkActive","active",1,"sidebar-item"],[1,"sidebar-item-icon"],[1,"sidebar-item-text"],["routerLink","/products","routerLinkActive","active",1,"sidebar-item"],[1,"sidebar-item","disabled"]],template:function(e,n){e&1&&(r(0,"div",0)(1,"div",1)(2,"div",2)(3,"div",3),u(4,"span",4),i(),r(5,"div",5),s(6,"Ailsa"),i()()(),r(7,"nav",6)(8,"div",7),s(9,"Dashboard"),i(),r(10,"a",8)(11,"span",9),s(12,"\u{1F3E0}"),i(),r(13,"span",10),s(14,"Default"),i()(),r(15,"div",7),s(16,"E-Commerce"),i(),r(17,"a",11)(18,"span",9),s(19,"\u{1F6D2}"),i(),r(20,"span",10),s(21,"Products"),i()(),r(22,"div",7),s(23,"Other"),i(),r(24,"a",12)(25,"span",9),s(26,"\u{1F4C4}"),i(),r(27,"span",10),s(28,"Sample Page"),i()()()()),e&2&&W("collapsed",n.collapsed)},dependencies:[ie,re],styles:['@charset "UTF-8";[_ngcontent-%COMP%]:root{--color-primary: #4f46e5;--color-primary-soft: #eef2ff;--color-on-primary: #ffffff;--color-text-primary: #111827;--color-text-secondary: #374151;--color-text-subtle: #9ca3af;--color-bg-page: #f3f4f6;--color-bg-surface: #ffffff;--color-bg-sidebar: #ffffff;--color-bg-header: #ffffff;--color-bg-input: #f9fafb;--color-bg-hover: #f3f4ff;--color-border-subtle: #e5e7eb;--color-danger: #ef4444;--color-success: #22c55e;--color-warning: #f59e0b;--radius-sm: 4px;--radius-md: 8px;--radius-lg: 12px;--radius-xl: 18px;--radius-full: 999px;--space-xs: 4px;--space-sm: 8px;--space-md: 12px;--space-lg: 16px;--space-xl: 24px;--space-2xl: 32px;--shadow-sm: 0 1px 2px rgba(15, 23, 42, .05);--shadow-md: 0 10px 25px rgba(15, 23, 42, .08)}.my-app-dark[_ngcontent-%COMP%]{--color-bg-page: #020617;--color-bg-surface: #020617;--color-bg-sidebar: #020617;--color-bg-header: #020617;--color-bg-input: #020617;--color-text-primary: #e5e7eb;--color-text-secondary: #d1d5db;--color-text-subtle: #6b7280;--color-border-subtle: #1f2937;--color-bg-hover: #111827}.sidebar-root[_ngcontent-%COMP%]{display:flex;flex-direction:column;height:100%;padding:var(--space-md);box-sizing:border-box}.sidebar-root.collapsed[_ngcontent-%COMP%]{align-items:center;padding-inline:var(--space-sm)}.sidebar-root.collapsed[_ngcontent-%COMP%]   .sidebar-header[_ngcontent-%COMP%]{justify-content:center}.sidebar-root.collapsed[_ngcontent-%COMP%]   .sidebar-logo-text[_ngcontent-%COMP%], .sidebar-root.collapsed[_ngcontent-%COMP%]   .sidebar-section-title[_ngcontent-%COMP%]{display:none}.sidebar-root.collapsed[_ngcontent-%COMP%]   .sidebar-item[_ngcontent-%COMP%]{justify-content:center}.sidebar-root.collapsed[_ngcontent-%COMP%]   .sidebar-item-text[_ngcontent-%COMP%]{display:none}.sidebar-header[_ngcontent-%COMP%]{display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-xl)}.sidebar-logo[_ngcontent-%COMP%]{display:flex;align-items:center;gap:var(--space-sm)}.sidebar-logo-icon[_ngcontent-%COMP%]{width:32px;height:32px;border-radius:var(--radius-full);background:var(--color-primary-soft);display:flex;align-items:center;justify-content:center;font-size:18px}.sidebar-logo-text[_ngcontent-%COMP%]{font-weight:700;font-size:18px}.icon-btn[_ngcontent-%COMP%]{border:none;background:transparent;cursor:pointer;font-size:20px}.sidebar-nav[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:var(--space-xs)}.sidebar-section-title[_ngcontent-%COMP%]{margin-top:var(--space-md);margin-bottom:var(--space-xs);font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--color-text-subtle)}.sidebar-item[_ngcontent-%COMP%]{display:flex;align-items:center;gap:var(--space-sm);padding:8px 10px;border-radius:var(--radius-md);color:var(--color-text-primary);text-decoration:none;font-size:14px}.sidebar-item[_ngcontent-%COMP%]:hover{background:var(--color-bg-hover)}.sidebar-item.active[_ngcontent-%COMP%]{background:var(--color-primary-soft);color:var(--color-primary);font-weight:600}.sidebar-item.disabled[_ngcontent-%COMP%]{opacity:.5;cursor:default;pointer-events:none}']})};var me=`
    .p-toggleswitch {
        display: inline-block;
        width: dt('toggleswitch.width');
        height: dt('toggleswitch.height');
    }

    .p-toggleswitch-input {
        cursor: pointer;
        appearance: none;
        position: absolute;
        top: 0;
        inset-inline-start: 0;
        width: 100%;
        height: 100%;
        padding: 0;
        margin: 0;
        opacity: 0;
        z-index: 1;
        outline: 0 none;
        border-radius: dt('toggleswitch.border.radius');
    }

    .p-toggleswitch-slider {
        cursor: pointer;
        width: 100%;
        height: 100%;
        border-width: dt('toggleswitch.border.width');
        border-style: solid;
        border-color: dt('toggleswitch.border.color');
        background: dt('toggleswitch.background');
        transition:
            background dt('toggleswitch.transition.duration'),
            color dt('toggleswitch.transition.duration'),
            border-color dt('toggleswitch.transition.duration'),
            outline-color dt('toggleswitch.transition.duration'),
            box-shadow dt('toggleswitch.transition.duration');
        border-radius: dt('toggleswitch.border.radius');
        outline-color: transparent;
        box-shadow: dt('toggleswitch.shadow');
    }

    .p-toggleswitch-handle {
        position: absolute;
        top: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        background: dt('toggleswitch.handle.background');
        color: dt('toggleswitch.handle.color');
        width: dt('toggleswitch.handle.size');
        height: dt('toggleswitch.handle.size');
        inset-inline-start: dt('toggleswitch.gap');
        margin-block-start: calc(-1 * calc(dt('toggleswitch.handle.size') / 2));
        border-radius: dt('toggleswitch.handle.border.radius');
        transition:
            background dt('toggleswitch.transition.duration'),
            color dt('toggleswitch.transition.duration'),
            inset-inline-start dt('toggleswitch.slide.duration'),
            box-shadow dt('toggleswitch.slide.duration');
    }

    .p-toggleswitch.p-toggleswitch-checked .p-toggleswitch-slider {
        background: dt('toggleswitch.checked.background');
        border-color: dt('toggleswitch.checked.border.color');
    }

    .p-toggleswitch.p-toggleswitch-checked .p-toggleswitch-handle {
        background: dt('toggleswitch.handle.checked.background');
        color: dt('toggleswitch.handle.checked.color');
        inset-inline-start: calc(dt('toggleswitch.width') - calc(dt('toggleswitch.handle.size') + dt('toggleswitch.gap')));
    }

    .p-toggleswitch:not(.p-disabled):has(.p-toggleswitch-input:hover) .p-toggleswitch-slider {
        background: dt('toggleswitch.hover.background');
        border-color: dt('toggleswitch.hover.border.color');
    }

    .p-toggleswitch:not(.p-disabled):has(.p-toggleswitch-input:hover) .p-toggleswitch-handle {
        background: dt('toggleswitch.handle.hover.background');
        color: dt('toggleswitch.handle.hover.color');
    }

    .p-toggleswitch:not(.p-disabled):has(.p-toggleswitch-input:hover).p-toggleswitch-checked .p-toggleswitch-slider {
        background: dt('toggleswitch.checked.hover.background');
        border-color: dt('toggleswitch.checked.hover.border.color');
    }

    .p-toggleswitch:not(.p-disabled):has(.p-toggleswitch-input:hover).p-toggleswitch-checked .p-toggleswitch-handle {
        background: dt('toggleswitch.handle.checked.hover.background');
        color: dt('toggleswitch.handle.checked.hover.color');
    }

    .p-toggleswitch:not(.p-disabled):has(.p-toggleswitch-input:focus-visible) .p-toggleswitch-slider {
        box-shadow: dt('toggleswitch.focus.ring.shadow');
        outline: dt('toggleswitch.focus.ring.width') dt('toggleswitch.focus.ring.style') dt('toggleswitch.focus.ring.color');
        outline-offset: dt('toggleswitch.focus.ring.offset');
    }

    .p-toggleswitch.p-invalid > .p-toggleswitch-slider {
        border-color: dt('toggleswitch.invalid.border.color');
    }

    .p-toggleswitch.p-disabled {
        opacity: 1;
    }

    .p-toggleswitch.p-disabled .p-toggleswitch-slider {
        background: dt('toggleswitch.disabled.background');
    }

    .p-toggleswitch.p-disabled .p-toggleswitch-handle {
        background: dt('toggleswitch.handle.disabled.background');
    }
`;var ye=["handle"],ve=["input"],_e=o=>({checked:o});function Ce(o,a){o&1&&R(0)}function ke(o,a){if(o&1&&Q(0,Ce,1,0,"ng-container",2),o&2){let e=k();h("ngTemplateOutlet",e.handleTemplate||e._handleTemplate)("ngTemplateOutletContext",Y(2,_e,e.checked()))}}var Me=`
    ${me}

    p-toggleswitch.ng-invalid.ng-dirty > .p-toggleswitch-slider {
        border-color: dt('toggleswitch.invalid.border.color');
    }
`,Se={root:{position:"relative"}},Te={root:({instance:o})=>["p-toggleswitch p-component",{"p-toggleswitch p-component":!0,"p-toggleswitch-checked":o.checked(),"p-disabled":o.$disabled(),"p-invalid":o.invalid()}],input:"p-toggleswitch-input",slider:"p-toggleswitch-slider",handle:"p-toggleswitch-handle"},we=(()=>{class o extends ue{name="toggleswitch";theme=Me;classes=Te;inlineStyles=Se;static \u0275fac=(()=>{let e;return function(t){return(e||(e=D(o)))(t||o)}})();static \u0275prov=N({token:o,factory:o.\u0275fac})}return o})();var Oe={provide:le,useExisting:I(()=>z),multi:!0},z=(()=>{class o extends be{styleClass;tabindex;inputId;readonly;trueValue=!0;falseValue=!1;ariaLabel;size=Z();ariaLabelledBy;autofocus;onChange=new b;input;handleTemplate;_handleTemplate;focused=!1;_componentStyle=f(we);templates;onHostClick(e){this.onClick(e)}ngAfterContentInit(){this.templates.forEach(e=>{switch(e.getType()){case"handle":this._handleTemplate=e.template;break;default:this._handleTemplate=e.template;break}})}onClick(e){!this.$disabled()&&!this.readonly&&(this.writeModelValue(this.checked()?this.falseValue:this.trueValue),this.onModelChange(this.modelValue()),this.onChange.emit({originalEvent:e,checked:this.modelValue()}),this.input.nativeElement.focus())}onFocus(){this.focused=!0}onBlur(){this.focused=!1,this.onModelTouched()}checked(){return this.modelValue()===this.trueValue}writeControlValue(e,n){n(e),this.cd.markForCheck()}static \u0275fac=(()=>{let e;return function(t){return(e||(e=D(o)))(t||o)}})();static \u0275cmp=p({type:o,selectors:[["p-toggleswitch"],["p-toggleSwitch"],["p-toggle-switch"]],contentQueries:function(n,t,l){if(n&1&&(L(l,ye,4),L(l,ge,4)),n&2){let g;M(g=S())&&(t.handleTemplate=g.first),M(g=S())&&(t.templates=g)}},viewQuery:function(n,t){if(n&1&&H(ve,5),n&2){let l;M(l=S())&&(t.input=l.first)}},hostVars:6,hostBindings:function(n,t){n&1&&d("click",function(g){return t.onHostClick(g)}),n&2&&(_("data-pc-name","toggleswitch")("data-pc-section","root"),q(t.sx("root")),v(t.cn(t.cx("root"),t.styleClass)))},inputs:{styleClass:"styleClass",tabindex:[2,"tabindex","tabindex",ee],inputId:"inputId",readonly:[2,"readonly","readonly",V],trueValue:"trueValue",falseValue:"falseValue",ariaLabel:"ariaLabel",size:[1,"size"],ariaLabelledBy:"ariaLabelledBy",autofocus:[2,"autofocus","autofocus",V]},outputs:{onChange:"onChange"},features:[X([Oe,we]),j],decls:5,vars:19,consts:[["input",""],["type","checkbox","role","switch",3,"focus","blur","checked","pAutoFocus"],[4,"ngTemplateOutlet","ngTemplateOutletContext"]],template:function(n,t){if(n&1){let l=C();r(0,"input",1,0),d("focus",function(){return m(l),w(t.onFocus())})("blur",function(){return m(l),w(t.onBlur())}),i(),r(2,"div")(3,"div"),x(4,ke,1,4,"ng-container"),i()()}n&2&&(v(t.cx("input")),h("checked",t.checked())("pAutoFocus",t.autofocus),_("id",t.inputId)("required",t.required()?"":void 0)("disabled",t.$disabled()?"":void 0)("aria-checked",t.checked())("aria-labelledby",t.ariaLabelledBy)("aria-label",t.ariaLabel)("name",t.name())("tabindex",t.tabindex)("data-pc-section","hiddenInput"),c(2),v(t.cx("slider")),_("data-pc-section","slider"),c(),v(t.cx("handle")),c(),y(t.handleTemplate||t._handleTemplate?4:-1))},dependencies:[O,te,he,pe],encapsulation:2,changeDetection:0})}return o})();function Pe(o,a){if(o&1&&(r(0,"div",7),u(1,"img",9),r(2,"span",10),s(3),i()()),o&2){let e=a;c(),h("src",e==null?null:e.avatarUrl,B),c(2),G(e==null?null:e.name)}}function Ee(o,a){if(o&1){let e=C();r(0,"button",1),d("click",function(){m(e);let t=k();return w(t.logout())}),u(1,"span",11),i()}}var E=class o{auth=f(ae);router=f(ne);user=T(()=>this.auth.userSignal());isDark=!1;toggleSidebar=new b;constructor(){this.isDark=document.documentElement.classList.contains("my-app-dark")}onThemeToggle(a){this.isDark=a,a?document.documentElement.classList.add("my-app-dark"):document.documentElement.classList.remove("my-app-dark")}onToggleSidebar(){this.toggleSidebar.emit()}logout(){this.auth.logout(),this.router.navigate(["/auth/login"])}static \u0275fac=function(e){return new(e||o)};static \u0275cmp=p({type:o,selectors:[["app-topbar"]],outputs:{toggleSidebar:"toggleSidebar"},decls:11,vars:3,consts:[[1,"topbar-root"],[1,"icon-btn",3,"click"],[1,"topbar-search"],[1,"topbar-search-icon"],["type","text","placeholder","Ctrl + K"],[1,"topbar-right"],[1,"theme-switch",3,"ngModelChange","onChange","ngModel"],[1,"topbar-user"],[1,"icon-btn"],["alt","avatar",1,"user-avatar",3,"src"],[1,"user-name"],[1,"theme-icon","pi","pi-sign-out"]],template:function(e,n){if(e&1&&(r(0,"div",0)(1,"button",1),d("click",function(){return n.onToggleSidebar()}),s(2,"\u2630"),i(),r(3,"div",2)(4,"span",3),s(5,"\u{1F50D}"),i(),u(6,"input",4),i(),r(7,"div",5)(8,"p-toggleswitch",6),J("ngModelChange",function(l){return K(n.isDark,l)||(n.isDark=l),l}),d("onChange",function(l){return n.onThemeToggle(l.checked)}),i(),x(9,Pe,4,2,"div",7),x(10,Ee,2,0,"button",8),i()()),e&2){let t;c(8),$("ngModel",n.isDark),c(),y((t=n.user())?9:-1,t),c(),y(n.user()?10:-1)}},dependencies:[O,z,de,se,ce],styles:['@charset "UTF-8";[_ngcontent-%COMP%]:root{--color-primary: #4f46e5;--color-primary-soft: #eef2ff;--color-on-primary: #ffffff;--color-text-primary: #111827;--color-text-secondary: #374151;--color-text-subtle: #9ca3af;--color-bg-page: #f3f4f6;--color-bg-surface: #ffffff;--color-bg-sidebar: #ffffff;--color-bg-header: #ffffff;--color-bg-input: #f9fafb;--color-bg-hover: #f3f4ff;--color-border-subtle: #e5e7eb;--color-danger: #ef4444;--color-success: #22c55e;--color-warning: #f59e0b;--radius-sm: 4px;--radius-md: 8px;--radius-lg: 12px;--radius-xl: 18px;--radius-full: 999px;--space-xs: 4px;--space-sm: 8px;--space-md: 12px;--space-lg: 16px;--space-xl: 24px;--space-2xl: 32px;--shadow-sm: 0 1px 2px rgba(15, 23, 42, .05);--shadow-md: 0 10px 25px rgba(15, 23, 42, .08)}.my-app-dark[_ngcontent-%COMP%]{--color-bg-page: #020617;--color-bg-surface: #020617;--color-bg-sidebar: #020617;--color-bg-header: #020617;--color-bg-input: #020617;--color-text-primary: #e5e7eb;--color-text-secondary: #d1d5db;--color-text-subtle: #6b7280;--color-border-subtle: #1f2937;--color-bg-hover: #111827}.topbar-root[_ngcontent-%COMP%]{display:flex;align-items:center;gap:var(--space-md);width:100%;height:100%}.topbar-search[_ngcontent-%COMP%]{max-width:500px;display:flex;align-items:center;gap:var(--space-xs);padding:6px 10px;border-radius:var(--radius-lg);border:1px solid var(--color-border-subtle);background:var(--color-bg-input)}.topbar-search[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]{border:none;outline:none;background:transparent;font-size:14px;width:170px}.topbar-right[_ngcontent-%COMP%]{display:flex;align-items:center;gap:var(--space-md);margin-left:auto}.user-avatar[_ngcontent-%COMP%]{width:32px;height:32px;border-radius:var(--radius-full)}.topbar-user[_ngcontent-%COMP%]{display:flex;align-items:center;gap:var(--space-xs)}.btn-link[_ngcontent-%COMP%]{border:none;background:none;color:var(--color-primary);font-size:14px;cursor:pointer}']})};var xe=class o{collapsed=A(!1);sidebarWidth=T(()=>this.collapsed()?"72px":"240px");toggleSidebar(){this.collapsed.update(a=>!a)}static \u0275fac=function(e){return new(e||o)};static \u0275cmp=p({type:o,selectors:[["app-layout-shell"]],decls:8,vars:3,consts:[[1,"layout-root"],[1,"layout-sidebar"],[3,"toggle","collapsed"],[1,"layout-main"],[1,"layout-topbar"],[3,"toggleSidebar"],[1,"layout-content"]],template:function(e,n){e&1&&(r(0,"div",0)(1,"aside",1)(2,"app-sidebar",2),d("toggle",function(){return n.toggleSidebar()}),i()(),r(3,"div",3)(4,"header",4)(5,"app-topbar",5),d("toggleSidebar",function(){return n.toggleSidebar()}),i()(),r(6,"main",6),u(7,"router-outlet"),i()()()),e&2&&(c(),U("width",n.sidebarWidth()),c(),h("collapsed",n.collapsed()))},dependencies:[oe,P,E],styles:['@charset "UTF-8";[_ngcontent-%COMP%]:root{--color-primary: #4f46e5;--color-primary-soft: #eef2ff;--color-on-primary: #ffffff;--color-text-primary: #111827;--color-text-secondary: #374151;--color-text-subtle: #9ca3af;--color-bg-page: #f3f4f6;--color-bg-surface: #ffffff;--color-bg-sidebar: #ffffff;--color-bg-header: #ffffff;--color-bg-input: #f9fafb;--color-bg-hover: #f3f4ff;--color-border-subtle: #e5e7eb;--color-danger: #ef4444;--color-success: #22c55e;--color-warning: #f59e0b;--radius-sm: 4px;--radius-md: 8px;--radius-lg: 12px;--radius-xl: 18px;--radius-full: 999px;--space-xs: 4px;--space-sm: 8px;--space-md: 12px;--space-lg: 16px;--space-xl: 24px;--space-2xl: 32px;--shadow-sm: 0 1px 2px rgba(15, 23, 42, .05);--shadow-md: 0 10px 25px rgba(15, 23, 42, .08)}.my-app-dark[_ngcontent-%COMP%]{--color-bg-page: #020617;--color-bg-surface: #020617;--color-bg-sidebar: #020617;--color-bg-header: #020617;--color-bg-input: #020617;--color-text-primary: #e5e7eb;--color-text-secondary: #d1d5db;--color-text-subtle: #6b7280;--color-border-subtle: #1f2937;--color-bg-hover: #111827}.layout-root[_ngcontent-%COMP%]{display:flex;height:100vh;width:100vw;background:var(--color-bg-page);color:var(--color-text-primary);overflow:hidden}.layout-sidebar[_ngcontent-%COMP%]{flex-shrink:0;width:240px;transition:width .2s ease;background:var(--color-bg-sidebar);border-right:1px solid var(--color-border-subtle);overflow:hidden}.layout-main[_ngcontent-%COMP%]{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;height:100vh}.layout-topbar[_ngcontent-%COMP%]{height:64px;width:100%;border-bottom:1px solid var(--color-border-subtle);background:var(--color-bg-header);padding:5px var(--space-lg);box-sizing:border-box;z-index:10}.layout-content[_ngcontent-%COMP%]{flex:1 1 auto;overflow:auto;padding:var(--space-lg);background:var(--color-bg-page);box-sizing:border-box}']})};export{xe as LayoutShell};
