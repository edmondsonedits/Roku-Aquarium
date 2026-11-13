import test from 'node:test';
import assert from 'node:assert/strict';
import {copyText} from '../app/components/useAquarium';

test('copy works on HTTP LAN pages without navigator.clipboard and restores focus',async()=>{
 let copied='',removed=false,focused=false;
 const field={value:'',style:{},setAttribute(){},select(){copied=this.value;},remove(){removed=true;}};
 const oldDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
 const oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{}});
 Object.defineProperty(globalThis,'document',{configurable:true,value:{activeElement:{focus(){focused=true;}},createElement:()=>field,body:{appendChild(){}},execCommand:()=>true}});
 try{await copyText('http://192.168.1.5/join');assert.equal(copied,'http://192.168.1.5/join');assert.ok(removed);assert.ok(focused);}
 finally {if(oldNavigator)Object.defineProperty(globalThis,'navigator',oldNavigator);if(oldDocument)Object.defineProperty(globalThis,'document',oldDocument);else Reflect.deleteProperty(globalThis,'document');}
});
