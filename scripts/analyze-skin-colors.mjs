import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const force = process.argv.includes("--force");
const limit = limitArg ? Math.max(1, Number(limitArg.split("=")[1]) || 100) : 5000;

function family(hex) {
  const v = hex.replace("#", "");
  const r = parseInt(v.slice(0,2),16)/255, g = parseInt(v.slice(2,4),16)/255, b = parseInt(v.slice(4,6),16)/255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b), l=(max+min)/2, d=max-min;
  let h=0, s=0;
  if (d) {
    s=d/(1-Math.abs(2*l-1));
    if(max===r) h=60*(((g-b)/d)%6); else if(max===g) h=60*((b-r)/d+2); else h=60*((r-g)/d+4);
    if(h<0) h+=360;
  }
  if(l<.13) return "Black"; if(l>.9&&s<.12) return "White"; if(s<.11) return l>.68?"Silver":"Gray";
  if(h<12||h>=350) return l<.36?"Burgundy":"Red"; if(h<28) return l<.38?"Brown":"Orange";
  if(h<46) return l<.48?"Brown":l>.68?"Tan":"Gold"; if(h<66) return "Yellow"; if(h<92) return "Lime";
  if(h<145) return l<.34?"Emerald":"Green"; if(h<176) return "Teal"; if(h<202) return "Cyan";
  if(h<250) return l<.3?"Navy":"Blue"; if(h<292) return "Purple"; if(h<350) return l<.33?"Purple":"Pink"; return "Red";
}

const hexByte = (v) => Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,"0").toUpperCase();
const dist = (a,b) => Math.hypot(a.r-b.r,a.g-b.g,a.b-b.b);

async function analyze(imageUrl) {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`image ${response.status}`);
  const input = Buffer.from(await response.arrayBuffer());
  const { data, info } = await sharp(input).ensureAlpha().resize({width:112,height:112,fit:"inside",withoutEnlargement:true}).raw().toBuffer({resolveWithObject:true});
  const buckets = new Map(); const step=28;
  for(let i=0;i<data.length;i+=info.channels){
    const r=data[i],g=data[i+1],b=data[i+2],a=data[i+3]??255; if(a<72) continue;
    const max=Math.max(r,g,b),min=Math.min(r,g,b),brightness=(r+g+b)/3; if(brightness>246&&max-min<8) continue;
    const key=`${Math.round(r/step)},${Math.round(g/step)},${Math.round(b/step)}`, w=(a/255)*(brightness<14?.55:1);
    const x=buckets.get(key)??{r:0,g:0,b:0,w:0}; x.r+=r*w;x.g+=g*w;x.b+=b*w;x.w+=w;buckets.set(key,x);
  }
  const ranked=[...buckets.values()].filter(x=>x.w>0).map(x=>({r:x.r/x.w,g:x.g/x.w,b:x.b/x.w,w:x.w})).sort((a,b)=>b.w-a.w);
  const picked=[]; for(const x of ranked){if(picked.every(y=>dist(x,y)>=46)) picked.push(x); if(picked.length===5) break;}
  for(const x of ranked){if(picked.length===5) break;if(!picked.includes(x)) picked.push(x);}
  const total=picked.reduce((s,x)=>s+x.w,0)||1;
  const raw=picked.map(x=>Math.max(1,Math.round(x.w/total*100)));
  const rawTotal=raw.reduce((a,b)=>a+b,0)||1;
  const normalized=raw.map((v,i)=>i===raw.length-1?Math.max(1,100-Math.round(raw.slice(0,-1).reduce((a,b)=>a+b,0)*100/rawTotal)):Math.max(1,Math.round(v*100/rawTotal)));
  return picked.map((x,i)=>{const hex=`#${hexByte(x.r)}${hexByte(x.g)}${hexByte(x.b)}`;return {hex,percentage:normalized[i],color_name:family(hex),is_primary:i===0,source:"auto",sort_order:i};});
}

let query=supabase.from("skins").select("id,name,image_url").not("image_url","is",null).limit(limit);
const { data: skins, error }=await query; if(error) throw error;
let existing=new Set();
if(!force && skins?.length){const {data:rows}=await supabase.from("skin_colors").select("skin_id").eq("source","auto").in("skin_id",skins.map(s=>s.id));existing=new Set((rows??[]).map(r=>r.skin_id));}
const pending=(skins??[]).filter(s=>force||!existing.has(s.id));
console.log(`Color analysis: ${pending.length} skins (${existing.size} already analyzed, force=${force})`);

let done=0, failed=0; const concurrency=4;
for(let i=0;i<pending.length;i+=concurrency){
  await Promise.all(pending.slice(i,i+concurrency).map(async(skin)=>{
    try{
      const colors=await analyze(skin.image_url);
      if(force) await supabase.from("skin_colors").delete().eq("skin_id",skin.id).eq("source","auto");
      if(colors.length){const {error:e}=await supabase.from("skin_colors").upsert(colors.map(c=>({...c,skin_id:skin.id})),{onConflict:"skin_id,source,sort_order"});if(e) throw e;}
      done++;
    }catch(e){failed++;console.warn(`Failed: ${skin.name}: ${e.message}`);}
  }));
  console.log(`Analyzed ${Math.min(i+concurrency,pending.length)}/${pending.length}`);
}
console.log(`Done. ${done} analyzed, ${failed} failed.`);
