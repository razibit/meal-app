import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
type OcrRow = { name: string; breakfast: boolean; lunch: boolean; dinner: boolean; confidence?: number; notes?: string };
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
const score = (a: string, b: string) => { const x=normalize(a), y=normalize(b); if(!x||!y)return 0;if(x===y)return 1;if(x.includes(y)||y.includes(x))return .86;const xs=new Set(x.split(' ')),ys=new Set(y.split(' '));return [...xs].filter(v=>ys.has(v)).length/Math.max(xs.size,ys.size); };
const parseRows = (text: string): OcrRow[] => { const value=text.trim(); const json=value.startsWith('[')?value:value.slice(value.indexOf('['),value.lastIndexOf(']')+1); const parsed=JSON.parse(json); if(!Array.isArray(parsed)) throw new Error('OCR output was not an array'); return parsed; };
const decode = (base64: string) => Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  let importId: string | null = null;
  try {
    const key=Deno.env.get('GEMINI_API_KEY'), url=Deno.env.get('SUPABASE_URL'), serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!key||!url||!serviceKey) throw new Error('Missing server configuration');
    const auth=request.headers.get('Authorization')||'';
    const db=createClient(url,serviceKey,{global:{headers:{Authorization:auth}}});
    const {data:userData,error:userError}=await db.auth.getUser(auth.replace('Bearer ',''));
    if(userError||!userData.user) throw new Error('Unauthorized');
    const {data:admin}=await db.from('members').select('id,role,active').eq('id',userData.user.id).single();
    if(!admin||admin.role!=='admin'||admin.active===false) throw new Error('Only admins can process OCR');
    const body=await request.json(); const mealDate=body.meal_date, image=body.image_base64, mime=body.mime_type||'image/jpeg', fileName=body.file_name||'whiteboard.jpg';
    if(!/^\d{4}-\d{2}-\d{2}$/.test(mealDate||'')||!image) throw new Error('Valid meal_date and image_base64 are required');
    if(!['image/jpeg','image/png','image/webp'].includes(mime)) throw new Error('Unsupported image type');
    const {data:created,error:createError}=await db.from('ocr_imports').insert({meal_date:mealDate,file_name:fileName,mime_type:mime,status:'processing',validation_status:'pending',created_by:admin.id}).select('id').single();
    if(createError) throw createError; importId=created.id;
    const {data:members,error:memberError}=await db.from('members').select('id,name').eq('active',true).order('name'); if(memberError)throw memberError;
    const prompt=['Read this dormitory whiteboard with one resident per row and Breakfast, Lunch, Dinner columns.','Return only a JSON array.','Each row: {"name":"Name","breakfast":boolean,"lunch":boolean,"dinner":boolean,"confidence":0.0-1.0,"notes":"optional"}.','Include every visible resident row. Use false for an empty cell.'].join('\n');
    const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt},{inline_data:{mime_type:mime,data:image}}]}],generationConfig:{temperature:0,responseMimeType:'application/json'}})});
    if(!response.ok) throw new Error(`Gemini OCR failed with ${response.status}`);
    const raw=await response.json(); const text=raw.candidates?.[0]?.content?.parts?.[0]?.text||'[]'; const parsed=parseRows(text);
    const names=new Map<string,number>(); parsed.forEach(row=>names.set(normalize(row.name),1+(names.get(normalize(row.name))||0)));
    const rows=parsed.map((row) => { const ranked=(members||[]).map(member=>({member,score:score(row.name,member.name)})).sort((a,b)=>b.score-a.score); const best=ranked[0]; const ambiguous=best&&ranked[1]&&best.score-ranked[1].score<.1; const matched=best&&best.score>=.72&&!ambiguous?best.member:null; const confidence=row.confidence??best?.score??0; return {detected_name:String(row.name||''),matched_member_id:matched?.id||null,breakfast:row.breakfast===true,lunch:row.lunch===true,dinner:row.dinner===true,confidence,needs_review:!matched||ambiguous||confidence<.85,notes:row.notes||null}; });
    const detected=new Set(rows.map(row=>row.matched_member_id).filter(Boolean));
    const errors:string[]=[]; const warnings:string[]=[];
    if(!rows.length) errors.push('OCR returned no resident rows');
    for(const [name,count] of names) if(name&&count>1) errors.push(`Duplicate detected name: ${name}`);
    rows.forEach((row,index)=>{if(!row.detected_name.trim())errors.push(`Row ${index+1} has no name`);if(!row.matched_member_id)errors.push(`Unmatched or ambiguous name: ${row.detected_name}`);if((row.confidence||0)<.7)errors.push(`Low confidence row: ${row.detected_name}`);});
    const missing=(members||[]).filter(member=>!detected.has(member.id)).map(member=>member.name); if(missing.length) warnings.push(`Active members not detected: ${missing.join(', ')}`);
    const totals={breakfast:rows.filter(row=>row.breakfast).length,lunch:rows.filter(row=>row.lunch).length,dinner:rows.filter(row=>row.dinner).length};
    if(totals.breakfast+totals.lunch+totals.dinner===0) errors.push('No meal ticks were detected');
    const extension=mime==='image/png'?'png':mime==='image/webp'?'webp':'jpg'; const path=`${mealDate.slice(0,4)}/${mealDate.slice(5,7)}/${mealDate}/${importId}.${extension}`;
    const {error:uploadError}=await db.storage.from('whiteboard-images').upload(path,decode(image),{contentType:mime,upsert:false}); if(uploadError)throw uploadError;
    let storedRows=rows;
    if(rows.length){const {data,error:rowError}=await db.from('ocr_import_rows').insert(rows.map(row=>({...row,import_id:importId}))).select();if(rowError)throw rowError;storedRows=data||rows;}
    const valid=errors.length===0;
    const report={valid,errors,warnings,totals,row_count:rows.length,active_member_count:(members||[]).length};
    const {error:updateError}=await db.from('ocr_imports').update({status:valid?'ready':'validation_failed',validation_status:valid?'valid':'invalid',validation_report:report,breakfast_total:totals.breakfast,lunch_total:totals.lunch,dinner_total:totals.dinner,storage_path:path,raw_output:raw,model_metadata:{model:'gemini-1.5-flash'},processed_at:new Date().toISOString()}).eq('id',importId); if(updateError)throw updateError;
    return new Response(JSON.stringify({import_id:importId,status:valid?'ready':'validation_failed',validation_report:report,rows:storedRows}),{headers:{...cors,'Content-Type':'application/json'}});
  } catch(error) {
    if(importId){try{const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;await createClient(url,key).from('ocr_imports').update({status:'failed',validation_status:'invalid',validation_report:{valid:false,errors:[error instanceof Error?error.message:'OCR failed']},processed_at:new Date().toISOString()}).eq('id',importId);}catch{/* preserve original error */}}
    return new Response(JSON.stringify({error:error instanceof Error?error.message:'OCR failed'}),{status:400,headers:{...cors,'Content-Type':'application/json'}});
  }
});
