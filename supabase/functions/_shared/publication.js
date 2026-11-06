const types = { 'Διαμέρισμα':'diamerisma', 'Μονοκατοικία':'monokatoikia', 'Μεζονέτα':'mezoneta', 'Οικόπεδο':'oikopedo', 'Επαγγελματικός χώρος':'epaggelmatikos' };
function string(value, max = 500, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error('Συμπληρώστε σωστά τα δημόσια στοιχεία του ακινήτου.');
  return value.trim();
}
function number(value, max = 1e12) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0 || n > max) throw new Error('Μη έγκυρη αριθμητική τιμή.');
  return n;
}
function route(value, lang) {
  const path = string(value, 250, true);
  if (!/^\/(?:[\p{L}\p{N}_-]+\/)+$/u.test(path) || (lang === 'en' ? !path.startsWith('/en/') : path.startsWith('/en/'))) throw new Error('Μη έγκυρος σύνδεσμος αγγελίας.');
  return path;
}
function bilingual(value) {
  return {el:string(value?.el ?? '',500),en:string(value?.en ?? '',500)};
}
export function publicPayload(data, photos) {
  if (data.publication !== 'Εγκεκριμένο') throw new Error('Πρώτα εγκρίνετε το ακίνητο.');
  if (!['Διαθέσιμο','Υπό διαπραγμάτευση','Πουλήθηκε','Ενοικιάστηκε'].includes(data.status)) throw new Error('Το ανενεργό ακίνητο πρέπει να αποσυρθεί.');
  let source;
  try { source=JSON.parse(data.website_json); } catch { throw new Error('Συμπληρώστε την καρτέλα δημοσίευσης.'); }
  const locales={};
  for (const lang of ['el','en']) {
    const l=source.locales?.[lang];
    locales[lang]={
      title:string(l?.title,500,true),cardTitle:string(l?.cardTitle || l?.title,500,true),
      address:string(l?.address ?? '',500),cardAddress:string(l?.cardAddress ?? l?.address ?? '',500),
      description:string(l?.description,20000,true),location:string(l?.location ?? '',500),
      mapNote:string(l?.mapNote ?? '',1000),path:route(l?.path,lang),
      features:(Array.isArray(l?.features)?l.features:[]).slice(0,60).map(f=>string(f,500)),
    };
  }
  if (!Array.isArray(photos) || !photos.length || photos.length>40) throw new Error('Επιλέξτε από 1 έως 40 φωτογραφίες.');
  const additionalFacts=(Array.isArray(source.additionalFacts)?source.additionalFacts:[]).slice(0,30).map(f=>({
    key:string(f.key,80,true),icon:string(f.icon ?? '',20),label:bilingual(f.label),
    format:['text','number','sqm','metres','levels'].includes(f.format)?f.format:'text',
    value:typeof f.value==='number'?number(f.value):bilingual(f.value),
  }));
  let mapUrl='';
  if (source.mapUrl) {
    const u=new URL(source.mapUrl);
    if (u.protocol!=='https:' || !['www.google.com','maps.google.com'].includes(u.hostname) || !u.pathname.startsWith('/maps')) throw new Error('Ο χάρτης πρέπει να είναι HTTPS Google Maps.');
    mapUrl=u.href;
  }
  const id=string(source.id || data.code,100,true);
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Μη έγκυρος δημόσιος κωδικός.');
  const slug=string(source.slug || id,150,true);
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) throw new Error('Μη έγκυρο slug.');
  return {id,slug,reference:string(source.reference || data.code,100,true),
    transaction:data.transaction==='Ενοικίαση'?'rent':'buy',type:types[data.type],
    status:data.status==='Πουλήθηκε'?'sold':data.status==='Ενοικιάστηκε'?'rented':'available',
    area:string(source.area || data.area,200,true),price:number(data.price),sqm:number(data.sqm),rooms:number(data.beds),
    bathrooms:number(source.bathrooms,100),wc:number(source.wc,100),additionalFacts,mapUrl,locales,
    photos,cover:photos[0].src,
  };
}
