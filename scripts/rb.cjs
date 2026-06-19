// replace-btn.cjs — v2: 精确匹配 <button>..</button> 对
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src', 'components');
const DRY = (process.argv || []).includes('--dry');
const VMAP = {'btn-primary':'primary','btn-secondary':'secondary','btn-danger':'danger','btn-ghost':'ghost','btn-warning':'warning','btn-success':'success'};

function* walk(dir){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const f=path.join(dir,e.name);
    if(e.isDirectory()&&e.name!=='__tests__'&&e.name!=='node_modules')yield*walk(f);
    else if(e.isFile()&&e.name.endsWith('.tsx'))yield f;
  }
}
function* allFiles(){
  for(const e of fs.readdirSync(SRC,{withFileTypes:true})){
    if(e.isDirectory()&&e.name!=='__tests__')yield*walk(path.join(SRC,e.name));
    else if(e.isFile()&&e.name.endsWith('.tsx'))yield path.join(SRC,e.name);
  }
}

function process(fp){
  let c=fs.readFileSync(fp,'utf8');
  const orig=c;
  if(fp.includes(path.join('ui','Button','Button')))return 0;
  if(!/\bbtn\b/.test(c))return 0;

  // 找所有 <button ... className="...btn..." 位置
  const btns=[];
  const re=/<button\b([\s\S]*?\bclassName="([^"]*\bbtn\b[^"]*)")/g;
  let m;
  while((m=re.exec(c))!==null){
    btns.push({start:m.index,end:m.index+m[0].length,match:m[0],cls:m[2]});
  }
  if(!btns.length)return 0;

  // 对每个 btn 找 > 和对应的 </button>
  const edits=[];
  for(const b of btns){
    let gt=c.indexOf('>',b.end);
    if(gt===-1)continue;
    let depth=1,pos=gt+1,close=-1;
    while(pos<c.length){
      const no=c.indexOf('<',pos);
      if(no===-1)break;
      const after=c.slice(no,no+50);
      if(after.startsWith('</button>')){
        depth--;if(depth===0){close=no;break;}
        pos=no+9;
      }else if(after.match(/^<\w[^>]*\/\s*>/)){
        pos=no+after.match(/^<\w[^>]*\/\s*>/)[0].length;
      }else if(after.startsWith('</')){
        pos=no+1;
      }else if(after.startsWith('<button')){
        depth++;pos=no+1;
      }else{pos=no+1;}
    }
    if(close===-1){console.warn('  WARN: no </button> at pos '+b.start);continue;}
    edits.push({os:b.start,oe:gt+1,cs:close,ce:close+9,cls:b.cls});
  }
  if(!edits.length)return 0;

  // 从后往前编辑
  for(const e of edits.reverse()){
    const cls=e.cls.split(/\s+/).filter(Boolean);
    let v='primary',s='md';const ex=[];
    for(const x of cls){
      if(x==='btn')continue;
      if(VMAP[x]){v=VMAP[x];continue;}
      if(x==='btn-sm'){s='sm';continue;}
      if(x==='btn-lg'){s='lg';continue;}
      if(x.startsWith('disabled:')||x==='opacity-50'||x==='cursor-not-allowed')continue;
      ex.push(x);
    }
    let open=c.slice(e.os,e.oe);
    open=open.replace(/<button\b/,'<Button');
    open=open.replace(/\s*className="[^"]*"\s*/,' ');
    open=open.replace(/\s{2,}/g,' ').trimEnd();
    if(!open.endsWith('>'))open+='>';
    open=open.replace(/\s+>$/,'>');
    const props=[];
    if(v!=='primary')props.push('variant="'+v+'"');
    if(s!=='md')props.push('size="'+s+'"');
    if(ex.length)props.push('className="'+ex.join(' ')+'"');
    if(props.length)open=open.slice(0,-1)+' '+props.join(' ')+'>';
    c=c.slice(0,e.os)+open+c.slice(e.oe,e.cs)+'</Button>'+c.slice(e.ce);
  }

  if(c!==orig){
    // import
    const has=c.includes("import { Button }")||c.includes("import {Button}")||c.includes("/Button/Button");
    if(!has){
      const ims=[...c.matchAll(/^import\s+.*from\s+['"].*['"]\s*;?\s*$/gm)];
      if(ims.length){
        const last=ims[ims.length-1];
        let rp=path.relative(path.dirname(fp),path.join(SRC,'ui','Button','Button')).replace(/\\/g,'/').replace(/\.tsx?$/,'');
        if(!rp.startsWith('.'))rp='./'+rp;
        c=c.slice(0,last.index+last[0].length)+'\nimport { Button } from \''+rp+'\''+c.slice(last.index+last[0].length);
      }
    }
    if(!DRY)fs.writeFileSync(fp,c,'utf8');
    return edits.length;
  }
  return 0;
}

let tf=0,tb=0;
for(const f of allFiles()){
  try{
    const n=process(f);
    if(n>0){tf++;tb+=n;console.log('  OK '+path.relative(ROOT,f)+' ('+n+')');}
  }catch(e){console.error('  ERR '+path.relative(ROOT,f)+': '+e.message);}
}
console.log('\n=== '+tf+' files, '+tb+' buttons ===');
if(DRY)console.log('(dry run)');